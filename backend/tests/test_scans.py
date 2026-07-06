"""Round 12 tests — /api/scan/history + DELETE /api/scan/{scan_id}.

We avoid invoking real Gemini Vision by inserting fake scan records
directly into the `scans` MongoDB collection (per testing instructions).
"""
from __future__ import annotations
import os
import uuid
import asyncio
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

# Try loading from local environment files if running locally, otherwise fall back to Docker paths
local_frontend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/.env'))
local_backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env'))

frontend_env = local_frontend_env if os.path.exists(local_frontend_env) else '/app/frontend/.env'
backend_env = local_backend_env if os.path.exists(local_backend_env) else '/app/backend/.env'

if os.path.exists(frontend_env):
    load_dotenv(frontend_env)
if os.path.exists(backend_env):
    load_dotenv(backend_env)

# Use env var if present and not empty, otherwise default to the preview URL
base_url_env = os.environ.get('REACT_APP_BACKEND_URL', '')
if not base_url_env:
    BASE_URL = "https://premium-collab-6.preview.emergentagent.com"
else:
    BASE_URL = base_url_env.rstrip('/')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'wehive')


# ---------- helpers ---------- #
def _new_user_token(identifier: str | None = None) -> tuple[str, str]:
    """Mock OTP login for a brand-new user. Returns (token, user_id)."""
    if identifier is None:
        identifier = f"TEST_scans_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/send-otp",
                      json={"identifier": identifier, "channel": "email"})
    assert r.status_code == 200, r.text
    r = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                      json={"identifier": identifier, "code": "123456",
                            "channel": "email"})
    assert r.status_code == 200, r.text
    body = r.json()
    token = body.get('token') or body.get('access_token')
    assert token, body
    user_id = (body.get('user') or {}).get('_id') or (body.get('user') or {}).get('id')
    return token, user_id


@pytest.fixture(scope="module")
def user_session():
    token, uid = _new_user_token()
    s = requests.Session()
    s.headers.update({'Authorization': f'Bearer {token}',
                      'Content-Type': 'application/json'})
    return {'session': s, 'token': token, 'user_id': uid}


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


# ---------- auth ---------- #
class TestScanAuth:
    def test_history_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/scan/history")
        assert r.status_code in (401, 403), r.text

    def test_delete_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/scan/some-id")
        assert r.status_code in (401, 403), r.text


# ---------- history ---------- #
class TestScanHistory:
    def test_empty_for_new_user(self, user_session):
        r = user_session['session'].get(f"{BASE_URL}/api/scan/history")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ('total', 'items', 'limit', 'skip'):
            assert k in body, f"missing key {k}: {body}"
        assert body['total'] == 0
        assert body['items'] == []
        assert isinstance(body['limit'], int)
        assert isinstance(body['skip'], int)

    def test_delete_nonexistent_scan_returns_404(self, user_session):
        r = user_session['session'].delete(f"{BASE_URL}/api/scan/{uuid.uuid4()}")
        assert r.status_code == 404, r.text


# ---------- persistence (mocked Gemini) ---------- #
class TestScanPersistence:
    def test_seed_scan_appears_in_history_then_delete_removes_it(
        self, user_session, mongo
    ):
        uid = user_session['user_id']
        scan_id = f"TEST_scan_{uuid.uuid4().hex[:10]}"
        # Seed an application owned by the user
        app_id = f"TEST_app_{uuid.uuid4().hex[:10]}"
        try:
            mongo['applications'].insert_one({
                '_id': app_id, 'user_id': uid, 'country': 'us',
                'visa_type': 'tourist', 'status': 'draft',
                'scans': [{'_id': scan_id, 'kind': 'passport',
                           'extracted': {'full_name': 'TEST USER'},
                           'created_at': datetime.utcnow()}],
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            })
            mongo['scans'].insert_one({
                '_id': scan_id, 'user_id': uid, 'kind': 'passport',
                'model': 'gemini-2.5-flash',
                'extracted': {'full_name': 'TEST USER',
                              'passport_number': 'X1234567'},
                'application_id': app_id,
                'created_at': datetime.utcnow(),
            })

            # 1) history shows it
            r = user_session['session'].get(f"{BASE_URL}/api/scan/history")
            assert r.status_code == 200
            body = r.json()
            assert body['total'] >= 1
            ids = [it['id'] for it in body['items']]
            assert scan_id in ids
            item = next(it for it in body['items'] if it['id'] == scan_id)
            assert item['kind'] == 'passport'
            assert item['application_id'] == app_id
            assert item['extracted'].get('passport_number') == 'X1234567'
            # raw is excluded from history projection
            assert 'raw' not in item

            # 2) DELETE removes from scans + pulls from application.scans
            r = user_session['session'].delete(
                f"{BASE_URL}/api/scan/{scan_id}")
            assert r.status_code == 200, r.text
            assert r.json().get('ok') is True

            # Verify scans collection no longer has it
            doc = mongo['scans'].find_one({'_id': scan_id})
            assert doc is None

            # Verify application.scans list has been pulled
            app_doc = mongo['applications'].find_one({'_id': app_id})
            assert app_doc is not None
            embedded_ids = [s.get('_id') for s in (app_doc.get('scans') or [])]
            assert scan_id not in embedded_ids

            # 3) history again → not present
            r = user_session['session'].get(f"{BASE_URL}/api/scan/history")
            assert r.status_code == 200
            ids2 = [it['id'] for it in r.json()['items']]
            assert scan_id not in ids2

            # 4) Re-delete returns 404
            r = user_session['session'].delete(
                f"{BASE_URL}/api/scan/{scan_id}")
            assert r.status_code == 404
        finally:
            mongo['applications'].delete_one({'_id': app_id})
            mongo['scans'].delete_one({'_id': scan_id})

    def test_user_cannot_see_or_delete_other_users_scan(
        self, user_session, mongo
    ):
        # Seed a scan for a *different* user_id
        other_uid = f"OTHER_{uuid.uuid4().hex[:8]}"
        scan_id = f"TEST_other_scan_{uuid.uuid4().hex[:10]}"
        try:
            mongo['scans'].insert_one({
                '_id': scan_id, 'user_id': other_uid, 'kind': 'document',
                'model': 'gemini-2.5-flash',
                'extracted': {'document_kind': 'bank_statement'},
                'application_id': None,
                'created_at': datetime.utcnow(),
            })
            # Current user should NOT see it in history
            r = user_session['session'].get(
                f"{BASE_URL}/api/scan/history")
            ids = [it['id'] for it in r.json()['items']]
            assert scan_id not in ids
            # Current user attempting to delete it → 404
            r = user_session['session'].delete(
                f"{BASE_URL}/api/scan/{scan_id}")
            assert r.status_code == 404
        finally:
            mongo['scans'].delete_one({'_id': scan_id})


# ---------- regression: a couple of Round 10/11 endpoints ---------- #
class TestRegression:
    def test_public_countries_filters_still_200(self):
        for q in ('', '?delivery=fast',
                  '?documents=passport', '?no_visa=true'):
            r = requests.get(f"{BASE_URL}/api/countries{q}")
            assert r.status_code == 200, f"{q}: {r.status_code} {r.text[:200]}"

    def test_admin_login_still_works(self):
        r = requests.post(f"{BASE_URL}/api/admin-auth/login", json={
            "email": "admin@wehive.co.in",
            "password": "Wehive@Admin2026",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert 'access_token' in body
        token = body['access_token']
        # Pull metrics with admin token to exercise admin route
        r = requests.get(f"{BASE_URL}/api/admin/metrics",
                         headers={'Authorization': f'Bearer {token}'})
        assert r.status_code == 200, r.text
