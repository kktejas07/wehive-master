"""IRCC (Canada) and GOV.UK (UK) official processing times, the official_times
registry and display overlay. No network, no real DB."""

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

import official_times  # noqa: E402
import slot_monitor  # noqa: E402
from adapters import govuk_processing_times as govuk  # noqa: E402
from adapters import ircc_processing_times as ircc  # noqa: E402

# Shape of canada.ca data-ptime-en.json; India values as published 21 Oct 2026.
IRCC = {
    "visitor-outside-canada": {"IN": "29 days", "US": "16 days", "lastupdated": "October 21, 2026"},
    "study": {"IN": "8 weeks", "lastupdated": "October 21, 2026"},
    "work": {"IN": "10 weeks", "lastupdated": "October 21, 2026"},
    "refugees_gov": {"IN": "Not enough data", "lastupdated": "October 21, 2026"},
}


def test_ircc_parse_india():
    data = ircc.parse(IRCC)
    assert data == {"updated": "October 21, 2026",
                    "visa": {"visitor_ca": "29 days", "student_ca": "8 weeks", "work_ca": "10 weeks"}}


def test_ircc_skips_not_enough_data():
    data = ircc.parse({"study": {"IN": "Not enough data", "lastupdated": "x"}})
    assert data["visa"] == {}


GOVUK_TABLE = {
    "public_updated_at": "2026-09-30T10:00:00.000+01:00",
    "details": {"body": """
<h2>Visit</h2><table><tr><th>Visa</th><th>Processing time</th></tr>
<tr><td>Standard Visitor</td><td>3 weeks</td></tr><tr><td>Marriage Visitor</td><td>3 weeks</td></tr></table>
<h2>Study</h2><table><tr><td>Child Student</td><td>3 weeks</td></tr><tr><td>Student</td><td>3 weeks</td></tr></table>
<h2>Work</h2><table><tr><td>Skilled Worker</td><td>3 weeks</td></tr><tr><td>British National (Overseas)</td><td>12 weeks</td></tr></table>"""},
}


def test_govuk_parse_table():
    assert govuk.parse(GOVUK_TABLE) == {
        "updated": "2026-09-30",
        "visa": {"visitor_uk": "3 weeks", "student_uk": "3 weeks", "work_uk": "3 weeks"},
    }


def test_govuk_parse_prose_and_child_student_not_confused():
    content = {"details": {"body": "<ul><li>Child Student: 8 weeks</li><li>Student: 3 weeks</li>"
                                   "<li>Standard Visitor - 3 weeks</li></ul>"}}
    visa = govuk.parse(content)["visa"]
    assert visa["student_uk"] == "3 weeks" and visa["visitor_uk"] == "3 weeks"
    assert "work_uk" not in visa


@pytest.mark.asyncio
async def test_refresh_stores_and_keeps_last_good_on_failure():
    col = MagicMock()
    col.find_one = AsyncMock(return_value=None)
    col.update_one = AsyncMock()
    sources = {
        "canada": {**official_times.SOURCES["canada"], "fetch": AsyncMock(return_value=ircc.parse(IRCC))},
        "uk": {**official_times.SOURCES["uk"], "fetch": AsyncMock(side_effect=RuntimeError("down"))},
    }
    with patch.object(official_times, "_col", return_value=col), patch.object(official_times, "SOURCES", sources):
        out = await official_times.refresh_all()
    assert out == {"canada": "ok", "uk": "error"}
    (key, update), _ = col.update_one.call_args
    assert key == {"_id": "canada"} and update["$set"]["visa"]["student_ca"] == "8 weeks"


@pytest.mark.asyncio
async def test_refresh_skips_fresh_sources():
    col = MagicMock()
    col.find_one = AsyncMock(return_value={"fetched_at": datetime.utcnow(), "visa": {"x": "1 day"}})
    fetch = AsyncMock()
    sources = {"canada": {**official_times.SOURCES["canada"], "fetch": fetch}}
    with patch.object(official_times, "_col", return_value=col), patch.object(official_times, "SOURCES", sources):
        assert await official_times.refresh_all() == {"canada": "fresh"}
    fetch.assert_not_awaited()


@pytest.mark.asyncio
async def test_canada_display_uses_official_for_every_centre():
    col = MagicMock()
    col.find_one = AsyncMock(return_value={"visa": {"visitor_ca": "29 days", "student_ca": "8 weeks"},
                                           "updated": "October 21, 2026"})
    with patch.object(official_times, "_col", return_value=col):
        official = await slot_monitor.load_official_for("canada")
    assert official["source_name"] == ircc.SOURCE_NAME and official["metric"] == "processing_time"
    display = slot_monitor.get_wait_times_for_display("canada", official)
    for centre in display.values():  # same national figure at Delhi, Mumbai, Chennai
        assert centre["source"] == "official" and centre["updated"] == "October 21, 2026"
        assert centre["wait_times"]["visitor_ca"] == {"visa": centre["wait_times"]["visitor_ca"]["visa"],
                                                      "wait": "29 days", "estimate": False}


@pytest.mark.asyncio
async def test_no_official_source_means_estimates():
    assert await slot_monitor.load_official_for("thailand") is None
    display = slot_monitor.get_wait_times_for_display("uk", {"posts": {"mumbai": {"visitor_uk": "3 weeks"}}})
    assert display["mumbai"]["wait_times"]["visitor_uk"]["estimate"] is False
    assert display["mumbai"]["wait_times"]["work_uk"]["estimate"] is True  # not covered -> estimate, flagged
