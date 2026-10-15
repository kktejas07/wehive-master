"""Regression tests for the security audit fixes (auth, agents, payments, uploads, Sherpa proxy)."""
import io
import os
import re
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException, UploadFile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import admin_auth  # noqa: E402
import auth_utils  # noqa: E402
import db as db_module  # noqa: E402
import firebase_utils  # noqa: E402
import routes_agents  # noqa: E402
import routes_auth  # noqa: E402
import routes_payments  # noqa: E402
import routes_visa_providers  # noqa: E402
from upload_limits import read_capped  # noqa: E402


# ── /auth/firebase-sync ───────────────────────────────────────────────────────
class TestFirebaseSync:
    @pytest.fixture(autouse=True)
    def _firebase(self, monkeypatch):
        import firebase_admin
        monkeypatch.setattr(firebase_admin, '_apps', {'[DEFAULT]': object()})
        monkeypatch.setattr(firebase_utils, '_get_firebase_creds', AsyncMock(return_value=('proj', '{}')))
        self.users = MagicMock(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
        monkeypatch.setattr(routes_auth, 'users', self.users)
        self.monkeypatch = monkeypatch

    def _token(self, **claims):
        self.monkeypatch.setattr(firebase_utils, 'verify_firebase_token', AsyncMock(return_value={'uid': 'fb1', **claims}))

    @pytest.mark.asyncio
    async def test_unverified_email_cannot_claim_account(self):
        self._token(email='victim@example.com', email_verified=False)
        with pytest.raises(HTTPException) as exc:
            await routes_auth.firebase_sync(routes_auth.FirebaseSyncRequest(id_token='t'), request=None)
        assert exc.value.status_code == 403
        self.users.find_one.assert_not_called()

    @pytest.mark.asyncio
    async def test_verified_email_signs_in(self):
        self._token(email='me@example.com', email_verified=True)
        out = await routes_auth.firebase_sync(routes_auth.FirebaseSyncRequest(id_token='t'), request=None)
        assert out.access_token
        self.users.insert_one.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_invalid_token_does_not_leak_error_text(self, monkeypatch):
        fake_auth = SimpleNamespace(verify_id_token=MagicMock(side_effect=ValueError('secret internals')))
        monkeypatch.setattr(firebase_utils, 'get_firebase_app', lambda: object())
        monkeypatch.setitem(sys.modules, 'firebase_admin.auth', fake_auth)
        import firebase_admin
        monkeypatch.setattr(firebase_admin, 'auth', fake_auth, raising=False)
        with pytest.raises(HTTPException) as exc:
            await firebase_utils.verify_firebase_token('bad')
        assert exc.value.status_code == 401
        assert 'secret internals' not in exc.value.detail
        assert fake_auth.verify_id_token.call_args.kwargs == {'check_revoked': True}


# ── admin access via ADMIN_EMAILS ─────────────────────────────────────────────
class TestAdminFlex:
    @pytest.fixture(autouse=True)
    def _setup(self, monkeypatch):
        monkeypatch.setattr(admin_auth, 'ADMIN_EMAILS', {'boss@example.com'})
        monkeypatch.setattr(admin_auth, 'decode_admin_jwt', MagicMock(side_effect=HTTPException(401)))
        monkeypatch.setattr(auth_utils, 'decode_jwt', lambda t: {'sub': 'u1'})
        self.users = MagicMock()
        monkeypatch.setattr(db_module, 'users', self.users)

    @pytest.mark.asyncio
    async def test_allow_listed_but_unverified_email_is_rejected(self):
        self.users.find_one = AsyncMock(return_value={'_id': 'u1', 'email': 'boss@example.com', 'email_verified': False})
        with pytest.raises(HTTPException) as exc:
            await admin_auth.get_current_admin_flex('Bearer x')
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_allow_listed_verified_email_is_admin(self):
        user = {'_id': 'u1', 'email': 'boss@example.com', 'email_verified': True}
        self.users.find_one = AsyncMock(return_value=user)
        assert await admin_auth.get_current_admin_flex('Bearer x') is user


# ── agent portal ──────────────────────────────────────────────────────────────
class TestAgentAuth:
    @pytest.fixture(autouse=True)
    def _setup(self, monkeypatch):
        self.db = MagicMock()
        monkeypatch.setattr(routes_agents, 'db', self.db)
        self.monkeypatch = monkeypatch

    def _payload(self, **p):
        self.monkeypatch.setattr(routes_agents, 'decode_jwt', lambda t: p)

    @pytest.mark.asyncio
    async def test_user_token_is_not_an_agent_token(self):
        self._payload(sub='agent@example.com')  # no role claim
        self.db.agents.find_one = AsyncMock(return_value={'_id': 'a1', 'email': 'agent@example.com', 'status': 'active'})
        with pytest.raises(HTTPException) as exc:
            await routes_agents.get_current_agent('Bearer x')
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.parametrize('agent', [{'blacklisted': True, 'status': 'active'}, {'status': 'suspended'}])
    async def test_suspended_agent_is_rejected(self, agent):
        self._payload(sub='agent@example.com', role='agent')
        self.db.agents.find_one = AsyncMock(return_value={'_id': 'a1', **agent})
        with pytest.raises(HTTPException) as exc:
            await routes_agents.get_current_agent('Bearer x')
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_student_search_escapes_regex(self):
        coll = self.db.agent_students
        coll.count_documents = AsyncMock(return_value=0)
        coll.find.return_value.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
        await routes_agents.agent_students(search='(a+)+$', agent={'_id': 'a1'}, limit=10, skip=0)
        query = coll.count_documents.call_args.args[0]
        assert query['$or'][0]['name']['$regex'] == re.escape('(a+)+$')

    @pytest.mark.asyncio
    async def test_transfer_to_unknown_agent_is_404(self):
        self.db.agents.find_one = AsyncMock(return_value=None)
        self.db.applications.update_one = AsyncMock()
        with pytest.raises(HTTPException) as exc:
            await routes_agents.transfer_application(
                routes_agents.TransferRequest(application_id='app1', target_agent_id='ghost'), agent={'_id': 'a1'})
        assert exc.value.status_code == 404
        self.db.applications.update_one.assert_not_called()

    def test_commission_amount_must_be_a_non_negative_int(self):
        with pytest.raises(ValueError):
            routes_agents.CommissionCreate(amount_inr='lots')
        with pytest.raises(ValueError):
            routes_agents.CommissionCreate(amount_inr=-5)


# ── payments ──────────────────────────────────────────────────────────────────
class TestPayments:
    @pytest.mark.asyncio
    async def test_mock_order_not_redeemable_when_bypass_off(self, monkeypatch):
        monkeypatch.setattr(routes_payments, 'PAYMENT_BYPASS_ENABLED', False)
        monkeypatch.setattr(routes_payments, 'payments', MagicMock(
            find_one=AsyncMock(return_value={'_id': 'p1', 'plan_id': 'standard', 'status': 'mock'}),
            update_one=AsyncMock()))
        users = MagicMock(update_one=AsyncMock())
        monkeypatch.setattr(routes_payments, 'users', users)
        req = routes_payments.VerifyRequest(razorpay_order_id='mock-1', razorpay_payment_id='x',
                                            razorpay_signature='x', plan_id='standard')
        with pytest.raises(HTTPException) as exc:
            await routes_payments.verify_payment(req, user={'_id': 'u1'}, bg=MagicMock())
        assert exc.value.status_code == 400
        users.update_one.assert_not_called()


# ── uploads ───────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_read_capped_rejects_oversized_upload():
    big = UploadFile(file=io.BytesIO(b'x' * (1024 * 1024 + 1)), filename='a.bin')
    with pytest.raises(HTTPException) as exc:
        await read_capped(big, max_mb=1)
    assert exc.value.status_code == 413
    small = UploadFile(file=io.BytesIO(b'ok'), filename='a.bin')
    assert await read_capped(small, max_mb=1) == b'ok'


# ── Sherpa proxy ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_sherpa_proxy_503_without_key(monkeypatch):
    monkeypatch.delenv('SHERPA_API_KEY', raising=False)
    with pytest.raises(HTTPException) as exc:
        await routes_visa_providers.sherpa_trips(routes_visa_providers.SherpaTripRequest(citizenship='IN', destination='CA'))
    assert exc.value.status_code == 503
