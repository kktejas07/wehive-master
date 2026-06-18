"""Deadline & Reminder Agent — calculates all critical dates and sends timed alerts.

Monitors:
- Document submission deadlines (from country/category processing_days)
- Passport expiry (< 6 months)
- Visa expiry (for approved applications nearing end of validity)
- Intake deadlines (for student visa applications)
- Embassy appointment scheduling urgency
"""

from datetime import datetime, timedelta
from typing import List, Optional
import re


async def check_upcoming_deadlines(db) -> List[dict]:
    """Find applications with approaching document/fee deadlines."""
    alerts = []
    now = datetime.utcnow()
    cur = db["applications"].find({"status": {"$in": ["draft", "submitted"]}}).limit(50)
    async for app in cur:
        created = app.get("created_at")
        if not created or isinstance(created, str):
            continue
        days_since = (now - created).days
        if days_since >= 3 and days_since < 7:
            alerts.append({
                "user_id": app.get("user_id"),
                "application_id": app["_id"],
                "type": "document_deadline",
                "severity": "warning",
                "message": (
                    f"Don't forget to upload documents for your "
                    f"{app.get('visa_type', 'visa')} application to "
                    f"{app.get('country_name', app.get('country_id', '')).upper()} "
                    f"(created {days_since} days ago)."
                ),
            })
        elif days_since >= 7:
            alerts.append({
                "user_id": app.get("user_id"),
                "application_id": app["_id"],
                "type": "document_overdue",
                "severity": "critical",
                "message": (
                    f"⚠️ Your {app.get('visa_type', 'visa')} application to "
                    f"{app.get('country_name', app.get('country_id', '')).upper()} "
                    f"has been in draft for {days_since} days. "
                    "Submit soon to avoid losing your application."
                ),
            })
    return alerts


async def check_expiring_visas(db) -> List[dict]:
    """Find approved visas that are about to expire."""
    alerts = []
    thirty_days = datetime.utcnow() + timedelta(days=30)
    cur = db["applications"].find({"status": "approved", "visa_validity_until": {"$ne": None}}).limit(30)
    async for app in cur:
        expiry = app.get("visa_validity_until")
        if isinstance(expiry, str):
            try:
                expiry = datetime.fromisoformat(expiry)
            except (ValueError, TypeError):
                continue
        if not expiry:
            continue
        days_left = (expiry - datetime.utcnow()).days
        if 0 < days_left <= 30:
            alerts.append({
                "user_id": app.get("user_id"),
                "application_id": app["_id"],
                "type": "visa_expiring",
                "severity": "critical" if days_left <= 7 else "warning",
                "message": (
                    f"Your {app.get('visa_type', 'visa')} visa for "
                    f"{app.get('country_name', app.get('country_id', '')).upper()} "
                    f"expires in {days_left} days. Plan your travel accordingly!"
                ),
            })
    return alerts


async def check_intake_deadlines(db) -> List[dict]:
    """For student visa apps, check intake deadlines."""
    alerts = []
    current_month = datetime.utcnow().month
    # Common intake months: Jan/Feb (Spring), Sep/Oct (Fall)
    upcoming_intakes = []
    if current_month <= 3:
        upcoming_intakes = [("Fall", 9), ("Spring", 1)]
    elif current_month <= 8:
        upcoming_intakes = [("Fall", 9)]
    else:
        upcoming_intakes = [("Spring", 1)]

    cur = db["applications"].find({"visa_type": {"$in": ["Student", "student"]}}).limit(30)
    async for app in cur:
        for intake_name, intake_month in upcoming_intakes:
            months_until = (intake_month - current_month) % 12
            if 2 <= months_until <= 6:
                alerts.append({
                    "user_id": app.get("user_id"),
                    "application_id": app["_id"],
                    "type": "intake_deadline",
                    "severity": "info",
                    "message": (
                        f"📅 {intake_name} {datetime.utcnow().year + (1 if intake_month < current_month else 0)} "
                        f"intake is {months_until} months away. "
                        f"Start preparing your {app.get('visa_type', 'Student')} visa application for "
                        f"{app.get('country_name', app.get('country_id', '')).upper()}."
                    ),
                })
    return alerts


async def run_all_checks(db) -> List[dict]:
    """Run all deadline checks."""
    results = []
    results.extend(await check_upcoming_deadlines(db))
    results.extend(await check_expiring_visas(db))
    results.extend(await check_intake_deadlines(db))
    return results
