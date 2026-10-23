"""Live notification push (stream tickets, publish) and the security-pass restrictions. No network."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

import asyncio  # noqa: E402
import json  # noqa: E402
from datetime import datetime  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routes_notifications as rn  # noqa: E402
from auth_utils import get_current_user  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)


@pytest.fixture
def as_user():
    app.dependency_overrides[get_current_user] = lambda: {"_id": "u1"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_ticket_requires_sign_in():
    assert client.post("/api/notifications/stream-ticket").status_code == 401


def test_ticket_is_single_use(as_user):
    ticket = client.post("/api/notifications/stream-ticket").json()["ticket"]
    assert rn._stream_tickets[ticket][0] == "u1"
    rn._stream_tickets.pop(ticket)  # what the stream does on first use
    app.dependency_overrides.pop(get_current_user, None)
    with client.stream("GET", f"/api/notifications/stream?ticket={ticket}") as r:
        first = next(r.iter_lines())
    assert "auth_required" in first


def test_publish_reaches_every_open_tab():
    q1, q2 = asyncio.Queue(), asyncio.Queue()
    rn._notif_subscribers["u9"] = {q1, q2}
    try:
        rn.publish("u9", {"_id": "n1", "title": "Visa appointment tomorrow", "created_at": datetime(2026, 11, 1)})
        for q in (q1, q2):
            notif = json.loads(q.get_nowait())["notif"]
            assert notif["id"] == "n1" and notif["created_at"] == "2026-11-01T00:00:00"
    finally:
        rn._notif_subscribers.pop("u9", None)


def test_publish_without_subscribers_is_a_no_op():
    rn.publish("nobody", {"_id": "n1"})  # must not raise


@pytest.mark.parametrize("path", [
    "/api/models/circuit-breaker", "/api/models/mcp/tools", "/api/models/mcp/status",
    "/api/ai/status", "/api/ai/providers", "/api/agentic/status",
])
def test_internal_status_endpoints_are_admin_only(path):
    assert client.get(path).status_code in (401, 403)


@pytest.mark.parametrize("path", ["/api/models/profiles", "/api/models/byok/providers"])
def test_model_lists_need_sign_in(path):
    assert client.get(path).status_code == 401
