"""Tests for remaining uncovered service modules and route file helpers.
Covers pricing, communication_services, admin_auth (hash), data, and more.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "wehive_test"
os.environ["JWT_SECRET"] = "testkey_testkey_testkey_testkey_testkey_12345"
os.environ["APP_ENV"] = "test"
os.environ["ADMIN_EMAILS"] = "admin@test.com"
os.environ["OTP_LENGTH"] = "6"
os.environ["OTP_TTL_MINUTES"] = "10"
os.environ["JWT_EXPIRES_HOURS"] = "720"

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ─── Pricing ─────────────────────────────────────────────────────────────────
class TestPricing:
    @pytest.mark.asyncio
    async def test_load_pricing_defaults(self):
        from pricing import load_pricing, invalidate_pricing_cache
        invalidate_pricing_cache()
        with patch("pricing.settings_col") as col:
            col.find_one = AsyncMock(return_value=None)
            cfg = await load_pricing()
            assert cfg["currency"] == "INR"
            assert cfg["gst_rate"] == 0.18

    @pytest.mark.asyncio
    async def test_load_pricing_from_db(self):
        from pricing import load_pricing, invalidate_pricing_cache
        invalidate_pricing_cache()
        with patch("pricing.settings_col") as col:
            col.find_one = AsyncMock(return_value={
                "_id": "pricing",
                "base_fees": {"Tourist": 5000},
                "surcharge_inr": 400,
                "gst_rate": 0.12,
                "currency": "USD",
                "updated_at": "2025-01-01",
            })
            cfg = await load_pricing()
            assert cfg["currency"] == "USD"
            assert cfg["gst_rate"] == 0.12
            assert cfg["base_fees"]["Tourist"] == 5000

    @pytest.mark.asyncio
    async def test_load_pricing_caches(self):
        from pricing import load_pricing, invalidate_pricing_cache
        invalidate_pricing_cache()
        with patch("pricing.settings_col") as col:
            col.find_one = AsyncMock(return_value=None)
            cfg1 = await load_pricing()
            cfg2 = await load_pricing()
            assert col.find_one.call_count == 1

    def test_invalidate_cache(self):
        import pricing as pr_mod
        pr_mod._pricing_cache = {"test": True}
        pr_mod.invalidate_pricing_cache()
        assert pr_mod._pricing_cache is None


# ─── Admin Auth (hash/verify) ────────────────────────────────────────────────
class TestAdminAuth:
    def test_hash_and_verify_password(self):
        from admin_auth import hash_password, verify_password
        pw = "SecurePass123!"
        hashed = hash_password(pw)
        assert hashed != pw
        assert verify_password(pw, hashed) is True

    def test_verify_wrong_password(self):
        from admin_auth import verify_password, hash_password
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_verify_invalid_hash(self):
        from admin_auth import verify_password
        assert verify_password("test", "invalid_hash") is False


# ─── Communication Services ──────────────────────────────────────────────────
class TestTelegram:
    @pytest.mark.asyncio
    async def test_send_message_not_configured(self):
        from communication_services import TelegramService
        svc = TelegramService(bot_token="")
        result = await svc.send_message("123", "Hello")
        assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_send_message_success(self):
        from communication_services import TelegramService
        mock_resp = MagicMock()
        mock_resp.json = MagicMock(return_value={"ok": True})
        with patch("httpx.AsyncClient") as client_cls:
            client = MagicMock()
            client.__aenter__.return_value.post = AsyncMock(return_value=mock_resp)
            client.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
            client_cls.return_value = client
            svc = TelegramService(bot_token="test:token")
            result = await svc.send_message("123", "Hello")
            assert result["ok"] is True

    @pytest.mark.asyncio
    async def test_send_otp_code(self):
        from communication_services import TelegramService
        svc = TelegramService(bot_token="")
        result = await svc.send_otp_code("123", "123456")
        assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_get_updates_not_configured(self):
        from communication_services import TelegramService
        svc = TelegramService(bot_token="")
        result = await svc.get_updates()
        assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_get_updates_success(self):
        from communication_services import TelegramService
        mock_resp = MagicMock()
        mock_resp.json = MagicMock(return_value={"ok": True, "result": []})
        with patch("httpx.AsyncClient") as client_cls:
            client = MagicMock()
            client.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
            client_cls.return_value = client
            svc = TelegramService(bot_token="test:token")
            result = await svc.get_updates()
            assert result["ok"] is True


class TestDiscord:
    @pytest.mark.asyncio
    async def test_send_message_not_configured(self):
        from communication_services import DiscordService
        svc = DiscordService(webhook_url="")
        result = await svc.send_message("Hello")
        assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_send_message_204(self):
        from communication_services import DiscordService
        mock_resp = MagicMock()
        mock_resp.status_code = 204
        with patch("httpx.AsyncClient") as client_cls:
            client = MagicMock()
            client.__aenter__.return_value.post = AsyncMock(return_value=mock_resp)
            client_cls.return_value = client
            svc = DiscordService(webhook_url="https://discord.com/api/webhooks/test")
            result = await svc.send_message("Hello")
            assert result["ok"] is True

    @pytest.mark.asyncio
    async def test_send_message_error_status(self):
        from communication_services import DiscordService
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        with patch("httpx.AsyncClient") as client_cls:
            client = MagicMock()
            client.__aenter__.return_value.post = AsyncMock(return_value=mock_resp)
            client_cls.return_value = client
            svc = DiscordService(webhook_url="https://discord.com/api/webhooks/test")
            result = await svc.send_message("Hello")
            assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_send_message_exception(self):
        from communication_services import DiscordService
        with patch("httpx.AsyncClient") as client_cls:
            client = MagicMock()
            client.__aenter__.return_value.post = AsyncMock(side_effect=Exception("network error"))
            client_cls.return_value = client
            svc = DiscordService(webhook_url="https://discord.com/api/webhooks/test")
            result = await svc.send_message("Hello")
            assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_send_notification(self):
        from communication_services import DiscordService
        svc = DiscordService(webhook_url="")
        result = await svc.send_notification("Title", "Desc")
        assert result["ok"] is False

    @pytest.mark.asyncio
    async def test_send_application_update(self):
        from communication_services import DiscordService
        svc = DiscordService(webhook_url="")
        result = await svc.send_application_update("User", "app1", "approved", "Done")
        assert result["ok"] is False


class TestWhatsApp:
    @pytest.mark.asyncio
    async def test_get_community_invite_default(self):
        from communication_services import WhatsAppService
        svc = WhatsAppService(group_invite_link="")
        assert await svc.get_community_invite() == "https://chat.whatsapp.com/invite"

    @pytest.mark.asyncio
    async def test_get_community_invite_custom(self):
        from communication_services import WhatsAppService
        svc = WhatsAppService(group_invite_link="https://chat.whatsapp.com/abc123")
        assert await svc.get_community_invite() == "https://chat.whatsapp.com/abc123"

    @pytest.mark.asyncio
    async def test_send_invite_not_configured(self):
        from communication_services import WhatsAppService
        svc = WhatsAppService(group_invite_link="")
        result = await svc.send_invite_message("+1234567890")
        assert result["ok"] is False


# ─── Data Module (get_country function coverage) ─────────────────────────────
class TestDataModule:
    def test_vc_helper(self):
        from data import _vc
        vc = _vc(name="Tourist", fees_inr=5000, fees_usd=60, processing_days=15, validity="6 months", documents=["passport"])
        assert vc["name"] == "Tourist"
        assert vc["multi_entry"] is True

    def test_get_country_known(self):
        from data import get_country
        ca = get_country("ca")
        assert ca is not None
        assert ca.get("name") == "Canada"
        assert "application_fee" in ca
        assert "embassy_fee" in ca

    def test_get_country_unknown(self):
        from data import get_country
        assert get_country("zz") is None

    def test_country_has_visa_types(self):
        from data import get_country
        ca = get_country("ca")
        assert "visa_types" in ca
        assert "categories" in ca

    def test_get_holiday_plan_known(self):
        from data import get_holiday_plan
        plan = get_holiday_plan("ca")
        assert plan is not None
        assert "best_time" in plan

    def test_get_holiday_plan_with_meta(self):
        from data import get_holiday_plan
        plan = get_holiday_plan("xx", {"region": "Europe", "capital": "Berlin", "currencies": ["EUR"], "languages": ["German"]})
        assert plan is not None
        assert "best_time" in plan

    def test_get_holiday_plan_unknown(self):
        from data import get_holiday_plan
        plan = get_holiday_plan("zz", {"currencies": [], "languages": []})
        assert plan is not None
        assert plan["currency"] == "—"
        assert plan["language"] == "—"

    def test_docs_tourist(self):
        from data import DOCS_TOURIST, DOCS_BASIC
        assert len(DOCS_TOURIST) > len(DOCS_BASIC)
