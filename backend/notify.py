"""Deliver one notification to a user on every channel they allow.

- In-app: always (the bell / notifications list).
- Email: on unless the user turned it off (`notify_email: false`).
- WhatsApp: only when the user opted in (`notify_whatsapp: true`) and has a phone.

`dedupe_key` makes a send happen once: reminders and slot alerts pass a key per
event + window, so a scheduler that runs every hour never repeats itself.
Delivery failures are logged, never raised: a notification must not break the
request or loop that triggered it.
"""
from __future__ import annotations

import html
import logging
import uuid
from datetime import datetime
from typing import Optional

from config import FRONTEND_URL

logger = logging.getLogger("wehive.notify")


def _email_html(title: str, body: str, url: Optional[str]) -> str:
    from email_service import _wrap_html
    button = (
        f'<div style="text-align:center;margin:24px 0"><a href="{html.escape(url)}" '
        'style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;'
        'font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Open in WeHive</a></div>'
        if url else ""
    )
    content = (
        '<tr><td style="padding:0 32px;text-align:left">'
        f'<p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">{html.escape(body)}</p>'
        f"{button}</td></tr>"
    )
    return _wrap_html(html.escape(title), content)


async def notify_user(
    user_id: str,
    *,
    title: str,
    body: str,
    kind: str,
    link: Optional[str] = None,
    application_id: Optional[str] = None,
    dedupe_key: Optional[str] = None,
    email: bool = True,
    whatsapp: bool = True,
) -> dict:
    """Returns which channels were used, e.g. {"app": True, "email": True}."""
    from db import notifications_col, users

    if dedupe_key and await notifications_col.find_one({"dedupe_key": dedupe_key}, {"_id": 1}):
        return {"skipped": "already sent"}
    user = await users.find_one({"_id": user_id})
    if not user:
        return {"skipped": "no such user"}

    await notifications_col.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": kind,
        "title": title,
        "body": body,
        "message": body,  # older clients read `message`
        "application_id": application_id,
        "action_link": link,
        "dedupe_key": dedupe_key,
        "read": False,
        "created_at": datetime.utcnow(),
    })
    sent = {"app": True}
    url = f"{FRONTEND_URL}{link}" if link and link.startswith("/") else link

    if email and user.get("email") and user.get("notify_email", True):
        try:
            from email_service import send_email
            sent["email"] = await send_email(
                user["email"], f"WeHive: {title}", _email_html(title, body, url),
                text_body=f"{body}\n\n{url or ''}".strip(),
            )
        except Exception as e:
            logger.warning("Email notification to %s failed: %s", user_id, e)
            sent["email"] = False

    if whatsapp and user.get("phone") and user.get("notify_whatsapp"):
        try:
            from otp_providers import deliver_whatsapp_message
            res = await deliver_whatsapp_message(user["phone"], f"*{title}*\n{body}" + (f"\n{url}" if url else ""))
            sent["whatsapp"] = bool(res.get("ok"))
        except Exception as e:
            logger.warning("WhatsApp notification to %s failed: %s", user_id, e)
            sent["whatsapp"] = False
    return sent
