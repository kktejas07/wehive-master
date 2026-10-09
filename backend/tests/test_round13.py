"""Round 13 — pricing, events, R2 documents, public endpoints, regression."""
import os
import io
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL or not BASE_URL.startswith('http'):
    BASE_URL = 'http://localhost:8000'

ADMIN_EMAIL = 'admin@wehive.co.in'
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')


# ---------- helpers ----------
@pytest.fixture(scope='module')
def admin_token():
    r = requests.post(f'{BASE_URL}/api/admin-auth/login',
                      json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f'admin login failed: {r.status_code} {r.text}'
    tok = r.json().get('access_token')
    assert tok
    return tok


@pytest.fixture(scope='module')
def admin_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture(scope='module')
def user_token():
    email = f'TEST_round13_{uuid.uuid4().hex[:8]}@example.com'
    r = requests.post(f'{BASE_URL}/api/auth/send-otp', json={'identifier': email}, timeout=15)
    assert r.status_code == 200, r.text
    r = requests.post(f'{BASE_URL}/api/auth/verify-otp',
                      json={'identifier': email, 'code': '123456'}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json().get('access_token')


@pytest.fixture(scope='module')
def user_headers(user_token):
    return {'Authorization': f'Bearer {user_token}'}


# ---------- Pricing ----------
class TestPricing:
    def test_admin_get_pricing(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/pricing', headers=admin_headers, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert 'base_fees' in d and isinstance(d['base_fees'], dict)
        assert 'surcharge_inr' in d
        assert 'gst_rate' in d
        assert 'currency' in d
        assert 'defaults' in d and 'base_fees' in d['defaults']

    def test_patch_pricing_persists(self, admin_headers):
        payload = {'base_fees': {'Tourist': 4000}, 'gst_rate': 0.20}
        r = requests.patch(f'{BASE_URL}/api/admin/pricing', json=payload, headers=admin_headers, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['base_fees'].get('Tourist') == 4000
        assert abs(d['gst_rate'] - 0.20) < 1e-9

        # Re-GET to confirm persistence
        r2 = requests.get(f'{BASE_URL}/api/admin/pricing', headers=admin_headers, timeout=10)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2['base_fees'].get('Tourist') == 4000
        assert abs(d2['gst_rate'] - 0.20) < 1e-9

    def test_patch_pricing_invalid_gst(self, admin_headers):
        r = requests.patch(f'{BASE_URL}/api/admin/pricing',
                           json={'gst_rate': 1.5}, headers=admin_headers, timeout=10)
        assert r.status_code == 400, r.text

    def test_public_pricing_no_auth(self):
        r = requests.get(f'{BASE_URL}/api/public/pricing', timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert 'base_fees' in d
        assert 'surcharge_inr' in d
        assert 'gst_rate' in d
        assert 'currency' in d
        # mirrors admin (Tourist=4000 from previous test)
        assert d['base_fees'].get('Tourist') == 4000

    def test_reset_pricing(self, admin_headers):
        # restore default to keep environment clean
        r = requests.patch(f'{BASE_URL}/api/admin/pricing',
                           json={'base_fees': {'Tourist': 3500}, 'gst_rate': 0.18},
                           headers=admin_headers, timeout=10)
        assert r.status_code == 200


# ---------- Events ----------
@pytest.fixture(scope='module')
def created_event(admin_headers):
    payload = {'title': 'TEST_round13_event', 'subtitle': 'subtitle',
               'tag': 'tourist', 'cta_url': 'https://wehive.co.in',
               'is_published': True}
    r = requests.post(f'{BASE_URL}/api/admin/events', json=payload, headers=admin_headers, timeout=10)
    assert r.status_code in (200, 201), r.text
    ev = r.json()
    assert ev.get('id')
    yield ev
    # cleanup
    requests.delete(f'{BASE_URL}/api/admin/events/{ev["id"]}', headers=admin_headers, timeout=10)


class TestEvents:
    def test_event_in_admin_list(self, admin_headers, created_event):
        r = requests.get(f'{BASE_URL}/api/admin/events', headers=admin_headers, timeout=10)
        assert r.status_code == 200
        ids = [e['id'] for e in r.json().get('items', [])]
        assert created_event['id'] in ids

    def test_event_in_public_list_published(self, created_event):
        r = requests.get(f'{BASE_URL}/api/public/events', timeout=10)
        assert r.status_code == 200
        ids = [e['id'] for e in r.json().get('items', [])]
        assert created_event['id'] in ids

    def test_patch_event_unpublish_hides_from_public(self, admin_headers, created_event):
        r = requests.patch(f'{BASE_URL}/api/admin/events/{created_event["id"]}',
                           json={'is_published': False}, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json().get('is_published') is False
        # public list should not show it
        r2 = requests.get(f'{BASE_URL}/api/public/events', timeout=10)
        ids = [e['id'] for e in r2.json().get('items', [])]
        assert created_event['id'] not in ids
        # republish for delete test
        requests.patch(f'{BASE_URL}/api/admin/events/{created_event["id"]}',
                       json={'is_published': True}, headers=admin_headers, timeout=10)

    def test_delete_event(self, admin_headers):
        # Create separate event to delete
        r = requests.post(f'{BASE_URL}/api/admin/events',
                          json={'title': 'TEST_round13_delete', 'is_published': False},
                          headers=admin_headers, timeout=10)
        eid = r.json()['id']
        d = requests.delete(f'{BASE_URL}/api/admin/events/{eid}', headers=admin_headers, timeout=10)
        assert d.status_code == 200
        assert d.json().get('ok') is True


# ---------- Documents (R2) ----------
class TestDocumentsR2:
    def test_upload_and_download_doc(self, user_headers):
        # create application
        app_payload = {'country_id': 'us', 'visa_type': 'Tourist', 'applicants': 1, 'travel_date': '2026-06-01'}
        r = requests.post(f'{BASE_URL}/api/users/me/applications',
                          json=app_payload, headers=user_headers, timeout=15)
        assert r.status_code in (200, 201), r.text
        app_id = r.json().get('id') or r.json().get('_id')
        assert app_id

        # upload document
        # minimal valid PDF
        pdf = b'%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
        files = {'file': ('TEST_passport.pdf', io.BytesIO(pdf), 'application/pdf')}
        r = requests.post(f'{BASE_URL}/api/users/me/applications/{app_id}/documents',
                          headers=user_headers, files=files,
                          data={'doc_type': 'passport'}, timeout=30)
        assert r.status_code in (200, 201), r.text
        doc = r.json()
        # storage should be r2 if configured
        storage = doc.get('storage')
        doc_id = doc.get('id') or doc.get('doc_id')
        assert doc_id, f'no doc id in {doc}'
        print(f'storage={storage}, object_key={doc.get("object_key")}')
        if storage == 'r2':
            assert doc.get('object_key', '').startswith('documents/')

        # download — should 307 redirect to signed URL
        r = requests.get(f'{BASE_URL}/api/users/me/applications/{app_id}/documents/{doc_id}/download',
                         headers=user_headers, timeout=15, allow_redirects=False)
        assert r.status_code in (200, 302, 307), f'{r.status_code} {r.text[:200]}'
        if storage == 'r2':
            assert r.status_code in (302, 307), f'expected redirect for r2, got {r.status_code}'
            loc = r.headers.get('location', '')
            assert 'r2' in loc.lower() or 'cloudflare' in loc.lower() or 'amazonaws' in loc.lower() or loc.startswith('http')

        # delete doc
        r = requests.delete(f'{BASE_URL}/api/users/me/applications/{app_id}/documents/{doc_id}',
                            headers=user_headers, timeout=15)
        assert r.status_code in (200, 204), r.text

        # cleanup app
        requests.delete(f'{BASE_URL}/api/users/me/applications/{app_id}', headers=user_headers, timeout=10)


# ---------- Regression ----------
class TestRegression:
    def test_admin_metrics(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/metrics', headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert 'users' in d and 'applications' in d and 'revenue' in d

    def test_admin_users_list(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/users', headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert 'items' in r.json()

    def test_admin_applications_list(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/applications', headers=admin_headers, timeout=10)
        assert r.status_code == 200

    def test_admin_countries(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/countries', headers=admin_headers, timeout=10)
        assert r.status_code == 200

    def test_admin_integrations(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/integrations', headers=admin_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert 'services' in d

    def test_admin_export_users(self, admin_headers):
        r = requests.get(f'{BASE_URL}/api/admin/export/users.csv', headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert 'text/csv' in r.headers.get('content-type', '')

    def test_public_countries(self):
        r = requests.get(f'{BASE_URL}/api/countries', timeout=10)
        assert r.status_code == 200

    def test_scan_history_user(self, user_headers):
        r = requests.get(f'{BASE_URL}/api/scan/history', headers=user_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert 'items' in d

    def test_scan_delete_nonexistent(self, user_headers):
        fake = str(uuid.uuid4())
        r = requests.delete(f'{BASE_URL}/api/scan/{fake}', headers=user_headers, timeout=10)
        assert r.status_code == 404

    def test_admin_auth_forgot(self):
        r = requests.post(f'{BASE_URL}/api/admin-auth/forgot-password',
                          json={'email': ADMIN_EMAIL}, timeout=10)
        assert r.status_code in (200, 202)
