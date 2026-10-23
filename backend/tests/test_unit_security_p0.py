"""P0 security fixes: no free premium, admin-only agents, no email squatting,
super-admin-only admin signup, no open Telegram/Discord posting. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402

import agent_assignment  # noqa: E402
import auth_utils  # noqa: E402
import premium  # noqa: E402
import routes_admin_auth  # noqa: E402
import routes_users  # noqa: E402
from models import UpdateProfileRequest  # noqa: E402


def _paths():
    from server import app
    return {(m, r.path) for r in app.routes for m in getattr(r, "methods", set())}


def test_removed_endpoints_are_gone():
    paths = _paths()
    for method, path in [("POST", "/api/users/me/upgrade"), ("POST", "/api/agent/signup"),
                         ("POST", "/api/communication/telegram/send-code"),
                         ("POST", "/api/communication/discord/notify")]:
        assert (method, path) not in paths, path
    assert ("POST", "/api/agent/admin/agents") in paths
    assert ("POST", "/api/users/me/contact/confirm") in paths


# ------------------------------------------------------------ premium: free tries, then pay

def test_free_tries_then_payment_wall():
    assert premium.free_left({"premium_free_used": 0}) == premium.FREE_USES
    premium.ensure_access({"premium_free_used": premium.FREE_USES - 1})  # last free try is allowed
    with pytest.raises(HTTPException) as e:
        premium.ensure_access({"premium_free_used": premium.FREE_USES}, "AI scanning")
    assert e.value.status_code == 402 and "upgrade" in e.value.detail
    premium.ensure_access({"is_premium": True, "premium_free_used": 99})
    assert premium.free_left({"is_premium": True}) == 0


@pytest.mark.asyncio
async def test_record_use_counts_only_free_users():
    users = MagicMock()
    users.update_one = AsyncMock()
    with patch("db.users", users):
        await premium.record_use({"_id": "u1"})
        await premium.record_use({"_id": "u2", "is_premium": True})
    users.update_one.assert_awaited_once_with({"_id": "u1"}, {"$inc": {"premium_free_used": 1}})


# ------------------------------------------------------------ agents: admin-created only

@pytest.mark.asyncio
async def test_only_verified_active_agents_get_applications():
    db = MagicMock()
    db.agents.find.return_value.to_list = AsyncMock(return_value=[{"_id": "a1"}, {"_id": "a2"}])
    db.applications.count_documents = AsyncMock(side_effect=[5, 2])
    assert await agent_assignment.pick_agent(db) == "a2"
    query = db.agents.find.call_args.args[0]
    assert query["status"] == "active" and query["verified"] is True and query["blacklisted"] == {"$ne": True}

    db.agents.find.return_value.to_list = AsyncMock(return_value=[])
    assert await agent_assignment.pick_agent(db) is None


# ------------------------------------------------------------ email squatting

@pytest.mark.asyncio
async def test_new_email_waits_for_a_code():
    users = MagicMock()
    users.find_one = AsyncMock(side_effect=[None, {"_id": "u1", "email": "me@x.in", "pending_email": "boss@wehive.co.in"}])
    users.update_one = AsyncMock()
    with patch.object(routes_users, "users", users):
        out = await routes_users.update_me(UpdateProfileRequest(email="Boss@wehive.co.in"),
                                           user={"_id": "u1", "email": "me@x.in"})
    update = users.update_one.await_args.args[1]["$set"]
    assert "email" not in update and update["pending_email"] == "boss@wehive.co.in"
    assert out["email"] == "me@x.in" and out["pending_email"] == "boss@wehive.co.in"


@pytest.mark.asyncio
async def test_unverified_holder_loses_the_address():
    users = MagicMock()
    users.update_one = AsyncMock()
    users.find_one = AsyncMock(return_value={"_id": "squatter", "email": "boss@wehive.co.in", "email_verified": False})
    assert await auth_utils.claim_contact(users, "email", "boss@wehive.co.in") is None
    filt, upd = users.update_one.await_args.args
    assert filt == {"_id": "squatter"} and upd["$unset"] == {"email": ""}

    owner = {"_id": "real", "email": "boss@wehive.co.in", "email_verified": True}
    users.find_one = AsyncMock(return_value=owner)
    users.update_one.reset_mock()
    assert await auth_utils.claim_contact(users, "email", "boss@wehive.co.in") == owner
    users.update_one.assert_not_awaited()


# ------------------------------------------------------------ admin signup

@pytest.mark.asyncio
async def test_non_super_admin_cannot_create_admins():
    viewer = {"_id": "v1", "email": "viewer@wehive.co.in", "is_admin": True, "admin_role": "viewer"}
    req = routes_admin_auth.SignupRequest(name="Xavier", email="boss@wehive.co.in", password="Str0ng!Passw0rd#")
    with patch.object(routes_admin_auth, "get_current_admin_flex", new=AsyncMock(return_value=viewer)):
        with pytest.raises(HTTPException) as e:
            await routes_admin_auth.admin_signup(req, authorization="Bearer t")
    assert e.value.status_code == 403


def test_receipt_and_plans_make_no_guarantee():
    root = os.path.join(os.path.dirname(__file__), "..")
    for name in ("routes_apps.py", "routes_payments.py"):
        text = open(os.path.join(root, name), encoding="utf-8").read()
        assert "refunded automatically" not in text and "on-time guarantee" not in text.lower(), name
