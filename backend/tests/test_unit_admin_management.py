"""Unit tests for admin management and Hive proposal decisions. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from types import SimpleNamespace  # noqa: E402

import pytest  # noqa: E402
from bson import ObjectId  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routes_admin_auth  # noqa: E402
import routes_hive_learning  # noqa: E402
from admin_auth import get_current_admin_flex, get_super_admin  # noqa: E402
from server import app  # noqa: E402

ENV_ADMIN = "owner@example.com"


def _get(doc, dotted):
    for part in dotted.split("."):
        doc = (doc or {}).get(part)
    return doc


def _match(doc, q):
    for k, v in q.items():
        if k == "$or":
            if not any(_match(doc, sub) for sub in v):
                return False
            continue
        val = _get(doc, k)
        if isinstance(v, dict) and any(op.startswith("$") for op in v):
            if "$in" in v and val not in v["$in"]:
                return False
            if "$ne" in v and val == v["$ne"]:
                return False
            if "$nin" in v and val in v["$nin"]:
                return False
        elif val != v:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *_a, **_k):
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    def __aiter__(self):
        self._it = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return dict(next(self._it))
        except StopIteration:
            raise StopAsyncIteration


class FakeCol:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, q):
        return next((d for d in self.docs if _match(d, q)), None)

    def find(self, q, projection=None):
        return _Cursor([d for d in self.docs if _match(d, q)])

    async def insert_one(self, doc):
        doc.setdefault("_id", ObjectId())
        self.docs.append(doc)

    def _apply(self, doc, update):
        for k, v in update.get("$set", {}).items():
            target = doc
            *parents, leaf = k.split(".")
            for p in parents:
                target = target.setdefault(p, {})
            target[leaf] = v

    async def update_one(self, q, update):
        doc = await self.find_one(q)
        if doc:
            self._apply(doc, update)
        return SimpleNamespace(matched_count=int(bool(doc)), modified_count=int(bool(doc)))

    async def update_many(self, q, update):
        hits = [d for d in self.docs if _match(d, q)]
        for d in hits:
            self._apply(d, update)
        return SimpleNamespace(matched_count=len(hits), modified_count=len(hits))

    async def count_documents(self, q):
        return sum(1 for d in self.docs if _match(d, q))


ME = {"_id": "me", "email": "me@example.com", "name": "Me", "is_admin": True, "password_hash": "x"}


@pytest.fixture
def env(monkeypatch):
    users = FakeCol([dict(ME), {"_id": "owner", "email": ENV_ADMIN, "is_admin": True, "password_hash": "x"}])
    tokens = FakeCol()
    sent, audit = [], []

    async def fake_send(email, raw, inviter):
        sent.append({"email": email, "token": raw})
        return True, f"http://site/admin/reset-password?token={raw}&invite=1"

    async def fake_audit(admin, action, entity_type, entity_id=None, **kw):
        audit.append((action, entity_type, entity_id))

    monkeypatch.setenv("RATE_LIMIT_DISABLED", "1")
    monkeypatch.setattr(routes_admin_auth, "users", users)
    monkeypatch.setattr(routes_admin_auth, "password_reset_tokens", tokens)
    monkeypatch.setattr(routes_admin_auth, "ADMIN_EMAILS", {ENV_ADMIN})
    monkeypatch.setattr(routes_admin_auth, "_send_admin_invite", fake_send)
    monkeypatch.setattr(routes_admin_auth, "audit_record", fake_audit)
    # Managing admins is super-admin only; these tests exercise that flow as a super admin.
    app.dependency_overrides[get_current_admin_flex] = lambda: dict(ME)
    app.dependency_overrides[get_super_admin] = lambda: dict(ME)
    yield SimpleNamespace(client=TestClient(app), users=users, tokens=tokens, sent=sent, audit=audit)
    app.dependency_overrides.pop(get_current_admin_flex, None)
    app.dependency_overrides.pop(get_super_admin, None)


def test_admin_endpoints_require_admin():
    client = TestClient(app)
    assert client.get("/api/admin-auth/admins").status_code == 401
    assert client.post("/api/admin-auth/admins", json={"email": "x@example.com"}).status_code == 401
    assert client.delete("/api/admin-auth/admins/someone").status_code == 401


def test_list_marks_env_managed_admins(env):
    items = env.client.get("/api/admin-auth/admins").json()["items"]
    by_email = {i["email"]: i for i in items}
    assert by_email[ENV_ADMIN]["env_managed"] is True
    assert by_email["me@example.com"]["env_managed"] is False
    assert all("password_hash" not in i for i in items)


def test_invite_new_email_creates_admin_and_sends_single_use_link(env):
    r = env.client.post("/api/admin-auth/admins", json={"email": "New@Example.com", "name": "New Admin"})
    body = r.json()
    assert r.status_code == 200 and body["invited"] is True and body["email_sent"] is True
    assert body["invite_link"] is None  # link is only returned when email can't be sent
    user = next(u for u in env.users.docs if u["email"] == "new@example.com")
    assert user["is_admin"] is True and "password_hash" not in user
    tok = env.tokens.docs[0]
    assert tok["purpose"] == "admin_invite" and tok["token_hash"] != env.sent[0]["token"]
    assert env.audit[-1][:2] == ("create", "admin")


def test_promote_existing_user(env):
    env.users.docs.append({"_id": "u1", "email": "user@example.com", "is_admin": False})
    r = env.client.post("/api/admin-auth/admins", json={"email": "user@example.com"})
    assert r.status_code == 200 and r.json()["invited"] is True
    assert env.users.docs[-1]["is_admin"] is True
    assert env.audit[-1][:2] == ("update", "admin")


def test_reinvite_invalidates_previous_link(env):
    env.client.post("/api/admin-auth/admins", json={"email": "again@example.com"})
    env.client.post("/api/admin-auth/admins", json={"email": "again@example.com"})
    live = [t for t in env.tokens.docs if t["used_at"] is None]
    assert len(env.sent) == 2 and len(live) == 1


def test_existing_admin_with_password_conflicts(env):
    r = env.client.post("/api/admin-auth/admins", json={"email": "me@example.com"})
    assert r.status_code == 409


def test_invite_link_returned_when_email_fails(env, monkeypatch):
    async def failing_send(email, raw, inviter):
        return False, "http://site/admin/reset-password?token=abc&invite=1"

    monkeypatch.setattr(routes_admin_auth, "_send_admin_invite", failing_send)
    body = env.client.post("/api/admin-auth/admins", json={"email": "nomail@example.com"}).json()
    assert body["email_sent"] is False and body["invite_link"].endswith("invite=1")


def test_remove_admin_and_guards(env):
    env.users.docs.append({"_id": "u2", "email": "two@example.com", "is_admin": True})
    env.tokens.docs.append({"_id": "t", "user_id": "u2", "used_at": None})
    assert env.client.delete("/api/admin-auth/admins/me").status_code == 400  # self
    assert env.client.delete("/api/admin-auth/admins/owner").status_code == 400  # env-managed
    assert env.client.delete("/api/admin-auth/admins/missing").status_code == 404
    assert env.client.delete("/api/admin-auth/admins/u2").status_code == 200
    assert env.users.docs[-1]["is_admin"] is False
    assert env.tokens.docs[0]["used_at"] is not None  # pending invite links die with access
    assert env.audit[-1][:2] == ("delete", "admin")


def test_cannot_remove_last_admin(env):
    env.users.docs[:] = [dict(ME), {"_id": "u3", "email": "three@example.com", "is_admin": True}]
    env.users.docs[0]["is_admin"] = False  # caller is allowed via ADMIN_EMAILS-style access only
    assert env.client.delete("/api/admin-auth/admins/u3").status_code == 400


# ---------- Hive proposals ----------

@pytest.fixture
def hive(monkeypatch):
    coll = FakeCol()
    applied = []

    async def fake_apply(**kw):
        applied.append(kw)
        return {"ok": True, "version": kw.get("proposed_version")}

    monkeypatch.setattr(routes_hive_learning, "db", {"hive_proposals": coll})
    monkeypatch.setattr(routes_hive_learning, "apply_prompt_edit", fake_apply)
    app.dependency_overrides[get_current_admin_flex] = lambda: dict(ME)
    yield SimpleNamespace(client=TestClient(app), coll=coll, applied=applied)
    app.dependency_overrides.pop(get_current_admin_flex, None)


def _proposal(kind="prompt_edit", status="proposed"):
    return {"_id": ObjectId(), "kind": kind, "status": status, "ts": "2026-10-13T00:00:00Z",
            "payload": {"agent_id": "visa", "new_system": "be helpful", "proposed_version": 3, "applied": False}}


def test_proposals_list_exposes_id(hive):
    p = _proposal()
    hive.coll.docs.append(p)
    items = hive.client.get("/api/hive/learning/proposals").json()["items"]
    assert items[0]["id"] == str(p["_id"]) and "_id" not in items[0]


def test_approve_applies_once(hive):
    p = _proposal()
    hive.coll.docs.append(p)
    url = f"/api/hive/learning/proposals/{p['_id']}/approve"
    assert hive.client.post(url).status_code == 200
    assert p["status"] == "applied" and p["payload"]["applied"] is True and p["decided_by"] == ME["email"]
    assert hive.applied[0]["agent_id"] == "visa"
    assert hive.client.post(url).status_code == 409
    assert len(hive.applied) == 1


def test_approve_failure_reopens_proposal(hive, monkeypatch):
    async def failing(**kw):
        return {"ok": False, "note": "Agent not found: visa"}

    monkeypatch.setattr(routes_hive_learning, "apply_prompt_edit", failing)
    p = _proposal()
    hive.coll.docs.append(p)
    assert hive.client.post(f"/api/hive/learning/proposals/{p['_id']}/approve").status_code == 400
    assert p["status"] == "proposed"


def test_only_prompt_edits_can_be_approved(hive):
    p = _proposal(kind="new_tool")
    hive.coll.docs.append(p)
    assert hive.client.post(f"/api/hive/learning/proposals/{p['_id']}/approve").status_code == 400


def test_reject_and_bad_ids(hive):
    p = _proposal(kind="new_prompt")
    hive.coll.docs.append(p)
    url = f"/api/hive/learning/proposals/{p['_id']}/reject"
    assert hive.client.post(url).status_code == 200 and p["status"] == "rejected"
    assert hive.client.post(url).status_code == 409
    assert hive.client.post("/api/hive/learning/proposals/not-an-id/reject").status_code == 404


def test_direct_apply_closes_matching_saved_proposal(hive):
    p = _proposal()
    hive.coll.docs.append(p)
    r = hive.client.post("/api/hive/learning/apply",
                         json={"agent_id": "visa", "new_system": "be helpful", "proposed_version": 3})
    assert r.status_code == 200 and p["status"] == "applied"


def test_already_applied_records_are_not_actionable(hive):
    p = _proposal()
    p["payload"]["applied"] = True  # apply log saved before status tracking
    hive.coll.docs.append(p)
    items = hive.client.get("/api/hive/learning/proposals").json()["items"]
    assert items[0]["status"] == "applied"
    assert hive.client.post(f"/api/hive/learning/proposals/{p['_id']}/approve").status_code == 409
    assert hive.client.post(f"/api/hive/learning/proposals/{p['_id']}/reject").status_code == 409
    assert hive.applied == []
