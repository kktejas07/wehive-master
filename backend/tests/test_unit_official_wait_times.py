"""US State Department wait-time parser, wait-time drop alerts, source preference,
and OpenWA-only WhatsApp. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import datetime  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402

import otp_providers  # noqa: E402
import slot_monitor  # noqa: E402
from adapters import state_dept_wait_times as sd  # noqa: E402

# Layout of travel.state.gov Global Visa Wait Times (21-OCT-2026), trimmed to a few rows.
PAGE = """<html><body><p>Last updated: 21-OCT-2026</p>
<table>
<tr><th>City/Post</th>
<th>Interview Required (B1/B2) Average wait times</th>
<th>Interview Required (B1/B2) Next available appointment</th>
<th>Interview Required (F,M,J) Next available appointment</th>
<th>Interview Required Petition-Base (H,L,O,P,Q) Next available appointment</th>
<th>Interview Required Crew and Transit (C,D,C1/D) Next available appointment</th></tr>
<tr><td>Abidjan</td><td>NA</td><td>NA</td><td>NA</td><td>NA</td><td>NA</td></tr>
<tr><td>Chennai (Madras)</td><td>7.5 Months</td><td>7.5 months</td><td>3.5 months</td><td>2.5 months</td><td>NA</td></tr>
<tr><td>Hyderabad</td><td>10.5 Months</td><td>10.5 Months</td><td>1 Month</td><td>6.5 Months</td><td>&lt; 0.5 Month</td></tr>
<tr><td>Kolkata</td><td>8.5 Months</td><td>8.5 Months</td><td>2.5 Months</td><td>1 Month</td><td>NA</td></tr>
<tr><td>Mumbai (Bombay)</td><td>12.5 Months</td><td>12 Months</td><td>4 Months</td><td>2 Months</td><td>1.5 Months</td></tr>
<tr><td>New Delhi</td><td>7 Months</td><td>11 Months</td><td>3 Months</td><td>3.5 Months</td><td>3 Months</td></tr>
<tr><td>New Orleans</td><td>1 Month</td><td>1 Month</td><td>1 Month</td><td>1 Month</td><td>NA</td></tr>
</table></body></html>"""


def test_parse_official_page():
    data = sd.parse(PAGE)
    assert data["updated"] == "21-OCT-2026"
    assert set(data["posts"]) == {"chennai", "hyderabad", "kolkata", "mumbai", "delhi"}
    hyd = data["posts"]["hyderabad"]
    assert hyd["b1b2"] == "10.5 Months"  # next available, not the average column
    assert hyd["f1"] == hyd["j1"] == "1 Month"
    assert hyd["h1b"] == hyd["l1"] == "6.5 Months"
    assert data["posts"]["delhi"]["b1b2"] == "11 Months"  # differs from its average (7)


def test_parse_finds_columns_by_header_not_position():
    reordered = PAGE.replace(
        "<th>Interview Required (B1/B2) Average wait times</th>\n", "",
    ).replace("<td>Hyderabad</td><td>10.5 Months</td>", "<td>Hyderabad</td>")
    assert sd.parse(reordered)["posts"]["hyderabad"]["f1"] == "1 Month"


def test_parse_unrecognised_page_returns_nothing():
    assert sd.parse("<html><table><tr><td>Maintenance</td></tr></table></html>")["posts"] == {}


@pytest.mark.parametrize("value,days", [
    ("10.5 Months", 315), ("1 Month", 30), ("< 0.5 Month", 15), ("12 Days", 12),
    ("Same Day", 0), ("NA", None), ("", None),
])
def test_wait_days(value, days):
    assert sd.wait_days(value) == days


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


@pytest.mark.asyncio
async def test_refresh_alerts_only_real_drops():
    previous = {  # last month's stored figures
        "hyderabad:f1": {"value": "3.5 Months", "days": 105, "updated": "21-SEP-2026"},  # -> 1 Month: drop
        "mumbai:f1": {"value": "4.5 Months", "days": 135, "updated": "21-SEP-2026"},  # -> 4 Months: too small
    }
    col = MagicMock()
    col.find_one = AsyncMock(side_effect=lambda q: {"_id": "meta"} if q["_id"] == "meta" else previous.get(q["_id"]))
    col.update_one = AsyncMock()
    subs = MagicMock()
    subs.find.return_value = _aiter([
        {"user_id": "u1", "consulates": ["hyderabad", "mumbai"], "visa_types": ["f1"]},
        {"user_id": "u2", "consulates": ["chennai"], "visa_types": ["f1"]},
    ])
    with patch.object(sd, "fetch", new=AsyncMock(return_value=sd.parse(PAGE))), \
         patch("db.db", {"usvisa_official_waits": col}), \
         patch("db.usvisa_subscriptions_col", subs), \
         patch("notify.notify_user", new=AsyncMock(return_value={"app": True})) as nu:
        out = await slot_monitor.refresh_official_wait_times(force=True)
    assert out["drops"] == 1 and out["alerted"] == 1
    assert nu.await_args.args[0] == "u1"
    body = nu.await_args.kwargs["body"]
    assert "F1 at Hyderabad: now 1 Month (was 3.5 Months)" in body and "21-OCT-2026" in body


@pytest.mark.asyncio
async def test_refresh_skips_when_fetched_recently():
    col = MagicMock()
    col.find_one = AsyncMock(return_value={"_id": "meta", "fetched_at": datetime.utcnow()})
    with patch("db.db", {"usvisa_official_waits": col}), patch.object(sd, "fetch", new=AsyncMock()) as fetch:
        assert await slot_monitor.refresh_official_wait_times() == {"skipped": "fresh"}
    fetch.assert_not_awaited()


@pytest.mark.asyncio
async def test_official_figures_preferred_over_estimates():
    official = {"updated": "21-OCT-2026", "posts": sd.parse(PAGE)["posts"]}
    with patch.object(slot_monitor, "load_official_wait_times", new=AsyncMock(return_value=official)):
        results, is_estimate, source = await slot_monitor._fetch_wait_times()
    assert (is_estimate, source) == (False, "state_dept")
    assert results["hyderabad"]["f1"] == "1 Month"
    display = slot_monitor.get_wait_times_for_display("usa", official)
    assert display["hyderabad"]["source"] == "state_dept" and not display["hyderabad"]["is_estimate"]
    assert display["hyderabad"]["wait_times"]["f1"]["wait"] == "1 Month"
    # other corridors are unaffected
    assert all(c["is_estimate"] for c in slot_monitor.get_wait_times_for_display("uk", official).values())


@pytest.mark.asyncio
async def test_phone_codes_and_messages_go_through_openwa_only():
    assert not hasattr(otp_providers, "_twilio_client")
    with patch.object(otp_providers, "_send_openwa_whatsapp", new=AsyncMock(return_value=True)) as wa:
        assert await otp_providers.deliver_otp("+919000000000", "phone", "123456") == (True, "whatsapp", False)
        assert await otp_providers.deliver_whatsapp_message("+919000000000", "hi") == {"ok": True, "provider": "openwa"}
    assert wa.await_count == 2
    with patch.object(otp_providers, "_send_openwa_whatsapp", new=AsyncMock(return_value=False)):
        assert (await otp_providers.deliver_whatsapp_message("+919000000000", "hi"))["ok"] is False
