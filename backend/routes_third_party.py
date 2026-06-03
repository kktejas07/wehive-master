"""Third-party service integrations management."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from third_party_services import SERVICE_CATEGORIES
from auth_utils import get_current_user
from db import db

router = APIRouter(prefix="/third-party", tags=["third-party"])
third_party_db = db["third_party_settings"]


class ConnectServiceRequest(BaseModel):
    service_id: str
    api_key: str = ""
    base_url: Optional[str] = None
    extra: Optional[dict] = None


class SetDefaultRequest(BaseModel):
    service_id: str


class TestServiceRequest(BaseModel):
    service_id: str
    api_key: str = ""
    base_url: Optional[str] = None


def _mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return "***"
    return key[:6] + "..." + key[-4:]


def _resolve_service(service_id: str) -> dict:
    for cat in SERVICE_CATEGORIES:
        for svc in cat["services"]:
            if svc["id"] == service_id:
                return svc
    raise HTTPException(404, "Service not found")


async def _get_user_doc(user_id: str) -> dict:
    return await third_party_db.find_one({"user_id": user_id}) or {}


def _serialize_user_services(doc: dict) -> list[dict]:
    items = []
    for cat in SERVICE_CATEGORIES:
        for svc in cat["services"]:
            cfg = doc.get("services", {}).get(svc["id"])
            if cfg:
                items.append({
                    "service_id": svc["id"],
                    "name": svc["name"],
                    "category": svc["category"],
                    "masked_key": _mask_key(cfg.get("api_key", "")),
                    "base_url": cfg.get("base_url", svc.get("base_url", "")),
                    "is_default": doc.get("default_service") == svc["id"],
                    "connected_at": cfg.get("connected_at"),
                })
    return items


@router.get("/categories")
async def list_categories(_=Depends(get_current_user)):
    """Return all service categories and their services (no secrets)."""
    result = []
    for cat in SERVICE_CATEGORIES:
        cat_services = []
        for svc in cat["services"]:
            cat_services.append({
                "id": svc["id"],
                "name": svc["name"],
                "description": svc["description"],
                "website": svc["website"],
                "requires_key": svc["requires_key"],
                "key_label": svc.get("key_label", "API Key"),
                "key_placeholder": svc.get("key_placeholder", ""),
                "features": svc.get("features", []),
                "powered_by_tagline": svc.get("powered_by_tagline", f"Powered by {svc['name']} in Association with We Hive"),
            })
        result.append({
            "id": cat["id"],
            "name": cat["name"],
            "description": cat["description"],
            "services": cat_services,
        })
    return {"categories": result}


@router.get("/my-services")
async def get_my_services(user=Depends(get_current_user)):
    """Return user's connected services (keys masked)."""
    doc = await _get_user_doc(user["_id"])
    return {
        "services": _serialize_user_services(doc),
        "default_service": doc.get("default_service", ""),
    }


@router.post("/connect")
async def connect_service(req: ConnectServiceRequest, user=Depends(get_current_user)):
    """Connect (or update) a third-party service."""
    svc = _resolve_service(req.service_id)
    if svc["requires_key"] and not req.api_key:
        raise HTTPException(400, "API key required for this service")

    doc = await _get_user_doc(user["_id"])
    services = dict(doc.get("services", {}))

    base_url = req.base_url or svc.get("base_url", "")
    if svc["id"] == "razorpay":
        base_url = base_url or svc["base_url"]

    services[req.service_id] = {
        "api_key": req.api_key,
        "base_url": base_url,
        "extra": req.extra or {},
        "connected_at": datetime.utcnow().isoformat(),
    }

    update = {"$set": {"services": services, "updated_at": datetime.utcnow()}}
    if "user_id" not in doc:
        update["$setOnInsert"] = {"user_id": user["_id"], "created_at": datetime.utcnow()}

    if not doc.get("default_service"):
        update["$set"]["default_service"] = req.service_id

    await third_party_db.update_one({"user_id": user["_id"]}, update, upsert=True)
    return {
        "ok": True,
        "service_id": req.service_id,
        "name": svc["name"],
        "message": f"Connected to {svc['name']}",
    }


@router.post("/set-default")
async def set_default(req: SetDefaultRequest, user=Depends(get_current_user)):
    """Set the default/preferred service for a category."""
    svc = _resolve_service(req.service_id)
    doc = await _get_user_doc(user["_id"])
    if req.service_id not in doc.get("services", {}):
        raise HTTPException(400, "Service not connected. Connect first.")
    await third_party_db.update_one(
        {"user_id": user["_id"]},
        {"$set": {"default_service": req.service_id, "updated_at": datetime.utcnow()}},
    )
    return {"ok": True, "default_service": req.service_id, "name": svc["name"]}


@router.delete("/disconnect/{service_id}")
async def disconnect_service(service_id: str, user=Depends(get_current_user)):
    """Disconnect a service and remove its credentials."""
    svc = _resolve_service(service_id)
    doc = await _get_user_doc(user["_id"])
    services = dict(doc.get("services", {}))
    if service_id in services:
        del services[service_id]
    update = {"services": services, "updated_at": datetime.utcnow()}
    if doc.get("default_service") == service_id:
        update["default_service"] = ""
    await third_party_db.update_one({"user_id": user["_id"]}, {"$set": update})
    return {"ok": True, "message": f"Disconnected from {svc['name']}"}


@router.post("/test")
async def test_service(req: TestServiceRequest, user=Depends(get_current_user)):
    """Test a service connection with a simple ping/health check."""
    svc = _resolve_service(req.service_id)
    if svc["requires_key"] and not req.api_key:
        raise HTTPException(400, "API key required")

    import httpx
    api_key = req.api_key or (await _get_user_doc(user["_id"])).get("services", {}).get(req.service_id, {}).get("api_key", "")
    base_url = req.base_url or svc.get("base_url", "")

    try:
        if svc["id"] == "razorpay":
            headers = {"Authorization": f"Basic {api_key}:"}
            r = httpx.get(f"{base_url}/payments", headers=headers, timeout=10)
            ok = r.status_code < 500
        elif svc["id"] == "wise":
            headers = {"Authorization": f"Bearer {api_key}"}
            r = httpx.get(f"{base_url}/rates", headers=headers, timeout=10)
            ok = r.status_code < 500
        elif svc["id"] == "stripe":
            headers = {"Authorization": f"Bearer {api_key}"}
            r = httpx.get(f"{base_url}/balance", headers=headers, timeout=10)
            ok = r.status_code in (200, 401)
        elif svc["id"] == "atlys" or svc["id"] == "visahq" or svc["id"] == "ivisa":
            headers = {"Authorization": f"Bearer {api_key}"}
            r = httpx.get(f"{base_url}/health", headers=headers, timeout=10)
            ok = r.status_code < 500
        elif svc["id"] == "amadeus":
            headers = {"Authorization": f"Bearer {api_key}"}
            r = httpx.get(f"{base_url}/safety/safety-information", headers=headers, timeout=10)
            ok = r.status_code < 500
        else:
            headers = {"Authorization": f"Bearer {api_key}"}
            r = httpx.get(base_url, headers=headers, timeout=10)
            ok = r.status_code < 500

        return {"ok": ok, "status_code": r.status_code, "service": svc["id"]}
    except Exception as e:
        return {"ok": False, "error": str(e), "service": svc["id"]}


@router.get("/status")
async def services_status(user=Depends(get_current_user)):
    """Get connected services status for the current user."""
    doc = await _get_user_doc(user["_id"])
    services = _serialize_user_services(doc)
    if not services:
        return {"connected": False, "services": []}
    return {"connected": True, "services": services, "default_service": doc.get("default_service", "")}
