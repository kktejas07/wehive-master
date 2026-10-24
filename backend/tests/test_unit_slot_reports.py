"""Ireland official times, per-country subscriptions, processing-time drop alerts
and user-reported slots. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import date, timedelta  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import official_times  # noqa: E402
import routes_slot_monitor as rsm  # noqa: E402
import slot_monitor  # noqa: E402
from adapters import ireland_processing_times as ie  # noqa: E402
from admin_auth import get_current_admin_flex  # noqa: E402
from auth_utils import get_current_user  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)

# Layout of the Embassy of Ireland, New Delhi page ("Update: 17 September 2026").
IE_PAGE = """<html><body><p>Update: 17 September 2026</p><table>
<tr><th>Visa category</th><th>Sub-category</th><th>First instance</th><th>Appeal</th></tr>
<tr><td>Employment</td><td>Category A</td><td>4-6 weeks</td><td>6 calendar months</td></tr>
<tr><td></td><td>Category B</td><td>8-10 weeks</td><td>6 calendar months</td></tr>
<tr><td>Join Family</td><td></td><td>6-12 months</td><td>12 calendar months</td></tr>
<tr><td>Study</td><td></td><td>4-8 weeks</td><td>6 calendar months</td></tr>
<tr><td>Business / Conference / Event</td><td></td><td>4 weeks</td><td>N/A</td></tr>
<tr><td>Visit (short stay)</td><td></td><td>6-8 weeks</td><td>N/A</td></tr>
</table></body></html>"""


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


@pytest.fixture(autouse=True)
def _no_rate_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_DISABLED", "1")


@pytest.fixture
def as_user():
    app.dependency_overrides[get_current_user] = lambda: {"_id": "u1", "name": "Priya"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def as_admin():
    app.dependency_overrides[get_current_admin_flex] = lambda: {"_id": "admin"}
    yield
    app.dependency_overrides.pop(get_current_admin_flex, None)


# ------------------------------------------------------------ Ireland

def test_ireland_parse():
    assert ie.parse(IE_PAGE) == {"updated": "17 September 2026",
                                 "visa": {"visitor_ie": "6-8 weeks", "student_ie": "4-8 weeks"}}


def test_ireland_is_a_registered_corridor_without_invented_figures():
    assert "ireland" in official_times.SOURCES and "ireland" in slot_monitor.CORRIDORS
    display = slot_monitor.get_wait_times_for_display("ireland")
    assert display["india"]["wait_times"]["student_ie"]["wait"] == "N/A"


@pytest.mark.parametrize("value,days", [("29 days", 29), ("8 weeks", 56), ("6-8 weeks", 49),
                                        ("2 months", 60), ("3 weeks", 21), ("N/A", None)])
def test_to_days(value, days):
    assert official_times.to_days(value) == days


# ------------------------------------------------------------ drop alerts (non-US)

@pytest.mark.asyncio
async def test_processing_time_drop_alerts_country_subscribers():
    col = MagicMock()
    col.find_one = AsyncMock(return_value={"visa": {"student_ca": "12 weeks", "visitor_ca": "30 days"},
                                           "updated": "October 14, 2026"})
    col.update_one = AsyncMock()
    subs = MagicMock()
    subs.find.return_value = _aiter([{"user_id": "u1", "country": "canada", "visa_types": ["student_ca"]}])
    new = {"updated": "October 21, 2026", "visa": {"student_ca": "8 weeks", "visitor_ca": "29 days"}}
    sources = {"canada": {**official_times.SOURCES["canada"], "fetch": AsyncMock(return_value=new)}}
    with patch.object(official_times, "_col", return_value=col), patch.object(official_times, "SOURCES", sources), \
         patch("db.usvisa_subscriptions_col", subs), \
         patch("notify.notify_user", new=AsyncMock(return_value={"app": True})) as nu:
        await official_times.refresh_all(force=True)
    assert subs.find.call_args.args[0] == {"country": "canada"}
    nu.assert_awaited_once()
    assert "Student Permit: now 8 weeks (was 12 weeks)" in nu.await_args.kwargs["body"]  # visitor 30->29 is too small


# ------------------------------------------------------------ per-country subscriptions

def test_subscribe_per_country_validates_ids(as_user):
    with patch.object(rsm, "usvisa_subscriptions_col") as col:
        col.delete_many = AsyncMock()
        col.insert_one = AsyncMock()
        r = client.post("/api/usvisa/subscribe", json={"country": "canada", "visa_types": ["student_ca", "b1b2"],
                                                       "consulates": ["delhi", "hyderabad"]})
        assert r.status_code == 200
        doc = col.insert_one.await_args.args[0]
        assert doc["country"] == "canada" and doc["visa_types"] == ["student_ca"] and doc["consulates"] == ["delhi"]
        assert client.post("/api/usvisa/subscribe", json={"country": "mars", "visa_types": ["x"],
                                                          "consulates": ["y"]}).status_code == 400


def test_us_subscription_includes_older_subscriptions_without_country():
    assert rsm._sub_filter("u1", "usa") == {"user_id": "u1", "$or": [{"country": "usa"}, {"country": {"$exists": False}}]}
    assert rsm._sub_filter("u1", "uk") == {"user_id": "u1", "country": "uk"}


# ------------------------------------------------------------ user slot reports

def _report(**kw):
    body = {"country": "usa", "consulate": "hyderabad", "visa_type": "f1",
            "date": (date.today() + timedelta(days=20)).isoformat(), "note": "2 slots at 10:00"}
    body.update(kw)
    return body


def test_report_is_held_for_review(as_user):
    with patch.object(rsm, "usvisa_slots_col") as col:
        col.insert_one = AsyncMock()
        r = client.post("/api/usvisa/reports", json=_report())
        assert r.status_code == 201
        doc = col.insert_one.await_args.args[0]
        assert doc["status"] == "pending" and doc["source"] == "user_report" and doc["notified"] is False
        assert doc["city"] == "Hyderabad" and doc["reported_by"] == "u1"


@pytest.mark.parametrize("bad,code", [
    ({"consulate": "london"}, 400),
    ({"date": (date.today() - timedelta(days=1)).isoformat()}, 400),
    ({"note": "call me +91 90007 34326"}, 400),
    ({"country": "ireland", "consulate": "india", "visa_type": "f1"}, 400),
])
def test_report_validation(as_user, bad, code):
    with patch.object(rsm, "usvisa_slots_col") as col:
        col.insert_one = AsyncMock()
        assert client.post("/api/usvisa/reports", json=_report(**bad)).status_code == code
        col.insert_one.assert_not_awaited()


def test_reports_require_sign_in_and_review_requires_admin():
    assert client.post("/api/usvisa/reports", json=_report()).status_code == 401
    assert client.get("/api/usvisa/reports/pending").status_code in (401, 403)
    assert client.post("/api/usvisa/reports/r1/approve").status_code in (401, 403)


def test_approving_a_report_alerts_now(as_admin):
    with patch.object(rsm, "usvisa_slots_col") as col, \
         patch("slot_monitor.dispatch_slot_alerts", new=AsyncMock(return_value=3)) as dispatch:
        col.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
        r = client.post("/api/usvisa/reports/r1/approve")
        assert r.status_code == 200 and r.json()["alerted"] == 3
        assert col.update_one.await_args.args[1]["$set"]["status"] == "approved"
    dispatch.assert_awaited_once()


def test_public_slot_list_hides_unreviewed_reports(as_user):
    with patch.object(rsm, "usvisa_slots_col") as col:
        col.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
        client.get("/api/usvisa/slots")
        assert col.find.call_args.args[0]["status"] == {"$nin": ["pending", "rejected"]}


@pytest.mark.asyncio
async def test_user_report_alerts_only_that_countrys_subscribers():
    reports = [{"_id": "r1", "source": "user_report", "status": "approved", "country": "canada",
                "consulate": "delhi", "visa_type": "student_ca", "date": "2099-02-01"}]
    slots, subs = MagicMock(), MagicMock()
    slots.find.return_value.to_list = AsyncMock(return_value=reports)
    slots.update_many = AsyncMock()
    subs.find.return_value = _aiter([
        {"user_id": "us_sub", "consulates": ["delhi"], "visa_types": ["student_ca"]},  # legacy = US
        {"user_id": "ca_sub", "country": "canada", "consulates": ["delhi"], "visa_types": ["student_ca"]},
    ])
    with patch("db.usvisa_slots_col", slots), patch("db.usvisa_subscriptions_col", subs), \
         patch("notify.notify_user", new=AsyncMock(return_value={"app": True})) as nu:
        assert await slot_monitor.dispatch_slot_alerts() == 1
    assert nu.await_args.args[0] == "ca_sub"
    assert nu.await_args.kwargs["title"] == "Canada visa slot reported"
    assert "reported by a WeHive member" in nu.await_args.kwargs["body"]
