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
    cols = {name: MagicMock() for name in ("visa_rules_agent", "visa_rule_changes", "visa_rule_overrides",
                                           "visa_rule_details")}
    cols["visa_rules_agent"].find_one = AsyncMock(return_value=meta)
    cols["visa_rules_agent"].update_one = AsyncMock()
    cols["visa_rule_changes"].insert_one = AsyncMock()
    cols["visa_rule_changes"].update_one = AsyncMock()
    cols["visa_rule_overrides"].update_one = AsyncMock()
    cols["visa_rule_overrides"].delete_one = AsyncMock()
    cols["visa_rule_details"].update_one = AsyncMock()
    return cols


def _parsed(n_rows, changes):
    reqs = {iso: (code, "x") for iso, code in changes.items()}
    details = {iso: {"allowed_stay": "30 days", "notes": ""} for iso in changes}
    return {"rows": n_rows, "requirements": reqs, "details": details, "unmatched": []}


def _run_patches(cols, parsed):
    from contextlib import ExitStack
    stack = ExitStack()
    stack.enter_context(patch("db.db", cols))
    stack.enter_context(patch.object(agent, "fetch", new=AsyncMock(return_value=parsed)))
    stack.enter_context(patch.object(vr, "refresh_overrides", new=AsyncMock()))
    stack.enter_context(patch("official_times.refresh_all", new=AsyncMock(return_value={})))
    stack.enter_context(patch("slot_monitor.refresh_official_wait_times", new=AsyncMock()))
    stack.enter_context(patch.object(agent, "report", new=AsyncMock()))
    return stack


def test_parse_reads_allowed_stay_and_notes():
    out = agent.parse(_page([("Thailand", "Visa not required")]))
    assert out["details"]["TH"] == {"allowed_stay": "30 days", "notes": ""}


@pytest.mark.asyncio
async def test_every_change_applies_automatically_on_a_good_read():
    many = {iso: vr.E for iso in ["TH", "MY", "QA", "MU", "FJ", "SN", "RW", "JM", "HT", "KZ", "BB"]}
    cols = _db()
    with _run_patches(cols, _parsed(190, many)):
        out = await agent.run(force=True, trigger="admin")
        agent.report.assert_awaited_once()
    assert (out["status"], out["rows"], out["applied"]) == ("ok", 190, 11)
    assert out["summary"] == "Visa rules check: 190 countries read, 11 change(s) applied."
    assert cols["visa_rule_overrides"].update_one.await_count == 11
    assert cols["visa_rule_details"].update_one.await_count == 11
    assert cols["visa_rule_changes"].insert_one.await_args.args[0]["status"] == "applied"


@pytest.mark.asyncio
async def test_bad_read_changes_nothing():
    cols = _db()
    with _run_patches(cols, _parsed(40, {"TH": vr.E})):
        out = await agent.run(force=True)
    assert (out["status"], out["applied"]) == ("parse_suspect", 0)
    assert "only 40 countries" in out["summary"]
    cols["visa_rule_overrides"].update_one.assert_not_awaited()
    cols["visa_rule_details"].update_one.assert_not_awaited()


def test_summary_with_no_changes():
    assert agent.summary({"status": "ok", "rows": 192}, []) == "Visa rules check: 192 countries read, no changes."


@pytest.mark.asyncio
async def test_report_emails_admins():
    with patch("config.ADMIN_EMAILS", {"a@wehive.co.in"}), \
         patch("email_service.send_email", new=AsyncMock(return_value=True)) as mail:
        await agent.report({"status": "ok", "rows": 190},
                           [{"iso2": "TH", "old": vr.F, "new": vr.E, "wording": "eVisa"}])
    to, subject = mail.await_args.args[:2]
    assert to == "a@wehive.co.in" and "190 countries read, 1 change(s)" in subject
    assert "TH: No visa needed -> Apply online (eVisa)" in mail.await_args.kwargs["text_body"]


@pytest.mark.asyncio
async def test_undo_restores_the_previous_rule():
    cols = _db()
    cols["visa_rule_changes"].find_one = AsyncMock(return_value={"_id": "c1", "iso2": "TH", "old": vr.F,
                                                                 "new": vr.E, "status": "applied"})
    with patch("db.db", cols), patch.object(vr, "refresh_overrides", new=AsyncMock()):
        assert await agent.undo("c1") is True
    cols["visa_rule_overrides"].delete_one.assert_awaited_once()  # TH's code default is visa-free
    assert cols["visa_rule_changes"].update_one.await_args.args[1] == {"$set": {"status": "undone"}}


@pytest.mark.asyncio
async def test_runs_once_a_day_and_survives_source_errors():
    cols = _db({"_id": "meta", "last_run_at": datetime.utcnow() - timedelta(hours=2)})
    with patch("db.db", cols):
        assert await agent.run() == {"skipped": "ran recently"}
    cols = _db()
    with patch("db.db", cols), patch.object(agent, "fetch", new=AsyncMock(side_effect=RuntimeError("down"))), \
         patch.object(vr, "refresh_overrides", new=AsyncMock()), patch.object(agent, "report", new=AsyncMock()):
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
