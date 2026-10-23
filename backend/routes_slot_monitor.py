import os
from datetime import datetime, timedelta
from typing import Optional

import uuid
from datetime import date as date_type
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from auth_utils import get_current_user
from db import usvisa_slots_col, usvisa_subscriptions_col
from rate_limit import RateLimit

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
    country: str = "usa"  # corridor id; one subscription per user per country
    visa_types: list[str] = ["b1b2"]
    consulates: list[str] = ["mumbai", "delhi", "chennai", "kolkata", "hyderabad"]
    channel: str = "in_app"
    telegram_chat_id: Optional[str] = None


@router.get("/slots")
async def get_slots(
    _user=Depends(get_current_user),  # slot data is for signed-in users
    consulate: Optional[str] = None,
    visa_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    hours: int = Query(24, ge=1, le=720),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    # User reports appear only after an admin approves them.
    q: dict = {"detected_at": {"$gte": since}, "status": {"$nin": ["pending", "rejected"]}}

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
    _user=Depends(get_current_user),
    hours: int = Query(24, ge=1, le=720),
    country: str = Query(
        "usa",
        description=(
            "Country code: usa, uk, schengen, canada, australia, uae, "
            "singapore, thailand, japan, south-korea"
        ),
    ),
):
    from slot_monitor import get_wait_times_for_display, load_official_for
    official = await load_official_for(country)
    data = get_wait_times_for_display(country, official)

    summary = {}
    consulates_with_data = 0
    visa_counts = {}

    for cid, cdata in data.items():
        wait_times = cdata.get("wait_times", {})
        has_data = any(
            wt.get("wait", "N/A") not in ("N/A", "")
            for wt in wait_times.values()
        )
        if has_data:
            consulates_with_data += 1

        summary[cid] = {
            "source": cdata.get("source"),
            "is_estimate": cdata.get("is_estimate", True),
            "name": cdata["name"],
            "city": cdata["city"],
            "jurisdiction": cdata.get("jurisdiction", ""),
            "booking_url": cdata.get("booking_url", ""),
            "visa_types": {},
            "total_slots": 0,
            "earliest_date": None,
        }
        for vt_id, vt_data in wait_times.items():
            wait_str = vt_data.get("wait", "N/A")
            summary[cid]["visa_types"][vt_id] = {
                "name": vt_data.get("visa", vt_id.upper()),
                "label": vt_data.get("visa", ""),
                "wait_time": wait_str,
                "estimate": vt_data.get("estimate", True),
                "available": wait_str != "N/A",
                "count": 1 if wait_str != "N/A" else 0,
                "earliest_date": wait_str,
            }
            if wait_str != "N/A":
                summary[cid]["total_slots"] += 1
                visa_counts[vt_id] = visa_counts.get(vt_id, 0) + 1

    overall = {
        "total_slots": sum(c["total_slots"] for c in summary.values()),
        "consulates_with_slots": consulates_with_data,
        "visa_type_counts": visa_counts,
    }

    return {
        "ok": True,
        "since_hours": hours,
        # "official_wait_times": government-published figures; otherwise hand-maintained estimates.
        "source": "official_wait_times" if official else "wait_time_estimates",
        "source_name": official.get("source_name") if official else None,
        "source_url": official.get("source_url") if official else None,
        # "next_available_appointment" (US) or "processing_time" (decision time after applying)
        "metric": official.get("metric") if official else None,
        "updated": official.get("updated") if official else None,
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


def _sub_filter(user_id: str, country: str) -> dict:
    """A user's subscription for one country. Subscriptions saved before
    per-country alerts have no country and are US ones."""
    if country == "usa":
        return {"user_id": user_id, "$or": [{"country": "usa"}, {"country": {"$exists": False}}]}
    return {"user_id": user_id, "country": country}


def _check_country(country: str) -> dict:
    from slot_monitor import CORRIDORS
    corridor = CORRIDORS.get(country)
    if not corridor:
        raise HTTPException(400, f"Unknown country: {country}")
    return corridor


@router.post("/subscribe")
async def subscribe(
    req: SubscribeRequest,
    user=Depends(get_current_user),
):
    corridor = _check_country(req.country)
    valid_visas = {v["id"] for v in corridor["visa_types"]}
    valid_centres = {c["id"] for c in corridor["consulates"]}
    visa_types = [v for v in req.visa_types if v in valid_visas]
    consulates = [c for c in req.consulates if c in valid_centres]
    if not visa_types or not consulates:
        raise HTTPException(400, "Pick at least one visa type and visa centre for this country.")
    await usvisa_subscriptions_col.delete_many(_sub_filter(user["_id"], req.country))
    await usvisa_subscriptions_col.insert_one({
        "user_id": user["_id"],
        "country": req.country,
        "visa_types": visa_types,
        "consulates": consulates,
        "channel": req.channel,
        "telegram_chat_id": req.telegram_chat_id,
        "updated_at": datetime.utcnow(),
    })
    return {"ok": True, "message": f"Subscribed to {corridor['name']} visa alerts"}


@router.get("/subscription")
async def get_subscription(country: str = "usa", user=Depends(get_current_user)):
    sub = await usvisa_subscriptions_col.find_one(_sub_filter(user["_id"], country))
    if not sub:
        return {"ok": True, "subscribed": False}
    return {"ok": True, "subscribed": True, "subscription": _serialize_sub(sub)}


@router.delete("/subscription")
async def unsubscribe(country: str = "usa", user=Depends(get_current_user)):
    await usvisa_subscriptions_col.delete_many(_sub_filter(user["_id"], country))
    return {"ok": True, "message": "Unsubscribed from visa alerts for this country"}


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


@router.get("/corridors")
async def list_corridors_endpoint():
    from slot_monitor import list_corridors
    return {"ok": True, "corridors": list_corridors()}


# ---------- slot reports from users ----------

_report_limiter = RateLimit(max_calls=5, window_seconds=3600)


class SlotReport(BaseModel):
    country: str = Field("usa", max_length=40)
    consulate: str = Field(max_length=40)
    visa_type: str = Field(max_length=40)
    date: date_type  # the appointment date the user saw open
    note: str = Field("", max_length=200)


@router.post("/reports", status_code=201)
async def report_slot(req: SlotReport, user=Depends(get_current_user), _=Depends(_report_limiter)):
    """A signed-in user reports an open appointment they just saw. It is held for
    admin review; once approved, subscribers for that centre and visa are alerted."""
    from routes_community import check_text
    corridor = _check_country(req.country)
    centre = next((c for c in corridor["consulates"] if c["id"] == req.consulate), None)
    visa = next((v for v in corridor["visa_types"] if v["id"] == req.visa_type), None)
    if not centre or not visa:
        raise HTTPException(400, "Pick a visa centre and visa type for this country.")
    today = datetime.utcnow().date()
    if not today <= req.date <= today + timedelta(days=366):
        raise HTTPException(400, "The slot date must be today or within the next year.")
    check_text(req.note)
    doc = {
        "_id": str(uuid.uuid4()),
        "source": "user_report", "status": "pending", "notified": False,
        "country": req.country, "consulate": centre["id"], "city": centre["city"],
        "consulate_name": centre["name"], "visa_type": visa["id"], "visa_name": visa["name"],
        "date": req.date.isoformat(), "note": req.note.strip(),
        "reported_by": user["_id"], "detected_at": datetime.utcnow(),
    }
    await usvisa_slots_col.insert_one(doc)
    return {"ok": True, "id": doc["_id"], "status": "pending"}


@router.get("/reports/pending")
async def pending_reports(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                          _admin=Depends(get_current_admin_flex)):
    """Admin review queue, shaped like the other moderation queues."""
    from slot_monitor import CORRIDORS
    q = {"source": "user_report", "status": "pending"}
    total = await usvisa_slots_col.count_documents(q)
    docs = await usvisa_slots_col.find(q).sort("detected_at", 1).skip((page - 1) * limit).to_list(limit)
    items = [{
        "id": d["_id"],
        "title": f"{d.get('visa_name')} slot on {d.get('date')} at {d.get('city')}",
        "source_name": f"{CORRIDORS.get(d.get('country'), {}).get('name', d.get('country'))} · user report",
        "date": str(d.get("detected_at", ""))[:16],
        "content": d.get("note") or "",
    } for d in docs]
    return {"items": items, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/reports/{report_id}/{action}")
async def moderate_report(report_id: str, action: Literal["approve", "reject"],
                          admin=Depends(get_current_admin_flex)):
    res = await usvisa_slots_col.update_one(
        {"_id": report_id, "source": "user_report", "status": "pending"},
        {"$set": {"status": "approved" if action == "approve" else "rejected",
                  "detected_at": datetime.utcnow(), "moderated_by": str(admin.get("_id") or "admin")}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Report not found or already reviewed")
    alerted = 0
    if action == "approve":  # slots go fast: alert now, not at the next monitor run
        from slot_monitor import dispatch_slot_alerts
        alerted = await dispatch_slot_alerts()
    return {"ok": True, "status": "approved" if action == "approve" else "rejected", "alerted": alerted}


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
            "source": s.get("source", ""),
            "country": s.get("country", "usa"),
        })
    return result


def _serialize_sub(sub: dict) -> dict:
    return {
        "country": sub.get("country", "usa"),
        "visa_types": sub.get("visa_types", []),
        "consulates": sub.get("consulates", []),
        "channel": sub.get("channel", "in_app"),
        "has_telegram": bool(sub.get("telegram_chat_id")),
        "updated_at": str(sub.get("updated_at", "")),
    }
