"""AI Marketplace settings and provider management."""

from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ai_marketplace import (
    PROVIDER_REGISTRY,
    get_provider,
    marketplace,
)
from auth_utils import get_current_user
from db import db

router = APIRouter(prefix="/ai-marketplace", tags=["ai-marketplace"])
marketplace.db = db  # bind DB to marketplace singleton


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ConnectProviderRequest(BaseModel):
    provider_id: str
    api_key: str = ""
    base_url: str = ""
    model: str = ""


class SetActiveRequest(BaseModel):
    provider_id: str


class TestConnectionRequest(BaseModel):
    provider_id: str
    api_key: str = ""
    base_url: str = ""
    model: str = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/providers")
async def list_providers(user=Depends(get_current_user)):
    """Return available providers (metadata only, no secrets)."""
    return {
        "providers": [
            {
                "id": pid,
                "name": meta["name"],
                "description": meta["description"],
                "website": meta["website"],
                "requires_key": meta["requires_key"],
                "key_label": meta.get("key_label", "API Key"),
                "key_placeholder": meta.get("key_placeholder", ""),
                "models": meta.get("models", []),
                "docs": meta.get("docs", ""),
                "powered_by_tagline": meta.get("powered_by_tagline", f"Powered by {meta['name']} in Association with We Hive"),
            }
            for pid, meta in PROVIDER_REGISTRY.items()
        ]
    }


@router.get("/my-providers")
async def get_my_providers(user=Depends(get_current_user)):
    """Return user's saved provider configs (keys masked)."""
    doc = await db["ai_settings"].find_one({"user_id": user["_id"]}) or {}
    providers = doc.get("providers", {})
    active = doc.get("active_provider", "")

    masked = []
    for pid, cfg in providers.items():
        key = cfg.get("key", "")
        masked_key = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
        meta = PROVIDER_REGISTRY.get(pid, {})
        masked.append({
            "provider_id": pid,
            "name": meta.get("name", pid),
            "masked_key": masked_key,
            "base_url": cfg.get("base_url", ""),
            "model": cfg.get("model", ""),
            "powered_by_tagline": meta.get("powered_by_tagline", f"Powered by {meta.get('name', pid)} in Association with We Hive"),
        })

    return {
        "active_provider": active,
        "providers": masked,
    }


@router.post("/connect")
async def connect_provider(req: ConnectProviderRequest, user=Depends(get_current_user)):
    """Save (or update) a provider's API key / settings for the current user."""
    if req.provider_id not in PROVIDER_REGISTRY:
        raise HTTPException(400, "Unknown provider")

    meta = PROVIDER_REGISTRY[req.provider_id]
    if meta["requires_key"] and not req.api_key:
        raise HTTPException(400, "API key required for this provider")

    existing = await db["ai_settings"].find_one({"user_id": user["_id"]}) or {}
    providers = existing.get("providers", {})
    providers[req.provider_id] = {
        "key": req.api_key,
        "base_url": req.base_url or meta.get("base_url", ""),
        "model": req.model or (meta.get("models", [""])[0] if meta.get("models") else ""),
        "connected_at": datetime.utcnow().isoformat(),
    }

    update = {"$set": {"providers": providers, "updated_at": datetime.utcnow()}}
    if "user_id" not in existing:
        update["$setOnInsert"] = {"user_id": user["_id"], "created_at": datetime.utcnow()}

    await db["ai_settings"].update_one({"user_id": user["_id"]}, update, upsert=True)

    return {"ok": True, "provider_id": req.provider_id, "message": f"Connected to {meta['name']}"}


@router.post("/set-active")
async def set_active(req: SetActiveRequest, user=Depends(get_current_user)):
    """Set the active provider for the current user."""
    if req.provider_id not in PROVIDER_REGISTRY:
        raise HTTPException(400, "Unknown provider")

    doc = await db["ai_settings"].find_one({"user_id": user["_id"]}) or {}
    if req.provider_id not in doc.get("providers", {}):
        raise HTTPException(400, "Provider not connected. Connect first.")

    await db["ai_settings"].update_one(
        {"user_id": user["_id"]},
        {"$set": {"active_provider": req.provider_id, "updated_at": datetime.utcnow()}},
    )
    meta = PROVIDER_REGISTRY[req.provider_id]
    return {"ok": True, "active_provider": req.provider_id, "name": meta["name"]}


@router.delete("/disconnect/{provider_id}")
async def disconnect_provider(provider_id: str, user=Depends(get_current_user)):
    """Disconnect a provider and remove its credentials."""
    doc = await db["ai_settings"].find_one({"user_id": user["_id"]}) or {}
    providers = doc.get("providers", {})
    if provider_id in providers:
        del providers[provider_id]
    update = {"providers": providers, "updated_at": datetime.utcnow()}
    if doc.get("active_provider") == provider_id:
        update["active_provider"] = ""
    await db["ai_settings"].update_one({"user_id": user["_id"]}, {"$set": update})
    return {"ok": True, "message": f"Disconnected from {provider_id}"}


@router.post("/test")
async def test_connection(req: TestConnectionRequest, user=Depends(get_current_user)):
    """Test a provider connection by sending a simple prompt."""
    meta = PROVIDER_REGISTRY.get(req.provider_id)
    if not meta:
        raise HTTPException(400, "Unknown provider")

    if meta["requires_key"] and not req.api_key:
        raise HTTPException(400, "API key required")

    provider = get_provider(
        req.provider_id,
        key=req.api_key,
        base_url=req.base_url or meta.get("base_url", ""),
        model=req.model or (meta.get("models", [""])[0] if meta.get("models") else ""),
    )

    try:
        reply = await provider.chat(
            "You are a helpful assistant.",
            "Say 'pong' and nothing else.",
            max_tokens=10,
        )
        return {"ok": True, "reply": reply.strip(), "provider": req.provider_id}
    except Exception as e:
        return {"ok": False, "error": str(e), "provider": req.provider_id}


@router.get("/status")
async def connection_status(user=Depends(get_current_user)):
    """Get the active connection status for the current user."""
    doc = await db["ai_settings"].find_one({"user_id": user["_id"]}) or {}
    active = doc.get("active_provider", "")
    if not active:
        return {"active": False, "provider": None, "message": "No provider configured"}

    cfg = doc.get("providers", {}).get(active, {})
    meta = PROVIDER_REGISTRY.get(active, {})
    return {
        "active": True,
        "provider": {
            "id": active,
            "name": meta.get("name", active),
            "model": cfg.get("model", ""),
            "powered_by_tagline": meta.get("powered_by_tagline", f"Powered by {meta.get('name', active)} in Association with We Hive"),
        },
    }
