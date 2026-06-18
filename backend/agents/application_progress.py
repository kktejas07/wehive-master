"""Application Progress Agent — proactively tracks every application stage.

Monitors:
- Draft → Submitted → In Review → Approved/Rejected transitions
- Time spent in each stage (flag if > expected)
- Missing follow-up actions (appointment booking, document upload)
- Sends smart notifications on progress milestones
"""

from datetime import datetime, timedelta
from typing import List, Optional
import uuid

STAGE_EXPECTED_DAYS = {
    "draft": 7,
    "submitted": 3,
    "in_review": 21,
    "approved": 1,
    "rejected": 1,
}

STAGE_LABELS = {
    "draft": "Draft",
    "submitted": "Submitted",
    "in_review": "Under Review",
    "approved": "Approved ✅",
    "rejected": "Rejected ❌",
}


async def check_stalled_applications(db) -> List[dict]:
    """Find applications stuck in a stage beyond expected duration."""
    alerts = []
    now = datetime.utcnow()
    cur = db["applications"].find({"status": {"$in": ["draft", "submitted", "in_review"]}}).limit(50)
    async for app in cur:
        status = app.get("status", "draft")
        expected = STAGE_EXPECTED_DAYS.get(status, 7)
        updated = app.get("updated_at") or app.get("created_at", now)
        if isinstance(updated, str):
            continue
        days_in_stage = (now - updated).days
        if days_in_stage > expected:
            alerts.append({
                "user_id": app.get("user_id"),
                "application_id": app["_id"],
                "type": "stalled_application",
                "severity": "warning" if days_in_stage > expected * 2 else "info",
                "message": (
                    f"Your {app.get('visa_type', 'visa')} application for "
                    f"{app.get('country_name', app.get('country_id', '')).upper()} "
                    f"has been in '{STAGE_LABELS.get(status, status)}' for {days_in_stage} days "
                    f"(expected ~{expected} days)."
                ),
            })
    return alerts


async def check_missing_appointments(db) -> List[dict]:
    """Find in_review applications that still haven't booked an appointment."""
    reminders = []
    seven_days = datetime.utcnow() - timedelta(days=7)
    cur = db["applications"].find({
        "status": "in_review",
        "$or": [
            {"visa_appointment": {"$exists": False}},
            {"visa_appointment": None},
        ],
    }).limit(30)
    async for app in cur:
        updated = app.get("updated_at") or app.get("created_at", datetime.utcnow())
        if isinstance(updated, str):
            continue
        days_since = (datetime.utcnow() - updated).days
        reminders.append({
            "user_id": app.get("user_id"),
            "application_id": app["_id"],
            "type": "missing_appointment",
            "severity": "critical" if days_since > 14 else "warning",
            "message": (
                f"Your {app.get('visa_type', 'visa')} application for "
                f"{app.get('country_name', app.get('country_id', '')).upper()} "
                f"is in review but you haven't booked an embassy appointment yet. "
                f"{'It has been ' + str(days_since) + ' days!' if days_since > 14 else 'Book soon to avoid delays.'}"
            ),
        })
    return reminders


async def check_recent_approvals(db) -> List[dict]:
    """Celebrate approved applications and suggest next steps."""
    alerts = []
    three_days = datetime.utcnow() - timedelta(days=3)
    cur = db["applications"].find({
        "status": "approved",
        "updated_at": {"$gte": three_days},
    }).limit(20)
    async for app in cur:
        alerts.append({
            "user_id": app.get("user_id"),
            "application_id": app["_id"],
            "type": "visa_approved",
            "severity": "success",
            "message": (
                f"🎉 Congratulations! Your {app.get('visa_type', 'visa')} visa for "
                f"{app.get('country_name', app.get('country_id', '')).upper()} has been approved! "
                "Check your email for the visa document."
            ),
        })
    return alerts


async def run_all_checks(db) -> List[dict]:
    """Run all application progress checks."""
    results = []
    results.extend(await check_stalled_applications(db))
    results.extend(await check_missing_appointments(db))
    results.extend(await check_recent_approvals(db))
    return results
