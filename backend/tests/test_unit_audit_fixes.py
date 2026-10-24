"""Regression tests for bugs found in the Oct 2026 audit. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routes_visa_scheduling  # noqa: E402
from auth_utils import get_current_user  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_rate_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_DISABLED", "1")


@pytest.fixture
def as_user():
    app.dependency_overrides[get_current_user] = lambda: {"_id": "u1", "name": "Test"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


@patch("ai_marketplace.marketplace.chat", new_callable=AsyncMock, return_value="Bonjour")
def test_gen_ai_calls_marketplace_with_its_real_signature(chat, as_user):
    r = client.post("/api/gen/translate", json={"text": "Hello", "source_lang": "en", "target_lang": "fr"})
    assert r.status_code == 200, r.text
    assert r.json()["translated"] == "Bonjour"
    kwargs = chat.call_args.kwargs
    assert kwargs["user_id"] == "u1" and kwargs["user_prompt"] == "Hello"
    assert "messages" not in kwargs and "temperature" not in kwargs


def test_slot_data_requires_sign_in():
    assert client.get("/api/usvisa/slots").status_code == 401
    assert client.get("/api/usvisa/slots/summary").status_code == 401


def test_referral_reward_is_not_open_to_any_user(as_user):
    assert client.post("/api/referrals/reward?referred_user_id=someone").status_code in (401, 403)


@patch.object(routes_visa_scheduling, "db")
def test_slot_booking_is_claimed_atomically(db, as_user):
    db.applications.find_one = AsyncMock(return_value={"_id": "app1"})
    db.applications.update_one = AsyncMock()
    db.visa_slots.find_one_and_update = AsyncMock(return_value=None)  # someone else took it
    db.visa_slots.update_one = AsyncMock()
    db.visa_slots.find_one = AsyncMock(return_value={"_id": "s1"})
    r = client.post("/api/visa-scheduling/book", json={
        "application_id": "app1", "slot_id": "s1", "date": "2026-11-02", "time": "09:00",
        "embassy": "US Consulate", "city": "Hyderabad",
    })
    assert r.status_code == 400
    filt = db.visa_slots.find_one_and_update.call_args.args[0]
    assert filt["booked"] is False  # the claim itself checks the slot is still free
    db.visa_slots.update_one.assert_not_called()
    db.applications.update_one.assert_not_called()
