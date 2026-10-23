"""Admin panel fixes: super-admin gate, secret masking, email re-verification, back-office endpoints."""
import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import admin_auth  # noqa: E402
import routes_admin  # noqa: E402
import routes_admin_backoffice as backoffice  # noqa: E402
import routes_users  # noqa: E402


# ── super admin ───────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_super_admin_gate(monkeypatch):
    monkeypatch.setattr(admin_auth, 'ADMIN_EMAILS', {'owner@example.com'})
    owner = {'_id': 'a1', 'email': 'Owner@Example.com', 'is_admin': True}
    assert await admin_auth.get_super_admin(owner) is owner
    with pytest.raises(HTTPException) as exc:
        await admin_auth.get_super_admin({'_id': 'a2', 'email': 'invited@example.com', 'is_admin': True})
    assert exc.value.status_code == 403


def test_dangerous_endpoints_require_super_admin():
    from fastapi.routing import APIRoute
    import server
    guarded = {
        ('GET', '/api/admin/settings/{namespace}'), ('PUT', '/api/admin/settings/{namespace}'),
        ('PATCH', '/api/admin/integrations'), ('DELETE', '/api/admin/users/{user_id}'),
        ('POST', '/api/admin-auth/admins'), ('DELETE', '/api/admin-auth/admins/{user_id}'),
        ('DELETE', '/api/rag/collections/{name}'),
    }
    found = set()
    for r in server.app.routes:
        if not isinstance(r, APIRoute):
            continue
        deps = {d.call for d in r.dependant.dependencies}
        for m in r.methods:
            if (m, r.path) in guarded:
                assert admin_auth.get_super_admin in deps, (m, r.path)
                found.add((m, r.path))
    assert found == guarded


# ── secrets ───────────────────────────────────────────────────────────────────
def test_settings_secrets_are_masked():
    cfg = {'key_id': 'rzp_live_x', 'key_secret': 's3cret', 'webhook_secret': 'w', 'auth_token': 't',
           'access_key_id': 'AKIA', 'secret_access_key': 'sak', 'host': 'smtp.example.com', 'enabled': True, 'empty_key': ''}
    out = routes_admin._mask_secrets(cfg)
    assert out['key_id'] == 'rzp_live_x' and out['access_key_id'] == 'AKIA' and out['host'] == 'smtp.example.com'
    assert out['enabled'] is True and out['empty_key'] == ''
    for k in ('key_secret', 'webhook_secret', 'auth_token', 'secret_access_key'):
        assert out[k] == routes_admin.SECRET_MASK


@pytest.mark.asyncio
async def test_settings_put_keeps_secret_when_mask_round_trips(monkeypatch):
    import settings_service
    monkeypatch.setattr(settings_service, 'get_all', AsyncMock(return_value={'key_id': 'old', 'key_secret': 'REAL'}))
    set_all = AsyncMock()
    monkeypatch.setattr(settings_service, 'set_all', set_all)
    monkeypatch.setattr(routes_admin, 'audit_record', AsyncMock())
    body = routes_admin.NamespaceSettings(config={'key_id': 'new', 'key_secret': routes_admin.SECRET_MASK})
    await routes_admin.admin_update_settings('razorpay', body, admin={'_id': 'a1'})
    assert set_all.await_args.args[1] == {'key_id': 'new', 'key_secret': 'REAL'}


# ── email change must be re-verified ──────────────────────────────────────────
@pytest.mark.asyncio
async def test_email_change_waits_for_verification(monkeypatch):
    coll = MagicMock(update_one=AsyncMock(), find_one=AsyncMock(side_effect=[None, {'_id': 'u1', 'email': 'me@example.com'}]))
    monkeypatch.setattr(routes_users, 'users', coll)
    from models import UpdateProfileRequest
    await routes_users.update_me(UpdateProfileRequest(email='Boss@Example.com'),
                                 user={'_id': 'u1', 'email': 'me@example.com', 'email_verified': True})
    update = coll.update_one.await_args.args[1]['$set']
    assert 'email' not in update and update['pending_email'] == 'boss@example.com'


def test_user_patch_cannot_grant_admin():
    assert 'is_admin' not in routes_admin.UserPatch.model_fields


# ── back office ───────────────────────────────────────────────────────────────
def test_lead_filter_treats_missing_status_as_new():
    assert backoffice._lead_filter('new', None) == {'status': {'$in': [None, 'new']}}
    q = backoffice._lead_filter('all', 'a.b')['$or'][0]['name']['$regex']
    assert q == r'a\.b'


@pytest.mark.asyncio
async def test_update_lead_requires_change(monkeypatch):
    monkeypatch.setattr(backoffice, 'leads', MagicMock(find_one=AsyncMock(return_value={'_id': 'l1'})))
    with pytest.raises(HTTPException) as exc:
        await backoffice.admin_update_lead('l1', backoffice.LeadPatch(), admin={'_id': 'a1'})
    assert exc.value.status_code == 400
