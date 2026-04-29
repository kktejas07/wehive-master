"""Tests for the new password-based admin auth (Round 11) and visa-type
auto-sync on PATCH /api/admin/countries.

Endpoints under test:
  /api/admin-auth/{login,signup,forgot-password,reset-password,me,change-password}
  PATCH /api/admin/countries/{id}  (visa_types <-> categories sync)
"""
from __future__ import annotations

import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as fh:
        for line in fh:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
                break

ADMIN_EMAIL = 'admin@wehive.co.in'
ADMIN_PASS = 'Wehive@Admin2026'
ALLOWED_SIGNUP_EMAIL = 'krishnakranthiteja@gmail.com'


# ---------- helpers ----------
def _admin_headers(token: str) -> dict:
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


@pytest.fixture(scope='module')
def admin_token() -> str:
    """Login as the seeded super-admin and return the JWT."""
    r = requests.post(f'{BASE_URL}/api/admin-auth/login',
                      json={'email': ADMIN_EMAIL, 'password': ADMIN_PASS})
    assert r.status_code == 200, f'admin login failed: {r.status_code} {r.text}'
    data = r.json()
    assert data.get('access_token'), 'no access_token in login response'
    assert data['user']['is_admin'] is True
    assert data['user']['has_password'] is True
    return data['access_token']


# ---------- /admin-auth/login ----------
class TestAdminLogin:
    def test_login_success(self):
        r = requests.post(f'{BASE_URL}/api/admin-auth/login',
                          json={'email': ADMIN_EMAIL, 'password': ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert 'access_token' in data
        assert data['token_type'] == 'bearer'
        assert data['user']['email'] == ADMIN_EMAIL
        assert data['user']['is_admin'] is True
        assert data['user']['has_password'] is True

    def test_login_wrong_password_returns_401_with_attempts(self):
        # Use a fake email so we don't trip lockout on the real seed account
        fake = f'TEST_admin_locktest_{uuid.uuid4().hex[:8]}@wehive.co.in'
        # Email not seeded: still 401 but no lockout drama
        r = requests.post(f'{BASE_URL}/api/admin-auth/login',
                          json={'email': fake, 'password': 'wrong-pass-1'})
        assert r.status_code == 401
        assert 'Invalid' in r.json().get('detail', '')

    def test_login_wrong_password_eventually_locks_out(self):
        """Hit the seeded account with 5 wrong passwords -> 429."""
        statuses = []
        for i in range(7):
            r = requests.post(f'{BASE_URL}/api/admin-auth/login',
                              json={'email': ADMIN_EMAIL, 'password': f'wrong-pwd-{i}'})
            statuses.append(r.status_code)
        assert 429 in statuses, f'expected lockout 429 in {statuses}'
        # Reset lockout via password reset (issued via dev fallback) so other
        # tests in the module can still log in.
        r = requests.post(f'{BASE_URL}/api/admin-auth/forgot-password',
                          json={'email': ADMIN_EMAIL})
        assert r.status_code == 200
        body = r.json()
        if body.get('dev_token'):
            r2 = requests.post(f'{BASE_URL}/api/admin-auth/reset-password',
                               json={'token': body['dev_token'], 'new_password': ADMIN_PASS})
            assert r2.status_code == 200


# ---------- /admin-auth/signup ----------
class TestAdminSignup:
    def test_signup_email_not_in_allowlist(self):
        r = requests.post(f'{BASE_URL}/api/admin-auth/signup', json={
            'email': f'TEST_outsider_{uuid.uuid4().hex[:8]}@example.com',
            'password': 'Password1!',
            'name': 'Outside Person',
        })
        assert r.status_code == 403

    def test_signup_when_admin_already_has_password(self):
        # Seeded admin already has password -> 409
        r = requests.post(f'{BASE_URL}/api/admin-auth/signup', json={
            'email': ADMIN_EMAIL,
            'password': 'Password1!',
            'name': 'Dupe',
        })
        assert r.status_code == 409

    def test_signup_allowed_email_creates_or_promotes(self):
        # Use the alt allow-listed email. We don't know if it has a password
        # already from previous runs; either way we expect 200 OR 409.
        r = requests.post(f'{BASE_URL}/api/admin-auth/signup', json={
            'email': ALLOWED_SIGNUP_EMAIL,
            'password': 'AltAdmin#2026',
            'name': 'Krishna Admin',
        })
        assert r.status_code in (200, 409), f'unexpected: {r.status_code} {r.text}'
        if r.status_code == 200:
            data = r.json()
            assert data['user']['is_admin'] is True
            assert data['user']['email'] == ALLOWED_SIGNUP_EMAIL


# ---------- forgot/reset ----------
class TestForgotResetPassword:
    def test_forgot_unknown_email_no_enumeration(self):
        r = requests.post(f'{BASE_URL}/api/admin-auth/forgot-password',
                          json={'email': f'TEST_nobody_{uuid.uuid4().hex[:8]}@example.com'})
        assert r.status_code == 200
        body = r.json()
        assert body.get('ok') is True
        # Should NOT include dev_token for unknown emails
        assert 'dev_token' not in body or body.get('dev_token') is None

    def test_forgot_known_admin_returns_dev_token(self):
        r = requests.post(f'{BASE_URL}/api/admin-auth/forgot-password',
                          json={'email': ADMIN_EMAIL})
        assert r.status_code == 200
        body = r.json()
        assert body.get('dev_mode') is True
        assert body.get('dev_token')

    def test_reset_password_happy_path_then_reuse_blocked(self):
        # Issue token
        r = requests.post(f'{BASE_URL}/api/admin-auth/forgot-password',
                          json={'email': ADMIN_EMAIL})
        body = r.json()
        token = body.get('dev_token')
        assert token, 'expected dev_token in dev mode'

        # Use it
        r2 = requests.post(f'{BASE_URL}/api/admin-auth/reset-password',
                           json={'token': token, 'new_password': ADMIN_PASS})
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data.get('access_token')

        # Reuse should fail
        r3 = requests.post(f'{BASE_URL}/api/admin-auth/reset-password',
                           json={'token': token, 'new_password': ADMIN_PASS})
        assert r3.status_code == 400
        assert 'already' in r3.json().get('detail', '').lower() or 'invalid' in r3.json().get('detail', '').lower()

    def test_reset_password_invalid_token(self):
        r = requests.post(f'{BASE_URL}/api/admin-auth/reset-password',
                          json={'token': 'not-a-real-token-xyz', 'new_password': ADMIN_PASS})
        assert r.status_code == 400


# ---------- /me, change-password ----------
class TestAdminMe:
    def test_me_with_admin_jwt(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/admin-auth/me', headers=_admin_headers(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body['email'] == ADMIN_EMAIL
        assert body['is_admin'] is True
        assert body['has_password'] is True

    def test_change_password_wrong_current(self, admin_token):
        r = requests.post(f'{BASE_URL}/api/admin-auth/change-password',
                          headers=_admin_headers(admin_token),
                          json={'current_password': 'definitely-not-it',
                                'new_password': 'AnotherPass2026!'})
        assert r.status_code == 401

    def test_change_password_round_trip(self, admin_token):
        new_pw = 'TempPass#2026'
        r = requests.post(f'{BASE_URL}/api/admin-auth/change-password',
                          headers=_admin_headers(admin_token),
                          json={'current_password': ADMIN_PASS, 'new_password': new_pw})
        assert r.status_code == 200
        # Login with new password
        r2 = requests.post(f'{BASE_URL}/api/admin-auth/login',
                           json={'email': ADMIN_EMAIL, 'password': new_pw})
        assert r2.status_code == 200
        new_token = r2.json()['access_token']
        # Restore
        r3 = requests.post(f'{BASE_URL}/api/admin-auth/change-password',
                           headers=_admin_headers(new_token),
                           json={'current_password': new_pw, 'new_password': ADMIN_PASS})
        assert r3.status_code == 200


# ---------- /api/admin/* with admin JWT ----------
class TestAdminEndpointsWithAdminJWT:
    def test_metrics_with_admin_jwt(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/admin/metrics', headers=_admin_headers(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert 'users' in data and 'applications' in data and 'revenue' in data

    def test_users_with_admin_jwt(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/admin/users', headers=_admin_headers(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert 'items' in body or isinstance(body, list)

    def test_applications_with_admin_jwt(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/admin/applications', headers=_admin_headers(admin_token))
        assert r.status_code == 200

    def test_integrations_with_admin_jwt(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/admin/integrations', headers=_admin_headers(admin_token))
        assert r.status_code == 200

    def test_users_csv_with_admin_jwt(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/admin/export/users.csv',
                         headers=_admin_headers(admin_token))
        assert r.status_code == 200
        assert 'text/csv' in r.headers.get('content-type', '')


# ---------- visa_types auto-sync via PATCH /api/admin/countries ----------
class TestVisaTypeSync:
    """Add/edit/delete categories on a country and verify public endpoint."""

    COUNTRY_ID = 'ae'  # use UAE since prior round restored it

    def test_patch_categories_syncs_visa_types(self, admin_token):
        # Get current state via the public endpoint (admin has no GET-by-id)
        r = requests.get(f'{BASE_URL}/api/countries/{self.COUNTRY_ID}')
        assert r.status_code == 200, r.text
        original = r.json()
        original_categories = dict(original.get('categories') or {})
        original_visa_types = list(original.get('visa_types') or [])
        assert original_categories, 'precondition: country should have categories'

        # Build a draft adding a "TestTransit" type and removing one existing key
        existing_keys = list(original_categories.keys())
        removed_key = existing_keys[-1] if len(existing_keys) > 1 else None

        new_categories = {k: v for k, v in original_categories.items() if k != removed_key}
        new_categories['TestTransit'] = {
            'fees_inr': 1234,
            'fees_usd': 15,
            'validity': '14 days',
            'processing_days': '2-3',
            'multi_entry': False,
            'documents': ['Passport', 'Photo'],
        }

        r2 = requests.patch(f'{BASE_URL}/api/admin/countries/{self.COUNTRY_ID}',
                            headers=_admin_headers(admin_token),
                            json={'categories': new_categories})
        assert r2.status_code == 200, r2.text

        # Public endpoint should reflect new visa_types
        r3 = requests.get(f'{BASE_URL}/api/countries/{self.COUNTRY_ID}')
        assert r3.status_code == 200
        public = r3.json()
        public_types = set(public.get('visa_types') or [])
        assert 'TestTransit' in public_types, f'visa_types should contain new key: {public_types}'
        if removed_key:
            assert removed_key not in public_types, f'removed key still present: {public_types}'

        # And category data should be persisted
        cats = public.get('categories') or {}
        assert 'TestTransit' in cats
        assert cats['TestTransit']['fees_inr'] == 1234
        assert cats['TestTransit']['fees_usd'] == 15

        # Restore to original
        r4 = requests.patch(f'{BASE_URL}/api/admin/countries/{self.COUNTRY_ID}',
                            headers=_admin_headers(admin_token),
                            json={'categories': original_categories,
                                  'visa_types': original_visa_types})
        assert r4.status_code == 200


# ---------- regression smoke: legacy OTP flow + public filters ----------
class TestRegression:
    def test_otp_flow_still_works(self):
        ident = f'TEST_otp_user_{uuid.uuid4().hex[:8]}@example.com'
        r = requests.post(f'{BASE_URL}/api/auth/send-otp', json={'identifier': ident})
        assert r.status_code == 200
        r2 = requests.post(f'{BASE_URL}/api/auth/verify-otp',
                           json={'identifier': ident, 'code': '123456'})
        assert r2.status_code == 200
        assert r2.json().get('token') or r2.json().get('access_token')

    def test_public_country_filters(self):
        for q in ('delivery=same_day', 'delivery=rush', 'delivery=standard',
                  'documents=minimal', 'documents=standard', 'no_visa=true'):
            r = requests.get(f'{BASE_URL}/api/countries?{q}')
            assert r.status_code == 200, f'{q} -> {r.status_code}'
