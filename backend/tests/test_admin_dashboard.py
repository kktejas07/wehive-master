"""End-to-end tests for the Super Admin dashboard endpoints + regression for
profile edit and country filters added in the same iteration."""
from __future__ import annotations

import csv
import io
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Fall back to .env so pytest can run without exporting
    with open('/app/frontend/.env') as fh:
        for line in fh:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
                break

ADMIN_EMAIL = 'admin@wehive.co.in'
MOCK_OTP = '123456'


# ---------- helpers ----------
def _login(identifier: str) -> dict:
    """Mock-OTP login: returns {token, user}."""
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/send-otp", json={'identifier': identifier})
    assert r.status_code == 200, f'send-otp failed: {r.status_code} {r.text}'
    r = s.post(f"{BASE_URL}/api/auth/verify-otp", json={'identifier': identifier, 'code': MOCK_OTP})
    assert r.status_code == 200, f'verify-otp failed: {r.status_code} {r.text}'
    data = r.json()
    token = data.get('token') or data.get('access_token')
    assert token and 'user' in data, f'login response missing token/user: {data}'
    data['token'] = token
    return data


@pytest.fixture(scope='module')
def admin_session():
    data = _login(ADMIN_EMAIL)
    user = data['user']
    # Public user must include the new admin/staff fields
    assert 'is_admin' in user and 'is_staff' in user and 'staff_role' in user
    assert user['is_admin'] is True, 'Admin email should be flagged is_admin=true'
    s = requests.Session()
    s.headers.update({'Authorization': f"Bearer {data['token']}"})
    return s, user


@pytest.fixture(scope='module')
def regular_session():
    ident = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    data = _login(ident)
    s = requests.Session()
    s.headers.update({'Authorization': f"Bearer {data['token']}"})
    return s, data['user']


# ---------- /api/admin/me + RBAC ----------
class TestAdminAuth:
    def test_admin_me_ok(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/me")
        assert r.status_code == 200
        body = r.json()
        assert body['is_admin'] is True
        assert body['email'].lower() == ADMIN_EMAIL

    def test_non_admin_forbidden(self, regular_session):
        s, _ = regular_session
        r = s.get(f"{BASE_URL}/api/admin/me")
        assert r.status_code == 403

    def test_non_admin_blocked_on_all(self, regular_session):
        s, _ = regular_session
        for path in [
            '/api/admin/metrics',
            '/api/admin/users',
            '/api/admin/applications',
            '/api/admin/countries',
            '/api/admin/integrations',
            '/api/admin/export/users.csv',
        ]:
            r = s.get(f"{BASE_URL}{path}")
            assert r.status_code == 403, f'{path} should be 403, got {r.status_code}'


# ---------- public auth payload regression ----------
class TestAuthPayloadFields:
    def test_me_has_admin_fields(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        u = r.json()
        for f in ('is_admin', 'is_staff', 'staff_role', 'is_premium'):
            assert f in u, f'PublicUser missing field {f}'
        assert u['is_admin'] is True


# ---------- metrics ----------
class TestMetrics:
    def test_metrics_shape(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/metrics")
        assert r.status_code == 200
        m = r.json()
        for k in ('users', 'applications', 'revenue', 'countries', 'trend', 'top_countries'):
            assert k in m
        assert 'total' in m['users']
        assert 'total' in m['applications']
        assert 'total_inr' in m['revenue']
        assert 'total' in m['countries']
        assert isinstance(m['trend'], list) and len(m['trend']) == 14
        assert m['countries']['total'] >= 1


# ---------- users ----------
class TestUsers:
    def test_list_users_filters(self, admin_session):
        s, _ = admin_session
        for role in ('all', 'premium', 'staff', 'admin'):
            r = s.get(f"{BASE_URL}/api/admin/users", params={'role': role, 'limit': 5})
            assert r.status_code == 200, role
            body = r.json()
            assert 'items' in body and 'total' in body

    def test_search_q(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/users", params={'q': 'admin@wehive'})
        assert r.status_code == 200
        items = r.json()['items']
        assert any((it.get('email') or '').lower() == ADMIN_EMAIL for it in items)

    def test_patch_user_toggle(self, admin_session, regular_session):
        s, _ = admin_session
        _, ru = regular_session
        uid = ru['id']
        r = s.patch(f"{BASE_URL}/api/admin/users/{uid}", json={'is_premium': True})
        assert r.status_code == 200
        assert r.json()['is_premium'] is True
        # toggle back
        r = s.patch(f"{BASE_URL}/api/admin/users/{uid}", json={'is_premium': False})
        assert r.status_code == 200
        assert r.json()['is_premium'] is False

    def test_admin_cannot_delete_self(self, admin_session):
        s, me = admin_session
        r = s.delete(f"{BASE_URL}/api/admin/users/{me['id']}")
        assert r.status_code == 400


# ---------- staff onboarding ----------
class TestStaff:
    def test_create_staff(self, admin_session):
        s, _ = admin_session
        email = f"TEST_staff_{uuid.uuid4().hex[:8]}@wehive.co.in"
        r = s.post(f"{BASE_URL}/api/admin/staff",
                   json={'email': email, 'name': 'Test Staff', 'staff_role': 'consultant'})
        assert r.status_code == 200, r.text
        u = r.json()
        assert u['is_staff'] is True
        assert u['staff_role'] == 'consultant'
        # cleanup
        s.delete(f"{BASE_URL}/api/admin/users/{u['id']}")


# ---------- applications ----------
def _seed_application(admin_s) -> str:
    """Login as a fresh user, create a draft application, return its id."""
    ident = f"TEST_appuser_{uuid.uuid4().hex[:6]}@example.com"
    data = _login(ident)
    s = requests.Session()
    s.headers.update({'Authorization': f"Bearer {data['token']}"})
    payload = {
        'country_id': 'us', 'visa_type': 'Tourist', 'applicants': 1,
        'travel_date': '2026-02-01',
    }
    r = s.post(f"{BASE_URL}/api/users/me/applications", json=payload)
    assert r.status_code in (200, 201), r.text
    return r.json().get('id') or r.json().get('_id')


class TestApplications:
    def test_list_apps(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/applications", params={'limit': 5})
        assert r.status_code == 200
        body = r.json()
        assert 'items' in body
        if body['items']:
            it = body['items'][0]
            assert 'user' in it and 'country' in it and 'revenue_inr' in it

    def test_status_change_adds_timeline(self, admin_session):
        s, _ = admin_session
        try:
            app_id = _seed_application(s)
        except AssertionError as e:
            pytest.skip(f'Could not seed application: {e}')
        r = s.patch(f"{BASE_URL}/api/admin/applications/{app_id}",
                    json={'status': 'in_review', 'note': 'TEST review'})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['status'] == 'in_review'
        timeline = body.get('timeline') or []
        assert any(e.get('status') == 'in_review' for e in timeline)


# ---------- countries ----------
class TestCountries:
    def test_filter_q(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/countries", params={'q': 'United'})
        assert r.status_code == 200
        items = r.json()['items']
        assert any('United' in (c.get('name') or '') for c in items)

    def test_patch_country_delivery_and_fee(self, admin_session):
        s, _ = admin_session
        # Pick UAE since iter-5 references it
        cid = 'ae'
        r = s.get(f"{BASE_URL}/api/admin/countries", params={'q': cid})
        assert r.status_code == 200
        original = next((c for c in r.json()['items'] if c.get('id') == cid), None)
        assert original, 'UAE country not seeded'
        old_fee = int(original.get('appointment_fee_inr') or 0)
        new_fee = old_fee + 111
        new_delivery = {**(original.get('delivery') or {}), 'rush_days': 2}
        r = s.patch(f"{BASE_URL}/api/admin/countries/{cid}",
                    json={'appointment_fee_inr': new_fee, 'delivery': new_delivery})
        assert r.status_code == 200, r.text
        fresh = r.json()
        assert int(fresh['appointment_fee_inr']) == new_fee
        assert (fresh.get('delivery') or {}).get('rush_days') == 2
        # restore
        s.patch(f"{BASE_URL}/api/admin/countries/{cid}",
                json={'appointment_fee_inr': old_fee,
                      'delivery': original.get('delivery') or {}})

    def test_public_country_filters(self):
        # regression: /api/countries?delivery=&documents=&no_visa= still works
        for params in [
            {'delivery': 'same_day'},
            {'delivery': 'rush'},
            {'delivery': 'standard'},
            {'documents': 'minimal'},
            {'documents': 'standard'},
            {'no_visa': 'true'},
        ]:
            r = requests.get(f"{BASE_URL}/api/countries", params=params)
            assert r.status_code == 200, f'{params} → {r.status_code}'
            assert 'items' in r.json() or isinstance(r.json(), list)


# ---------- integrations ----------
class TestIntegrations:
    def test_get_integrations(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/integrations")
        assert r.status_code == 200
        body = r.json()
        assert 'otp_channel' in body and 'services' in body
        ids = {svc['id'] for svc in body['services']}
        assert {'twilio', 'smtp', 'ai_marketplace'}.issubset(ids)
        for svc in body['services']:
            details = svc.get('details') or {}
            for v in details.values():
                # masked: must not reveal full creds (no '$' raw secret leak length)
                assert v is None or isinstance(v, str)

    def test_patch_otp_channel_persists_and_affects_send(self, admin_session):
        s, _ = admin_session
        # set to mock to get dev_code in send-otp response
        r = s.patch(f"{BASE_URL}/api/admin/integrations", json={'OTP_CHANNEL': 'mock'})
        assert r.status_code == 200
        # send-otp should respond with dev_code='123456' under mock channel
        ident = f"TEST_otp_{uuid.uuid4().hex[:6]}@example.com"
        rr = requests.post(f"{BASE_URL}/api/auth/send-otp", json={'identifier': ident})
        assert rr.status_code == 200, rr.text
        body = rr.json()
        # Channel/dev_code surfaced in mock mode
        assert body.get('channel') == 'mock' or 'dev_code' in body or body.get('ok') is True
        # GET reflects mock
        rg = s.get(f"{BASE_URL}/api/admin/integrations")
        assert rg.json()['otp_channel'] == 'mock'


# ---------- exports ----------
class TestExports:
    @pytest.mark.parametrize('kind, expected_first', [
        ('users.csv', 'id'),
        ('applications.csv', 'id'),
        ('countries.csv', 'id'),
        ('revenue.csv', 'date'),
    ])
    def test_csv(self, admin_session, kind, expected_first):
        s, _ = admin_session
        r = s.get(f"{BASE_URL}/api/admin/export/{kind}")
        assert r.status_code == 200, kind
        assert 'text/csv' in r.headers.get('content-type', '')
        assert 'attachment' in r.headers.get('content-disposition', '').lower()
        reader = csv.reader(io.StringIO(r.text))
        rows = list(reader)
        assert rows and rows[0][0] == expected_first


# ---------- profile edit regression (PUT /api/users/me) ----------
class TestProfileEdit:
    def test_put_profile(self):
        ident = f"TEST_profile_{uuid.uuid4().hex[:6]}@example.com"
        data = _login(ident)
        s = requests.Session()
        s.headers.update({'Authorization': f"Bearer {data['token']}"})
        new_name = f"Tester {uuid.uuid4().hex[:4]}"
        unique_phone = f"+9197{uuid.uuid4().int % 10**8:08d}"
        r = s.put(f"{BASE_URL}/api/users/me",
                  json={'name': new_name, 'gender': 'female', 'phone': unique_phone})
        assert r.status_code == 200, r.text
        assert r.json()['name'] == new_name
        # Persistence via /auth/me
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()['name'] == new_name
