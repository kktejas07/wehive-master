"""Final coverage push — tests for ai_marketplace, admin_auth, db, and remaining route helpers.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "wehive_test"
os.environ["JWT_SECRET"] = "testkey_testkey_testkey_testkey_testkey_12345_secure"
os.environ["JWT_ALG"] = "HS256"
os.environ["APP_ENV"] = "test"
os.environ["ADMIN_EMAILS"] = "admin@test.com"
os.environ["OTP_LENGTH"] = "6"
os.environ["OTP_TTL_MINUTES"] = "10"
os.environ["JWT_EXPIRES_HOURS"] = "720"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["DISCORD_WEBHOOK_URL"] = ""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

import pytest


# ─── ai_marketplace (provider registry) ──────────────────────────────────────
class TestAIMarketplace:
    def test_provider_registry_defined(self):
        from ai_marketplace import PROVIDER_REGISTRY
        assert "ollama" in PROVIDER_REGISTRY
        assert "openai" in PROVIDER_REGISTRY
        assert len(PROVIDER_REGISTRY) >= 10


# ─── admin_auth (all remaining functions) ────────────────────────────────────
class TestAdminAuthExtended:
    def test_hash_and_verify(self):
        from admin_auth import hash_password, verify_password
        h = hash_password("test123")
        assert verify_password("test123", h)
        assert not verify_password("wrong", h)
        assert not verify_password("test123", "badhash")

    @pytest.mark.asyncio
    async def test_get_current_admin_flex_no_header(self):
        from admin_auth import get_current_admin_flex
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            await get_current_admin_flex(None)

    @pytest.mark.asyncio
    async def test_get_current_admin_flex_not_bearer(self):
        from admin_auth import get_current_admin_flex
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            await get_current_admin_flex("Token abc")

    @pytest.mark.asyncio
    async def test_get_current_admin_flex_bad_token(self):
        from admin_auth import get_current_admin_flex
        with pytest.raises(Exception):
            await get_current_admin_flex("Bearer badtoken")


# ─── db (ensure_indexes with mocked collections) ─────────────────────────────
class TestDB:
    @pytest.mark.asyncio
    async def test_ensure_indexes(self):
        from db import ensure_indexes
        with patch("db.users") as users, \
             patch("db.otps") as otps, \
             patch("db.applications") as apps, \
             patch("db.holiday_plans") as plans, \
             patch("db.scans") as scans, \
             patch("db.payments") as payments, \
             patch("db.notifications_col") as notifs, \
             patch("db.referrals_col") as refs, \
             patch("db.db") as mdb:
            users.create_index = AsyncMock()
            otps.create_index = AsyncMock()
            apps.create_index = AsyncMock()
            plans.create_index = AsyncMock()
            scans.create_index = AsyncMock()
            payments.create_index = AsyncMock()
            notifs.create_index = AsyncMock()
            refs.create_index = AsyncMock()
            mdb.__getitem__.return_value.create_index = AsyncMock()
            await ensure_indexes()
            assert users.create_index.called


# ─── Routes helpers (pure functions from route files) ────────────────────────
class TestRouteHelpers:
    def test_sanitize_hint(self):
        from routes_scan import sanitize_hint
        assert sanitize_hint("normal") == "normal"
        assert "<" not in sanitize_hint("<script>")
        assert len(sanitize_hint("x" * 300)) == 200

    def test_build_prompt_with_hint(self):
        from routes_scan import build_prompt_with_hint
        p = build_prompt_with_hint("BASE", "hint")
        assert "BASE" in p
        assert "hint" in p
        assert build_prompt_with_hint("BASE", "") == "BASE"

    def test_notify_status_change_exists(self):
        from routes_chatbot import notify_status_change
        import inspect
        assert inspect.iscoroutinefunction(notify_status_change)


# ─── routes_scan helpers (more tests) ────────────────────────────────────────
class TestScanHelpersExtended:
    def test_detect_mime_valid(self):
        from routes_scan import _detect_scan_mime
        assert _detect_scan_mime(b"\xff\xd8\xff\xe0" + b"\x00" * 10) == "image/jpeg"
        assert _detect_scan_mime(b"\x89PNG\r\n\x1a\n" + b"\x00" * 10) == "image/png"

    def test_detect_scan_mime_none(self):
        from routes_scan import _detect_scan_mime
        assert _detect_scan_mime(b"\x00\x01\x02") is None


# ─── storage remaining coverage ──────────────────────────────────────────────
class TestStorageRemaining:
    def test_is_configured(self):
        import storage
        assert hasattr(storage, 'is_configured')

    def test_upload_and_delete(self):
        with patch("storage._get_client") as get_c:
            client = MagicMock()
            get_c.return_value = client
            from storage import upload_bytes, delete_object
            r = upload_bytes("test/k", b"data")
            assert r["storage"] == "r2"
            assert r["key"] == "test/k"
            assert delete_object("test/k") is True
