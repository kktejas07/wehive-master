"""Appointment and deadline reminders, run by the hourly agent loop.

- Visa appointments (application.visa_appointment): 7 days, 1 day and 2 hours before.
- University application deadlines (application.university_selections[].deadline)
  for selections not yet submitted: 14 days, 3 days and 1 day before.

Each reminder window is sent once (notify_user dedupe_key). When the job first
sees an event already inside several windows, only the nearest one is sent.
Appointment dates/times are Indian consulate local time (IST).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from notify import notify_user

logger = logging.getLogger("wehive.reminders")

IST = timezone(timedelta(hours=5, minutes=30))
APPOINTMENT_WINDOWS = [("2h", timedelta(hours=2)), ("1d", timedelta(days=1)), ("7d", timedelta(days=7))]
DEADLINE_WINDOWS = [("1d", timedelta(days=1)), ("3d", timedelta(days=3)), ("14d", timedelta(days=14))]
OPEN_SELECTION = {"draft", "shortlisted", "in_progress", None, ""}
CLOSED_APPLICATION = {"approved", "rejected", "cancelled", "withdrawn", "completed"}


def due_window(event_at: datetime, now: datetime, windows) -> Optional[str]:
    """The nearest reminder window `now` has entered before `event_at`, else None.
    `windows` is ordered nearest first."""
    if now >= event_at:
        return None
    for label, before in windows:
        if now >= event_at - before:
            return label
    return None


def parse_appointment(appt: dict) -> Optional[datetime]:
    """visa_appointment {date: 'YYYY-MM-DD', time: 'HH:MM'} in IST -> aware UTC datetime."""
    try:
        day = datetime.strptime(str(appt.get("date"))[:10], "%Y-%m-%d")
        hh, mm = (str(appt.get("time") or "09:00").split(":") + ["0"])[:2]
        local = day.replace(hour=int(hh), minute=int(mm[:2]), tzinfo=IST)
    except (TypeError, ValueError):
        return None
    return local.astimezone(timezone.utc)


def parse_deadline(value) -> Optional[datetime]:
    """A deadline date counts until the end of that day, IST."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        day = datetime.strptime(str(value)[:10], "%Y-%m-%d")
    except (TypeError, ValueError):
        return None
    return day.replace(hour=23, minute=59, tzinfo=IST).astimezone(timezone.utc)


_WHEN = {"2h": "in about 2 hours", "1d": "tomorrow", "3d": "in 3 days", "7d": "in a week", "14d": "in 2 weeks"}


async def send_due_reminders(db, now: Optional[datetime] = None) -> int:
    """Send every reminder that is due. Returns how many were sent."""
    now = now or datetime.now(timezone.utc)
    sent = 0
    horizon = (now + timedelta(days=15)).astimezone(IST).strftime("%Y-%m-%d")
    today = now.astimezone(IST).strftime("%Y-%m-%d")
    query = {
        "status": {"$nin": list(CLOSED_APPLICATION)},
        "$or": [
            {"visa_appointment.date": {"$gte": today, "$lte": horizon}},
            {"university_selections.deadline": {"$ne": None}},
        ],
    }
    async for app in db["applications"].find(query).limit(2000):
        uid, app_id = app.get("user_id"), app["_id"]
        if not uid:
            continue
        link = f"/account/applications/{app_id}"

        appt = app.get("visa_appointment") or {}
        at = parse_appointment(appt) if appt else None
        label = due_window(at, now, APPOINTMENT_WINDOWS) if at else None
        if label:
            where = ", ".join(x for x in (appt.get("embassy"), appt.get("city")) if x) or "the consulate"
            res = await notify_user(
                uid,
                title=f"Visa appointment {_WHEN[label]}",
                body=f"Your visa appointment at {where} is on {appt.get('date')} at {appt.get('time') or 'the booked time'}. "
                     "Carry your passport, appointment letter and the documents on your checklist.",
                kind="appointment_reminder", link=link, application_id=app_id,
                dedupe_key=f"appt:{app_id}:{appt.get('date')}T{appt.get('time')}:{label}",
            )
            sent += 0 if res.get("skipped") else 1

        for sel in app.get("university_selections") or []:
            if sel.get("status") not in OPEN_SELECTION:
                continue
            deadline = parse_deadline(sel.get("deadline"))
            label = due_window(deadline, now, DEADLINE_WINDOWS) if deadline else None
            if not label:
                continue
            uni = (sel.get("university") or {}).get("name") or sel.get("university_id") or "your university"
            res = await notify_user(
                uid,
                title=f"Application deadline {_WHEN[label]}",
                body=f"The application deadline for {uni} is {str(sel.get('deadline'))[:10]}. Submit before it closes.",
                kind="deadline_reminder", link=link, application_id=app_id,
                dedupe_key=f"deadline:{app_id}:{sel.get('university_id')}:{str(sel.get('deadline'))[:10]}:{label}",
            )
            sent += 0 if res.get("skipped") else 1
    if sent:
        logger.info("Sent %d reminders", sent)
    return sent
