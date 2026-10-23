"""Visa Rules Agent (daily requirement check) and 12-hour auto-publishing. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import datetime, timedelta  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402

import official_times  # noqa: E402,F401  (loaded before db is patched)
import routes_agents_ai  # noqa: E402
import slot_monitor  # noqa: E402,F401
import visa_rules as vr  # noqa: E402
from agents import visa_rules_agent as agent  # noqa: E402


@pytest.fixture(autouse=True)
def _no_overrides():
    vr._OVERRIDES = {}
    yield
    vr._OVERRIDES = {}


@pytest.mark.parametrize("wording,code", [
    ("Visa not required", vr.F), ("Freedom of movement", vr.F), ("Visa not required / eVisa", vr.F),
    ("eVisa", vr.E), ("Online Visa", vr.E), ("Electronic Travel Authorisation", vr.E),
    ("eVisa / Visa on arrival", vr.EA), ("e-VOA / Visa on Arrival", vr.EA),
    ("Visa on arrival", vr.A), ("Free Visa on arrival", vr.A), ("Entry permit on arrival", vr.A),
    ("Visa required", vr.V), ("Admission restricted", vr.R), ("See details", None),
])
def test_classify_wording(wording, code):
    assert agent.classify_text(wording) == code


def _page(rows):
    body = "".join(f"<tr><td><span class='flagicon'></span> <a>{c}</a></td><td>{r}<sup>[1]</sup></td>"
                   f"<td>30 days</td><td></td></tr>" for c, r in rows)
    return ("<html><table class='wikitable sortable'><tr><th>Country</th><th>Visa requirement</th>"
            f"<th>Allowed stay</th><th>Notes</th></tr>{body}</table></html>")


def test_parse_maps_names_and_strips_footnotes():
    out = agent.parse(_page([("Thailand", "Visa not required"), ("Czech Republic", "Visa required"),
                             ("Australia and territories", "Online Visa required"), ("Atlantis", "eVisa")]))
    assert out["requirements"]["TH"] == (vr.F, "Visa not required")
    assert out["requirements"]["CZ"][0] == vr.V
    assert "AU" in out["requirements"] and out["unmatched"] == ["Atlantis"]


def test_diff_ignores_pinned_and_unchanged():
    parsed = agent.parse(_page([("Thailand", "eVisa"), ("Australia and territories", "Online Visa"),
                                ("Japan", "eVisa")]))
    changes = agent.diff(parsed)
    assert changes == [{"iso2": "TH", "old": vr.F, "new": vr.E, "wording": "eVisa"}]  # AU pinned, JP unchanged


def _db(meta=None):
    cols = {name: MagicMock() for name in ("visa_rules_agent", "visa_rule_changes", "visa_rule_overrides")}
    cols["visa_rules_agent"].find_one = AsyncMock(return_value=meta)
    cols["visa_rules_agent"].update_one = AsyncMock()
    cols["visa_rule_changes"].insert_one = AsyncMock()
    cols["visa_rule_overrides"].update_one = AsyncMock()
    return cols


def _parsed(n_rows, changes):
    reqs = {iso: (code, "x") for iso, code in changes.items()}
    return {"rows": n_rows, "requirements": reqs, "unmatched": []}


@pytest.mark.asyncio
async def test_small_healthy_change_set_applies_automatically():
    cols = _db()
    with patch("db.db", cols), patch.object(agent, "fetch", new=AsyncMock(return_value=_parsed(190, {"TH": vr.E}))), \
         patch.object(vr, "refresh_overrides", new=AsyncMock()), \
         patch("official_times.refresh_all", new=AsyncMock(return_value={})), \
         patch("slot_monitor.refresh_official_wait_times", new=AsyncMock()):
        out = await agent.run(force=True)
    assert (out["status"], out["applied"], out["held"]) == ("ok", 1, 0)
    cols["visa_rule_overrides"].update_one.assert_awaited_once()
    assert cols["visa_rule_changes"].insert_one.await_args.args[0]["status"] == "applied"


@pytest.mark.asyncio
async def test_large_or_suspicious_runs_are_held_for_review():
    many = {iso: vr.E for iso in ["TH", "MY", "QA", "MU", "FJ", "SN", "RW", "JM", "HT", "KZ", "BB"]}
    for rows, changes in ((190, many), (40, {"TH": vr.E})):
        cols = _db()
        with patch("db.db", cols), patch.object(agent, "fetch", new=AsyncMock(return_value=_parsed(rows, changes))), \
             patch.object(vr, "refresh_overrides", new=AsyncMock()), \
             patch("official_times.refresh_all", new=AsyncMock(return_value={})), \
             patch("slot_monitor.refresh_official_wait_times", new=AsyncMock()):
            out = await agent.run(force=True)
        assert out["applied"] == 0 and out["held"] == len(changes)
        cols["visa_rule_overrides"].update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_runs_once_a_day_and_survives_source_errors():
    cols = _db({"_id": "meta", "last_run_at": datetime.utcnow() - timedelta(hours=2)})
    with patch("db.db", cols):
        assert await agent.run() == {"skipped": "ran recently"}
    cols = _db()
    with patch("db.db", cols), patch.object(agent, "fetch", new=AsyncMock(side_effect=RuntimeError("down"))), \
         patch.object(vr, "refresh_overrides", new=AsyncMock()):
        out = await agent.run(force=True)
    assert out["status"] == "source_error"
    cols["visa_rule_overrides"].update_one.assert_not_awaited()


def test_site_uses_agent_overrides():
    assert vr.processing("TH")["requirement"] == vr.F
    vr._OVERRIDES = {"TH": vr.E}
    assert vr.processing("TH")["requirement"] == vr.E


@pytest.mark.asyncio
async def test_unreviewed_items_publish_after_12_hours():
    cols = {name: MagicMock() for name in ("global_news_col", "global_blogs_col", "global_events_col")}
    for col in cols.values():
        col.update_many = AsyncMock(return_value=MagicMock(modified_count=2))
    with patch.multiple("db", **cols):
        out = await routes_agents_ai.publish_overdue()
    assert out == {"news": 2, "blogs": 2, "events": 2}
    filt, upd = cols["global_events_col"].update_many.await_args.args
    assert filt["status"] == "pending" and upd["$set"]["status"] == "approved"
    age = datetime.utcnow() - filt["created_at"]["$lte"]
    assert timedelta(hours=11, minutes=59) < age < timedelta(hours=12, minutes=1)
