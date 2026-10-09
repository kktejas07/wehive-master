"""BYOK Vault — Bring-Your-Own-Key encrypted API key storage.

Users can bring their own API keys, stored AES-256-CBC encrypted.
Keys are decrypted only at call time, never logged, zero org token cost.

Uses Fernet symmetric encryption (AES-128-CBC with HMAC).
"""

import base64
import logging
import os
from datetime import datetime

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from db import db

logger = logging.getLogger("wehive.byok_vault")

VAULT_SECRET = os.environ.get("BYOK_VAULT_SECRET") or os.environ.get("JWT_SECRET")
if not VAULT_SECRET:
    raise RuntimeError("BYOK_VAULT_SECRET or JWT_SECRET must be set")

PROVIDER_KEY_MAP = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "cohere": "COHERE_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "groq": "GROQ_API_KEY",
    "xai": "XAI_API_KEY",
    "perplexity": "PERPLEXITY_API_KEY",
    "huggingface": "HF_API_KEY",
    "together": "TOGETHER_API_KEY",
    "fireworks": "FIREWORKS_API_KEY",
    "cerebras": "CEREBRAS_API_KEY",
    "ai21": "AI21_API_KEY",
}


def _get_fernet() -> Fernet:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"wehive-byok-salt-2026",
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(VAULT_SECRET.encode()))
    return Fernet(key)


def encrypt_key(plaintext_key: str) -> str:
    f = _get_fernet()
    return f.encrypt(plaintext_key.encode()).decode()


def decrypt_key(encrypted_key: str) -> str:
    f = _get_fernet()
    return f.decrypt(encrypted_key.encode()).decode()


async def store_key(user_id: str, provider_id: str, api_key: str) -> bool:
    try:
        encrypted = encrypt_key(api_key)
        await db["byok_vault"].update_one(
            {"user_id": user_id, "provider_id": provider_id},
            {"$set": {
                "user_id": user_id,
                "provider_id": provider_id,
                "encrypted_key": encrypted,
                "stored_at": datetime.utcnow(),
            }},
            upsert=True,
        )
        return True
    except Exception as e:
        logger.error("BYOK store failed: %s", e)
        return False


async def get_key(user_id: str, provider_id: str) -> str:
    doc = await db["byok_vault"].find_one({"user_id": user_id, "provider_id": provider_id})
    if not doc:
        return ""
    try:
        return decrypt_key(doc["encrypted_key"])
    except Exception as e:
        logger.error("BYOK decrypt failed: %s", e)
        return ""


async def delete_key(user_id: str, provider_id: str) -> bool:
    result = await db["byok_vault"].delete_one({"user_id": user_id, "provider_id": provider_id})
    return result.deleted_count > 0


async def list_user_keys(user_id: str) -> list[dict]:
    cursor = db["byok_vault"].find({"user_id": user_id})
    keys = []
    async for doc in cursor:
        masked = doc.get("encrypted_key", "")[:8] + "..." if doc.get("encrypted_key") else "N/A"
        keys.append({
            "provider_id": doc["provider_id"],
            "provider_name": PROVIDER_KEY_MAP.get(doc["provider_id"], doc["provider_id"]),
            "stored_at": str(doc.get("stored_at", "")),
            "masked_key": masked,
        })
    return keys


async def resolve_key(provider_id: str, user_id: str = "") -> str:
    if user_id:
        key = await get_key(user_id, provider_id)
        if key:
            return key

    env_var = PROVIDER_KEY_MAP.get(provider_id, "")
    if env_var:
        env_key = os.environ.get(env_var, "")
        if env_key:
            return env_key

    return ""


def providers_accepting_byok() -> list[dict]:
    return [
        {"provider_id": pid, "env_var": env_var, "configured": bool(os.environ.get(env_var))}
        for pid, env_var in PROVIDER_KEY_MAP.items()
    ]
