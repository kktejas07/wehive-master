"""notify_user channels/dedupe, appointment & deadline reminders, slot alerts. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import datetime, timedelta, timezone  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402

import notify  # noqa: E402
import reminders  # noqa: E402
import slot_monitor  # noqa: E402


def _aiter(items):
    class _It:
        def __init__(self):
            self._i = iter(items)

        def __aiter__(self):
            return self

        async def __anext__(self):
            try:
                return next(self._i)
            except StopIteration:
                raise StopAsyncIteration
    return _It()


# ------------------------------------------------------------ notify_user

@pytest.fixture
def cols():
    notifications, users = MagicMock(), MagicMock()
    notifications.find_one = AsyncMock(return_value=None)
    notifications.insert_one = AsyncMock()
    with patch("db.notifications_col", notifications), patch("db.users", users):
        yield notifications, users


@pytest.mark.asyncio
async def test_channels_follow_user_preferences(cols):
    notifications, users = cols
    users.find_one = AsyncMock(return_value={"_id": "u1", "email": "a@b.in", "phone": "+919000000000", "notify_whatsapp": True})
    with patch("email_service.send_email", new=AsyncMock(return_value=True)) as mail, \
         patch("otp_providers.deliver_whatsapp_message", new=AsyncMock(return_value={"ok": True})) as wa:
        sent = await notify.notify_user("u1", title="T", body="B", kind="k", link="/x")
    assert sent == {"app": True, "email": True, "whatsapp": True}
    assert mail.await_args.args[0] == "a@b.in"
    assert wa.await_args.args[0] == "+919000000000"
    notifications.insert_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_whatsapp_is_opt_in_and_email_can_be_turned_off(cols):
    _, users = cols
    users.find_one = AsyncMock(return_value={"_id": "u1", "email": "a@b.in", "phone": "+91900", "notify_email": False})
    with patch("email_service.send_email", new=AsyncMock()) as mail, \
         patch("otp_providers.deliver_whatsapp_message", new=AsyncMock()) as wa:
        sent = await notify.notify_user("u1", title="T", body="B", kind="k")
    assert sent == {"app": True}
    mail.assert_not_awaited()
    wa.assert_not_awaited()


@pytest.mark.asyncio
async def test_dedupe_key_sends_once(cols):
    notifications, users = cols
    notifications.find_one = AsyncMock(return_value={"_id": "existing"})
    users.find_one = AsyncMock()
    sent = await notify.notify_user("u1", title="T", body="B", kind="k", dedupe_key="appt:1:1d")
    assert sent == {"skipped": "already sent"}
    notifications.insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_email_failure_does_not_raise(cols):
    _, users = cols
    users.find_one = AsyncMock(return_value={"_id": "u1", "email": "a@b.in"})
    with patch("email_service.send_email", new=AsyncMock(side_effect=RuntimeError("smtp down"))):
        sent = await notify.notify_user("u1", title="T", body="B", kind="k")
    assert sent == {"app": True, "email": False}


# ------------------------------------------------------------ reminders

NOW = datetime(2026, 11, 1, 6, 0, tzinfo=timezone.utc)  # 11:30 IST


def test_due_window_picks_the_nearest_window_only():
    appt = NOW + timedelta(hours=20)
    assert reminders.due_window(appt, NOW, reminders.APPOINTMENT_WINDOWS) == "1d"  # not also 7d
    assert reminders.due_window(NOW + timedelta(days=6), NOW, reminders.APPOINTMENT_WINDOWS) == "7d"
    assert reminders.due_window(NOW + timedelta(days=9), NOW, reminders.APPOINTMENT_WINDOWS) is None
    assert reminders.due_window(NOW - timedelta(hours=1), NOW, reminders.APPOINTMENT_WINDOWS) is None


def test_appointment_time_is_ist():
    at = reminders.parse_appointment({"date": "2026-11-02", "time": "09:00"})
    assert at == datetime(2026, 11, 2, 3, 30, tzinfo=timezone.utc)
    assert reminders.parse_appointment({"date": "soon"}) is None


@pytest.mark.asyncio
async def test_send_due_reminders():
    app = {
        "_id": "app1", "user_id": "u1", "status": "appointment_scheduled",
        "visa_appointment": {"date": "2026-11-02", "time": "09:00", "embassy": "US Consulate", "city": "Hyderabad"},
        "university_selections": [
            {"university_id": "asu", "university": {"name": "Arizona State University"}, "status": "draft", "deadline": "2026-11-03"},
            {"university_id": "mit", "status": "applied", "deadline": "2026-11-02"},  # already submitted: no reminder
        ],
    }
    db = {"applications": MagicMock()}
    db["applications"].find.return_value.limit.return_value = _aiter([app])
    with patch.object(reminders, "notify_user", new=AsyncMock(return_value={"app": True})) as nu:
        sent = await reminders.send_due_reminders(db, now=NOW)
    assert sent == 2
    calls = [c.kwargs for c in nu.await_args_list]
    assert calls[0]["title"] == "Visa appointment tomorrow"
    assert "US Consulate, Hyderabad" in calls[0]["body"]
    assert calls[0]["dedupe_key"] == "appt:app1:2026-11-02T09:00:1d"
    assert calls[1]["title"] == "Application deadline in 3 days"
    assert "Arizona State University" in calls[1]["body"]


# ------------------------------------------------------------ slot alerts

@pytest.mark.asyncio
async def test_slot_alerts_match_subscriptions_and_mark_reports():
    reports = [
        {"_id": "r1", "consulate": "hyderabad", "visa_type": "f1", "date": "2099-01-10", "source": "telegram_channel"},
        {"_id": "r2", "consulate": "delhi", "visa_type": "f1", "date": "2099-01-11", "source": "telegram_channel"},
    ]
    slots, subs = MagicMock(), MagicMock()
    slots.find.return_value.to_list = AsyncMock(return_value=reports)
    slots.update_many = AsyncMock()
    subs.find.return_value = _aiter([
        {"user_id": "u1", "consulates": ["hyderabad"], "visa_types": ["f1"]},
        {"user_id": "u2", "consulates": ["mumbai"], "visa_types": ["f1"]},
    ])
    with patch("db.usvisa_slots_col", slots), patch("db.usvisa_subscriptions_col", subs), \
         patch("notify.notify_user", new=AsyncMock(return_value={"app": True})) as nu:
        alerted = await slot_monitor.dispatch_slot_alerts()
    assert alerted == 1
    assert nu.await_args.args[0] == "u1"
    assert "Hyderabad" in nu.await_args.kwargs["body"] and "2099-01-10" in nu.await_args.kwargs["body"]
    assert slots.find.call_args.args[0]["source"] == "telegram_channel"  # estimates never alert
    marked = slots.update_many.await_args.args[0]["_id"]["$in"]
    assert sorted(marked) == ["r1", "r2"]


@pytest.mark.asyncio
async def test_no_reports_no_alerts():
    slots = MagicMock()
    slots.find.return_value.to_list = AsyncMock(return_value=[])
    with patch("db.usvisa_slots_col", slots), patch("notify.notify_user", new=AsyncMock()) as nu:
        assert await slot_monitor.dispatch_slot_alerts() == 0
    nu.assert_not_awaited()
