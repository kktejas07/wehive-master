"""Unit tests for DB-dependent modules — admin_analytics, portal_ai, reminder_agent,
audit, eva_tools, agent_loop, storage, ai_marketplace, admin_auth, firebase_utils.

All database/HTTP calls are mocked. Pure logic is tested directly.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.com")

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

import pytest


# ─── Admin Analytics ──────────────────────────────────────────────────────────
from agents.admin_analytics import get_trends, get_revenue_summary, get_agent_performance, get_anomalies


class MockCursor:
    """Minimal async cursor that returns pre-defined results."""
    def __init__(self, items):
        self.items = items
        self._iter = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

    def limit(self, n):
        return self

    def sort(self, *args, **kwargs):
        return self


class TestAdminAnalytics:
    @pytest.mark.asyncio
    async def test_get_trends(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(side_effect=[100, 30, 10, 40])
        result = await get_trends(db, days=30)
        assert result["total_applications"] == 100
        assert result["approval_rate_pct"] == 30.0

    @pytest.mark.asyncio
    async def test_get_trends_zero_total(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(return_value=0)
        result = await get_trends(db, days=30)
        assert result["approval_rate_pct"] == 0

    @pytest.mark.asyncio
    async def test_get_trends_clamps_days(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(return_value=0)
        result = await get_trends(db, days=500)
        assert result["period_days"] == 30

    @pytest.mark.asyncio
    async def test_get_trends_min_days(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(return_value=0)
        result = await get_trends(db, days=0)
        assert result["period_days"] == 30

    @pytest.mark.asyncio
    async def test_get_revenue_summary(self):
        db = MagicMock()
        payments = [
            {"amount_usd": 100, "plan_id": "standard"},
            {"amount_usd": 200, "plan_id": "concierge"},
            {"amount_usd": 50, "plan_id": "lite"},
        ]
        db["payments"].find = MagicMock(return_value=MockCursor(payments))
        result = await get_revenue_summary(db, days=30)
        assert result["total_revenue_usd"] == 350
        assert result["total_payments"] == 3
        assert result["plan_breakdown"]["standard"] == 1

    @pytest.mark.asyncio
    async def test_get_agent_performance(self):
        db = MagicMock()
        agents = [
            {"_id": "a1", "name": "Agent A", "applications_count": 10, "total_revenue": 5000, "tier": "gold"},
        ]
        cur = MockCursor(agents)
        db["agents"].find = MagicMock(return_value=cur)
        db["agent_students"].count_documents = AsyncMock(return_value=5)
        result = await get_agent_performance(db)
        assert len(result) == 1
        assert result[0]["name"] == "Agent A"

    @pytest.mark.asyncio
    async def test_get_anomalies_none(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(return_value=0)
        result = await get_anomalies(db)
        assert result == []

    @pytest.mark.asyncio
    async def test_get_anomalies_high_rejection(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(side_effect=[10, 8, 0])
        result = await get_anomalies(db)
        assert len(result) == 1
        assert result[0]["type"] == "high_rejection_rate"

    @pytest.mark.asyncio
    async def test_get_anomalies_stalled(self):
        db = MagicMock()
        db["applications"].count_documents = AsyncMock(side_effect=[10, 0, 8])
        result = await get_anomalies(db)
        assert any(a["type"] == "stalled_applications" for a in result)


# ─── Portal AI ────────────────────────────────────────────────────────────────
from agents.portal_ai import (
    get_students_needing_attention, get_commission_summary,
    generate_status_update, suggest_next_actions
)


class MockAppCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, *args, **kwargs):
        return self

    def limit(self, n):
        return self

    async def to_list(self, n):
        return self.items[:n]


class TestPortalAI:
    def _make_db(self, agent_students_cursor=None, applications_cursor=None):
        """Create a MagicMock db that properly handles __getitem__ chaining."""
        db = MagicMock()
        store = {}
        if agent_students_cursor is not None:
            m = MagicMock(name='agent_students')
            m.find = MagicMock(return_value=agent_students_cursor)
            m.find_one = AsyncMock()
            store['agent_students'] = m
        if applications_cursor is not None:
            m = MagicMock(name='applications')
            m.find = MagicMock(return_value=applications_cursor)
            store['applications'] = m
        if 'commissions' not in store:
            m = MagicMock(name='commissions')
            m.find = MagicMock(return_value=MockCursor([]))
            store['commissions'] = m
        db.__getitem__ = MagicMock(side_effect=lambda key: store.get(key, MagicMock(name=key)))
        return db, store

    @pytest.mark.asyncio
    async def test_get_students_needing_attention(self):
        db, store = self._make_db(
            agent_students_cursor=MockCursor([
                {"name": "Student A", "email": "s@t.com", "student_id": "s1"},
            ]),
            applications_cursor=MockAppCursor([
                {"status": "draft", "updated_at": datetime.utcnow() - timedelta(days=10)}
            ]),
        )
        result = await get_students_needing_attention(db, "agent1")
        assert len(result) == 1
        assert result[0]["needs_attention"] is True

    @pytest.mark.asyncio
    async def test_get_commission_summary(self):
        db, store = self._make_db(
            agent_students_cursor=MockCursor([]),
            applications_cursor=MockAppCursor([]),
        )
        store['commissions'].find = MagicMock(return_value=MockCursor([
            {"amount": 1000, "status": "paid"},
            {"amount": 500, "status": "pending"},
        ]))
        result = await get_commission_summary(db, "agent1")
        assert result["total_earned"] == 1500
        assert result["paid"] == 1000
        assert result["pending"] == 500

    @pytest.mark.asyncio
    async def test_generate_status_update_student_found(self):
        db, store = self._make_db(
            agent_students_cursor=MockCursor([]),
            applications_cursor=MockAppCursor([
                {"status": "approved", "country_name": "Canada", "visa_type": "Student",
                 "updated_at": datetime.utcnow() - timedelta(days=5)},
            ]),
        )
        store['agent_students'].find_one = AsyncMock(return_value={"name": "Student A", "email": "s@t.com"})
        result = await generate_status_update(db, "agent1", "s@t.com")
        assert "Student A" in result
        assert "Canada" in result

    @pytest.mark.asyncio
    async def test_generate_status_update_no_student(self):
        db, store = self._make_db(
            agent_students_cursor=MockCursor([]),
            applications_cursor=MockAppCursor([]),
        )
        store['agent_students'].find_one = AsyncMock(return_value=None)
        result = await generate_status_update(db, "agent1", "unknown@t.com")
        assert "No student found" in result

    @pytest.mark.asyncio
    async def test_generate_status_update_no_apps(self):
        db, store = self._make_db(
            agent_students_cursor=MockCursor([]),
            applications_cursor=MockAppCursor([]),
        )
        store['agent_students'].find_one = AsyncMock(return_value={"name": "Student A", "email": "s@t.com"})
        result = await generate_status_update(db, "agent1", "s@t.com")
        assert "no applications" in result

    @pytest.mark.asyncio
    async def test_suggest_next_actions(self):
        db, store = self._make_db(
            agent_students_cursor=MockCursor([
                {"name": "Student A", "email": "s@t.com", "student_id": "s1"},
            ]),
            applications_cursor=MockAppCursor([
                {"status": "draft", "updated_at": datetime.utcnow() - timedelta(days=10)}
            ]),
        )
        result = await suggest_next_actions(db, "agent1")
        assert len(result) >= 1


# ─── Reminder Agent ───────────────────────────────────────────────────────────
from agents.reminder_agent import check_pending_appointments, check_expiring_passports, run_all_checks


class TestReminderAgent:
    @pytest.mark.asyncio
    async def test_check_pending_appointments_finds_none(self):
        db = MagicMock()
        db["applications"].find = MagicMock(return_value=MockCursor([]))
        result = await check_pending_appointments(db)
        assert result == []

    @pytest.mark.asyncio
    async def test_check_pending_appointments_finds_some(self):
        db = MagicMock()
        db["applications"].find = MagicMock(return_value=MockCursor([
            {"_id": "app1", "user_id": "u1"},
        ]))
        result = await check_pending_appointments(db)
        assert len(result) == 1
        assert result[0]["type"] == "missed_appointment"

    @pytest.mark.asyncio
    async def test_check_expiring_passports(self):
        db = MagicMock()
        future = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d")
        db["scans"].find = MagicMock(return_value=MockCursor([
            {"user_id": "u1", "kind": "passport", "extracted": {"passport_expiry": future}},
        ]))
        result = await check_expiring_passports(db, db["scans"])
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_check_expiring_passports_ddmmyyyy(self):
        db = MagicMock()
        future = (datetime.utcnow() + timedelta(days=90)).strftime("%d-%m-%Y")
        db["scans"].find = MagicMock(return_value=MockCursor([
            {"user_id": "u1", "kind": "passport", "extracted": {"passport_expiry": future}},
        ]))
        result = await check_expiring_passports(db, db["scans"])
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_check_expiring_passports_no_expiry(self):
        db = MagicMock()
        db["scans"].find = MagicMock(return_value=MockCursor([
            {"user_id": "u1", "kind": "passport", "extracted": {"passport_expiry": None}},
        ]))
        result = await check_expiring_passports(db, db["scans"])
        assert result == []

    @pytest.mark.asyncio
    async def test_check_expiring_passports_bad_date(self):
        db = MagicMock()
        db["scans"].find = MagicMock(return_value=MockCursor([
            {"user_id": "u1", "kind": "passport", "extracted": {"passport_expiry": "not-a-date"}},
        ]))
        result = await check_expiring_passports(db, db["scans"])
        assert result == []

    @pytest.mark.asyncio
    async def test_check_expiring_passports_already_expired(self):
        db = MagicMock()
        past = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        db["scans"].find = MagicMock(return_value=MockCursor([
            {"user_id": "u1", "kind": "passport", "extracted": {"passport_expiry": past}},
        ]))
        result = await check_expiring_passports(db, db["scans"])
        assert result == []

    @pytest.mark.asyncio
    async def test_run_all_checks(self):
        db = MagicMock()
        db["applications"].find = MagicMock(return_value=MockCursor([]))
        db["scans"].find = MagicMock(return_value=MockCursor([]))
        result = await run_all_checks(db)
        assert result == []


# ─── Audit ────────────────────────────────────────────────────────────────────
from audit import _summarize, record, recent, audit_col


class TestAudit:
    def test_summarize_short_value(self):
        assert _summarize("hello") == "hello"

    def test_summarize_long_string(self):
        long_str = "a" * 300
        result = _summarize(long_str)
        assert len(result) == 201  # 200 + "…" (U+2026 is 1 char)
        assert result.endswith("…")

    def test_summarize_long_dict(self):
        big = {"key": "value" * 100}
        result = _summarize(big)
        assert isinstance(result, str)
        assert result.endswith("…")

    def test_summarize_short_dict(self):
        d = {"a": 1}
        assert _summarize(d) == d

    @pytest.mark.asyncio
    async def test_record_inserts(self):
        db_mock = MagicMock()
        audit_col_mock = MagicMock()
        audit_col_mock.insert_one = AsyncMock()
        with patch("audit.audit_col", audit_col_mock):
            await record(
                {"_id": "admin1", "email": "admin@test.com", "name": "Admin"},
                "update", "user", "u1",
                before={"name": "Old"}, after={"name": "New"},
                extra={"reason": "correction"},
            )
            assert audit_col_mock.insert_one.called

    @pytest.mark.asyncio
    async def test_record_exception_swallowed(self):
        audit_col_mock = MagicMock()
        audit_col_mock.insert_one = AsyncMock(side_effect=Exception("DB down"))
        with patch("audit.audit_col", audit_col_mock):
            await record({}, "delete", "user")  # should not raise

    @pytest.mark.asyncio
    async def test_recent_returns_formatted(self):
        audit_col_mock = MagicMock()
        audit_col_mock.find = MagicMock(return_value=MockCursor([
            {"_id": "r1", "at": datetime.utcnow(), "admin_id": "a1",
             "admin_email": "a@t.com", "admin_name": "A",
             "action": "update", "entity_type": "user", "entity_id": "u1",
             "summary": "Updated profile", "diff": {"name": {"from": "Old", "to": "New"}}},
        ]))
        with patch("audit.audit_col", audit_col_mock):
            result = await recent(limit=1)
            assert len(result) == 1
            assert result[0]["id"] == "r1"
            assert isinstance(result[0]["at"], str)


# ─── Eva Tools ────────────────────────────────────────────────────────────────
from shared.eva_tools import lookup_country, search_countries, lookup_university, search_universities
from shared.eva_tools import get_visa_requirements, get_application_fee


class TestEvaTools:
    @pytest.mark.asyncio
    async def test_lookup_country_from_db(self):
        with patch("data.get_country", return_value=None):
            with patch("eva_tools.db") as mock_db:
                mock_db["countries_v2"].find_one = AsyncMock(return_value={"id": "ca", "name": "Canada"})
                result = await lookup_country("ca")
                assert result["name"] == "Canada"

    @pytest.mark.asyncio
    async def test_lookup_country_from_data_module(self):
        with patch("data.get_country", return_value={"id": "us", "name": "USA"}):
            result = await lookup_country("us")
            assert result["name"] == "USA"

    @pytest.mark.asyncio
    async def test_search_countries(self):
        with patch("eva_tools.db") as mock_db:
            mock_db["countries_v2"].find = MagicMock(return_value=MockCursor([
                {"id": "ca", "name": "Canada"},
            ]))
            result = await search_countries("Canada")
            assert len(result) == 1

    @pytest.mark.asyncio
    async def test_lookup_university(self):
        with patch("eva_tools.db") as mock_db:
            mock_db["universities_v2"].find_one = AsyncMock(return_value={"id": "u1", "name": "UBC"})
            result = await lookup_university("u1")
            assert result["name"] == "UBC"

    @pytest.mark.asyncio
    async def test_search_universities(self):
        with patch("eva_tools.db") as mock_db:
            mock_db["universities_v2"].find = MagicMock(return_value=MockCursor([
                {"id": "u1", "name": "UBC"},
            ]))
            result = await search_universities(country="ca")
            assert len(result) == 1

    @pytest.mark.asyncio
    async def test_search_universities_by_course(self):
        with patch("eva_tools.db") as mock_db:
            mock_db["universities_v2"].find = MagicMock(return_value=MockCursor([]))
            result = await search_universities(course="stem")
            assert result == []

    @pytest.mark.asyncio
    async def test_get_visa_requirements_returns_cat(self):
        with patch("eva_tools.lookup_country", new=AsyncMock(return_value={
            "name": "Canada", "categories": [{"name": "Tourist", "fee": 150}]
        })):
            result = await get_visa_requirements("ca", "Tourist")
            assert result["visa_type"] == "Tourist"

    @pytest.mark.asyncio
    async def test_get_visa_requirements_no_country(self):
        with patch("eva_tools.lookup_country", new=AsyncMock(return_value=None)):
            result = await get_visa_requirements("xx")
            assert result is None

    @pytest.mark.asyncio
    async def test_get_application_fee(self):
        with patch("eva_tools.lookup_country", new=AsyncMock(return_value={
            "name": "Canada", "application_fee": 20000, "embassy_fee": 15000
        })):
            result = await get_application_fee("ca")
            assert result["fee_inr"] == 20000

    @pytest.mark.asyncio
    async def test_get_application_fee_no_country(self):
        with patch("eva_tools.lookup_country", new=AsyncMock(return_value=None)):
            result = await get_application_fee("xx")
            assert result is None


# ─── Agent Loop ───────────────────────────────────────────────────────────────
from shared.agent_loop import (
    react_chat, _build_system_prompt, _format_tool_descriptions
)
from shared.agent_loop import _parse_tool_call_legacy as _parse_tool_call
from shared.tool_registry import Tool


class TestAgentLoop:
    @pytest.mark.asyncio
    async def test_react_chat_no_tool_call(self):
        marketplace_call = AsyncMock(return_value="Final answer")
        result = await react_chat("Hello", "", "", marketplace_call)
        assert result == "Final answer"

    @pytest.mark.asyncio
    async def test_react_chat_with_tool_call(self):
        async def dummy_handler(**kwargs):
            return "tool result"
        tool = Tool("lookup_country", "desc", {"properties": {"country_id": {}}}, dummy_handler)
        with patch("agent_loop.get_tool", return_value=tool):
            with patch("agent_loop.list_tools", return_value=[tool]):
                responses = iter([
                    "TOOL: lookup_country(country_id=ca)",
                    "Final answer with data",
                ])
                marketplace_call = AsyncMock(side_effect=lambda x: next(responses))
                result = await react_chat("Canada info", "", "", marketplace_call)
                assert "Final answer" in result

    @pytest.mark.asyncio
    async def test_react_chat_tool_not_found(self):
        with patch("agent_loop.get_tool", return_value=None):
            marketplace_call = AsyncMock(return_value="TOOL: nonexistent(param=1)")
            result = await react_chat("test", "", "", marketplace_call)
            assert "not found" in result

    @pytest.mark.asyncio
    async def test_react_chat_tool_error(self):
        async def failing_handler(**kwargs):
            raise ValueError("Tool failed")
        tool = Tool("failing_tool", "desc", {}, failing_handler)
        with patch("agent_loop.get_tool", return_value=tool):
            marketplace_call = AsyncMock(return_value="TOOL: failing_tool()")
            result = await react_chat("test", "", "", marketplace_call)
            # Should not crash — error is caught
            assert isinstance(result, str)

    def test_build_system_prompt_with_context(self):
        result = _build_system_prompt("Country data", "Previous conversation")
        assert "Country data" in result
        assert "Previous conversation" in result

    def test_build_system_prompt_empty(self):
        result = _build_system_prompt("", "")
        assert "Hive" in result

    def test_format_tool_descriptions(self):
        async def h(**kw):
            return ""
        tool = Tool("test_tool", "A test tool", {"properties": {"p1": {"description": "Param 1"}}}, h)
        with patch("agent_loop.list_tools", return_value=[tool]):
            with patch("tool_registry.get_tool", return_value=tool):
                result = _format_tool_descriptions()
                assert "test_tool" in result
                assert "Param 1" in result

    def test_format_tool_descriptions_empty(self):
        with patch("agent_loop.list_tools", return_value=[]):
            assert "no tools available" in _format_tool_descriptions()

    def test_parse_tool_call_valid(self):
        result = _parse_tool_call("TOOL: lookup_country(country_id=ca)")
        assert result is not None
        assert result[0] == "lookup_country"
        assert result[1] == {"country_id": "ca"}

    def test_parse_tool_call_no_match(self):
        assert _parse_tool_call("Just a regular response") is None

    def test_parse_tool_call_with_quotes(self):
        result = _parse_tool_call('TOOL: search(param="hello world")')
        assert result is not None
        assert result[1] == {"param": "hello world"}

    def test_parse_tool_call_multiple_params(self):
        result = _parse_tool_call("TOOL: test(a=1, b=2, c=3)")
        assert result is not None
        assert result[1] == {"a": "1", "b": "2", "c": "3"}


# ─── Storage ──────────────────────────────────────────────────────────────────
from core.storage import (
    R2_BUCKET, doc_key, scan_key, is_configured, _get_client,
    upload_bytes, signed_download_url, delete_object
)


class TestStorage:
    def test_doc_key_format(self):
        key = doc_key("u1", "app1", "doc1", "passport.pdf")
        assert key.startswith("documents/u1/app1/doc1/")
        assert "passport.pdf" in key

    def test_doc_key_sanitizes(self):
        key = doc_key("u1", "app1", "doc1", "../../etc/passwd")
        assert "/" not in key.replace("documents/u1/app1/doc1/", "")

    def test_scan_key_format(self):
        key = scan_key("u1", "s1", "scan.jpg")
        assert key.startswith("scans/u1/s1/")

    def test_is_configured_false_by_default(self):
        assert is_configured() == bool(os.environ.get("R2_BUCKET"))

    def test_get_client_not_configured_raises(self):
        with patch.dict(os.environ, {}, clear=True):
            import importlib
            import core.storage as st
            importlib.reload(st)
            with pytest.raises(Exception):
                st._get_client()

    def test_upload_bytes_success(self):
        with patch("storage._get_client") as mock_get:
            client = MagicMock()
            mock_get.return_value = client
            result = upload_bytes("test/key", b"data", "text/plain")
            assert result["storage"] == "r2"
            assert result["key"] == "test/key"

    def test_upload_bytes_failure(self):
        with patch("storage._get_client") as mock_get:
            client = MagicMock()
            client.put_object.side_effect = Exception("S3 error")
            mock_get.return_value = client
            with pytest.raises(Exception):
                upload_bytes("test/key", b"data")

    def test_signed_download_url(self):
        with patch("storage._get_client") as mock_get:
            client = MagicMock()
            client.generate_presigned_url.return_value = "https://signed.url"
            mock_get.return_value = client
            url = signed_download_url("test/key", filename="doc.pdf")
            assert url == "https://signed.url"

    def test_signed_download_url_failure(self):
        with patch("storage._get_client") as mock_get:
            client = MagicMock()
            client.generate_presigned_url.side_effect = Exception("fail")
            mock_get.return_value = client
            with pytest.raises(Exception):
                signed_download_url("test/key")

    def test_delete_object_success(self):
        with patch("storage._get_client") as mock_get:
            client = MagicMock()
            mock_get.return_value = client
            assert delete_object("test/key") is True

    def test_delete_object_failure(self):
        from botocore.exceptions import BotoCoreError
        with patch("storage._get_client") as mock_get:
            client = MagicMock()
            client.delete_object.side_effect = BotoCoreError()
            mock_get.return_value = client
            assert delete_object("test/key") is False
