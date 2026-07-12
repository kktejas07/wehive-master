"""Accounts vault for the AI orchestrator.

Stores provider API keys encrypted at rest and tracks token allocations/usage.
"""

import logging
from datetime import datetime, timezone


from shared.byok_vault import decrypt_key, encrypt_key
from core.db import db

logger = logging.getLogger(__name__)

ACCOUNTS_COLLECTION = "orchestrator_accounts"

# OpenAI-compatible base URLs keyed by provider id.
PROVIDER_BASE_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
    "mistral": "https://api.mistral.ai/v1",
    "cohere": "https://api.cohere.com/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "xai": "https://api.x.ai/v1",
    "perplexity": "https://api.perplexity.ai",
    "together": "https://api.together.xyz/v1",
    "fireworks": "https://api.fireworks.ai/inference/v1",
    "cerebras": "https://api.cerebras.ai/v1",
    "ai21": "https://api.ai21.com/studio/v1",
    "deepinfra": "https://api.deepinfra.com/v1/openai",
    "novita": "https://api.novita.ai/v3/openai",
    "siliconflow": "https://api.siliconflow.cn/v1",
    "zhipu": "https://open.bigmodel.cn/api/paas/v4",
    "moonshot": "https://api.moonshot.cn/v1",
    "alibaba": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "nebius": "https://api.studio.nebius.ai/v1",
    "huggingface": "https://api-inference.huggingface.co/models",
    "nvidia_nim": "https://integrate.api.nvidia.com/v1",
    "replicate": "https://openai.replicate.com/v1",
    "pollinations": "https://text.pollinations.ai/openai",
    "omniroute": "https://api.omniroute.ai/v1",
    "localai": "http://localhost:8080/v1",
    "vllm": "http://localhost:8000/v1",
    "llamacpp": "http://localhost:8080/v1",
    "gpt4all": "http://localhost:4891/v1",
    "kobold": "http://localhost:5001/api/v1",
    "ollama": "http://localhost:11434/v1",
}


class AccountsVault:
    """Encrypted account storage with token usage tracking."""

    def __init__(self, _db=None):
        self.db = _db or db

    def _collection(self):
        return self.db[ACCOUNTS_COLLECTION]

    @staticmethod
    def _normalize(provider: str) -> str:
        return (provider or "").lower().strip()

    @staticmethod
    def _encrypt(value: str) -> str:
        return encrypt_key(value)

    @staticmethod
    def _decrypt(value: str) -> str:
        return decrypt_key(value)

    def _to_doc(self, acct: dict) -> dict:
        """Serialize an account dict for MongoDB; encrypt the API key."""
        doc = {
            "provider": self._normalize(acct["provider"]),
            "account_email": acct.get("account_email", ""),
            "api_key_encrypted": self._encrypt(acct["api_key"]),
            "tokens_allocated": int(acct.get("tokens_allocated", 0)),
            "tokens_used": int(acct.get("tokens_used", 0)),
            "refresh_date": acct.get("refresh_date", ""),
            "status": acct.get("status", "ACTIVE"),
            "priority": int(acct.get("priority", 10)),
            "models": list(acct.get("models", [])),
            "extra_headers": dict(acct.get("extra_headers", {})),
            "base_url": acct.get("base_url", ""),
            "free_tier": bool(acct.get("free_tier", False)),
            "trial_credits": float(acct.get("trial_credits", 0.0)),
            "trial_expiry": acct.get("trial_expiry", ""),
            "capabilities": list(acct.get("capabilities", ["llm"])),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        return doc

    def _from_doc(self, doc: dict) -> dict:
        """Deserialize a MongoDB account doc, decrypting the API key."""
        if not doc:
            return {}
        encrypted = doc.get("api_key_encrypted", "")
        api_key = ""
        if encrypted:
            try:
                api_key = self._decrypt(encrypted)
            except Exception as e:
                logger.error("Failed to decrypt API key for %s: %s", doc.get("provider"), e)
        return {
            "provider": doc.get("provider", ""),
            "account_email": doc.get("account_email", ""),
            "api_key": api_key,
            "api_key_encrypted": encrypted[:12] + "..." if encrypted else "",
            "tokens_allocated": doc.get("tokens_allocated", 0),
            "tokens_used": doc.get("tokens_used", 0),
            "refresh_date": doc.get("refresh_date", ""),
            "status": doc.get("status", "ACTIVE"),
            "priority": doc.get("priority", 10),
            "models": doc.get("models", []),
            "extra_headers": doc.get("extra_headers", {}),
            "base_url": doc.get("base_url", ""),
            "free_tier": doc.get("free_tier", False),
            "trial_credits": doc.get("trial_credits", 0.0),
            "trial_expiry": doc.get("trial_expiry", ""),
            "capabilities": doc.get("capabilities", ["llm"]),
            "updated_at": doc.get("updated_at", ""),
        }

    async def set_account(self, acct: dict) -> dict:
        """Create or replace an account for a provider."""
        provider = self._normalize(acct.get("provider", ""))
        if not provider:
            raise ValueError("provider is required")
        if not acct.get("api_key"):
            raise ValueError("api_key is required")
        doc = self._to_doc(acct)
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await self._collection().update_one(
            {"provider": provider},
            {"$set": doc, "$setOnInsert": {"created_at": doc["created_at"]}},
            upsert=True,
        )
        logger.info("Vault: stored account for %s", provider)
        return await self.get_account(provider)

    async def get_account(self, provider: str) -> dict:
        doc = await self._collection().find_one({"provider": self._normalize(provider)})
        return self._from_doc(doc) if doc else {}

    async def list_accounts(self) -> list[dict]:
        cursor = self._collection().find({}).sort("provider", 1)
        return [self._from_doc(doc) async for doc in cursor]

    async def get_available_accounts(self) -> list[dict]:
        """Return ACTIVE accounts that have a usable API key."""
        accounts = await self.list_accounts()
        available = []
        for acct in accounts:
            if acct.get("status") not in ("ACTIVE",):
                continue
            if not acct.get("api_key"):
                continue
            available.append(acct)
        return available

    async def update_token_usage(self, provider: str, tokens_used: int) -> dict:
        provider = self._normalize(provider)
        result = await self._collection().update_one(
            {"provider": provider},
            {
                "$inc": {"tokens_used": int(tokens_used)},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            },
        )
        if result.matched_count:
            logger.info("Vault: %s usage +%d tokens", provider, tokens_used)
        return await self.get_account(provider)

    async def set_status(self, provider: str, status: str) -> dict:
        provider = self._normalize(provider)
        await self._collection().update_one(
            {"provider": provider},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        logger.info("Vault: %s status -> %s", provider, status)
        return await self.get_account(provider)

    async def delete_account(self, provider: str) -> bool:
        result = await self._collection().delete_one({"provider": self._normalize(provider)})
        return result.deleted_count > 0

    async def refresh_expired_accounts(self) -> list[str]:
        """Reset usage for accounts whose refresh_date has passed."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        cursor = self._collection().find({
            "refresh_date": {"$lte": today},
            "status": "EXHAUSTED",
        })
        refreshed = []
        async for doc in cursor:
            provider = doc["provider"]
            await self._collection().update_one(
                {"provider": provider},
                {
                    "$set": {
                        "tokens_used": 0,
                        "status": "ACTIVE",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                },
            )
            refreshed.append(provider)
            logger.info("Vault: refreshed account %s", provider)
        return refreshed
