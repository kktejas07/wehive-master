import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from auth_utils import get_current_user
from db import usvisa_slots_col, usvisa_subscriptions_col

router = APIRouter(prefix="/usvisa", tags=["usvisa-slots"])

US_CONSULATES_INDIA = [
    {"id": "mumbai", "name": "Mumbai VAC", "city": "Mumbai"},
    {"id": "delhi", "name": "New Delhi Embassy", "city": "New Delhi"},
    {"id": "chennai", "name": "Chennai Consulate", "city": "Chennai"},
    {"id": "kolkata", "name": "Kolkata Consulate", "city": "Kolkata"},
    {"id": "hyderabad", "name": "Hyderabad Consulate", "city": "Hyderabad"},
]

VISA_TYPES = [
    {"id": "b1b2", "name": "B1/B2", "label": "Tourist & Business"},
    {"id": "f1", "name": "F1", "label": "Student"},
    {"id": "h1b", "name": "H1B", "label": "Work"},
    {"id": "h4", "name": "H4", "label": "Dependent"},
    {"id": "l1", "name": "L1", "label": "Intra-company Transfer"},
    {"id": "j1", "name": "J1", "label": "Exchange Visitor"},
]

TELEGRAM_GROUPS = {
    "b1b2": os.environ.get("TELEGRAM_B1B2_GROUP", "https://t.me/USvisaAppointmentsHelp"),
    "f1": os.environ.get("TELEGRAM_F1_GROUP", "https://t.me/US_F1_Visa_Updates"),
    "h1b": os.environ.get("TELEGRAM_H1B_GROUP", "https://t.me/US_H1B_Visa_Updates"),
}

WHATSAPP_NUMBER = os.environ.get("WHATSAPP_VISA_NUMBER", "+91 9000734326")


class SubscribeRequest(BaseModel):
    visa_types: list[str] = ["b1b2"]
    consulates: list[str] = ["mumbai", "delhi", "chennai", "kolkata", "hyderabad"]
    channel: str = "in_app"
    telegram_chat_id: Optional[str] = None


@router.get("/slots")
async def get_slots(
    consulate: Optional[str] = None,
    visa_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    hours: int = Query(24, ge=1, le=720),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q: dict = {"detected_at": {"$gte": since}}

    if consulate:
        q["consulate"] = consulate
    if visa_type:
        q["visa_type"] = visa_type

    cursor = usvisa_slots_col.find(q).sort("date", 1).limit(limit)
    slots = await cursor.to_list(limit)
    return {
        "ok": True,
        "count": len(slots),
        "since_hours": hours,
        "filters": {"consulate": consulate, "visa_type": visa_type},
        "slots": _serialize_slots(slots),
    }


@router.get("/slots/summary")
async def get_slots_summary(
    hours: int = Query(24, ge=1, le=720),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    cursor = usvisa_slots_col.find({"detected_at": {"$gte": since}})
    slots = await cursor.to_list(5000)

    summary = {}
    for c in US_CONSULATES_INDIA:
        cid = c["id"]
        summary[cid] = {
            "name": c["name"],
            "city": c["city"],
            "visa_types": {},
            "total_slots": 0,
            "earliest_date": None,
        }
        for vt in VISA_TYPES:
            matching = [
                s for s in slots
                if s["consulate"] == cid and s["visa_type"] == vt["id"]
            ]
            summary[cid]["visa_types"][vt["id"]] = {
                "name": vt["name"],
                "label": vt["label"],
                "count": len(matching),
                "available": len(matching) > 0,
                "earliest_date": min((s["date"] for s in matching), default=None),
            }
            summary[cid]["total_slots"] += len(matching)

        matching_dates = [s["date"] for s in slots if s["consulate"] == cid]
        summary[cid]["earliest_date"] = min(matching_dates, default=None)

    overall = {
        "total_slots": len(slots),
        "consulates_with_slots": sum(1 for c in summary.values() if c["total_slots"] > 0),
        "visa_type_counts": {},
    }
    for vt in VISA_TYPES:
        count = sum(
            summary[cid]["visa_types"][vt["id"]]["count"]
            for cid in summary
        )
        overall["visa_type_counts"][vt["id"]] = count

    return {
        "ok": True,
        "since_hours": hours,
        "overall": overall,
        "consulates": summary,
    }


@router.get("/status")
async def get_monitor_status():
    from slot_monitor import (  # noqa: E402
        _last_check, _total_checks, _slots_found, _notifications_sent,
        CHECK_INTERVAL, CHECKER_MODE,
    )

    last_slot = await usvisa_slots_col.find_one(sort=[("detected_at", -1)])
    total_slots_24h = await usvisa_slots_col.count_documents({
        "detected_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
    })

    alerts_config = {
        "telegram_configured": bool(os.environ.get("TELEGRAM_BOT_TOKEN")),
        "channel_id_set": bool(os.environ.get("TELEGRAM_VISA_CHANNEL")),
    }

    return {
        "ok": True,
        "mode": CHECKER_MODE,
        "check_interval_seconds": CHECK_INTERVAL,
        "last_check": _last_check,
        "stats": {
            "total_checks": _total_checks,
            "slots_found": _slots_found,
            "notifications_sent": _notifications_sent,
        },
        "total_slots_24h": total_slots_24h,
        "last_slot_detected_at": str(last_slot["detected_at"]) if last_slot else None,
        "alerts": alerts_config,
    }


@router.post("/subscribe")
async def subscribe(
    req: SubscribeRequest,
    user=Depends(get_current_user),
):
    await usvisa_subscriptions_col.update_one(
        {"user_id": user["_id"]},
        {"$set": {
            "user_id": user["_id"],
            "visa_types": req.visa_types,
            "consulates": req.consulates,
            "channel": req.channel,
            "telegram_chat_id": req.telegram_chat_id,
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )
    return {"ok": True, "message": "Subscribed to US visa slot alerts"}


@router.get("/subscription")
async def get_subscription(user=Depends(get_current_user)):
    sub = await usvisa_subscriptions_col.find_one({"user_id": user["_id"]})
    if not sub:
        return {"ok": True, "subscribed": False}
    return {"ok": True, "subscribed": True, "subscription": _serialize_sub(sub)}


@router.delete("/subscription")
async def unsubscribe(user=Depends(get_current_user)):
    await usvisa_subscriptions_col.delete_many({"user_id": user["_id"]})
    return {"ok": True, "message": "Unsubscribed from US visa slot alerts"}


@router.get("/telegram-groups")
async def get_telegram_groups():
    groups = []
    for vt in VISA_TYPES:
        if vt["id"] in TELEGRAM_GROUPS:
            groups.append({
                "visa_type": vt["id"],
                "visa_name": vt["name"],
                "visa_label": vt["label"],
                "telegram_link": TELEGRAM_GROUPS[vt["id"]],
            })
    return {
        "ok": True,
        "groups": groups,
        "whatsapp_number": WHATSAPP_NUMBER,
    }


@router.get("/consulates")
async def list_consulates():
    return {
        "ok": True,
        "consulates": US_CONSULATES_INDIA,
        "visa_types": VISA_TYPES,
    }


def _serialize_slots(slots: list[dict]) -> list[dict]:
    result = []
    for s in slots:
        result.append({
            "id": s["_id"],
            "consulate": s.get("consulate", ""),
            "consulate_name": s.get("consulate_name", ""),
            "city": s.get("city", ""),
            "visa_type": s.get("visa_type", ""),
            "visa_name": s.get("visa_name", ""),
            "visa_label": s.get("visa_label", ""),
            "date": s.get("date", ""),
            "time": s.get("time", ""),
            "day_of_week": s.get("day_of_week", ""),
            "detected_at": str(s.get("detected_at", "")),
        })
    return result


def _serialize_sub(sub: dict) -> dict:
    return {
        "visa_types": sub.get("visa_types", []),
        "consulates": sub.get("consulates", []),
        "channel": sub.get("channel", "in_app"),
        "has_telegram": bool(sub.get("telegram_chat_id")),
        "updated_at": str(sub.get("updated_at", "")),
    }
