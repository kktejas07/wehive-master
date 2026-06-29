"""Telegram Slot Reader — pulls real US visa slot availability from
public Telegram channels where users post about open appointment slots.

Legitimate approach:
  - Uses official Telegram Bot API (no scraping)
  - Reads from public channels only
  - Parses user messages with regex + LLM for slot dates, locations, visa types
  - Stores extracted slots in MongoDB for display

This replaces the scraping approach with crowdsourced, user-generated data.
"""

import logging
import os
import re
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger("wehive.telegram_slots")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_SLOT_CHANNELS = os.environ.get("TELEGRAM_SLOT_CHANNELS", "")

DEFAULT_CHANNELS = [
    {"username": "@USvisaAppointmentsHelp", "focus": "b1b2"},
    {"username": "@h1b_slots", "focus": "h1b"},
    {"username": "@visa_usa_b1_h1_b2_f1_slots_appo", "focus": "all"},
    {"username": "@US_F1_Visa_Updates", "focus": "f1"},
    {"username": "@US_H1B_Visa_Updates", "focus": "h1b"},
]

CONSULATE_KEYWORDS = {
    "mumbai": ["mumbai", "bombay"],
    "delhi": ["delhi", "new delhi", "newdelhi"],
    "chennai": ["chennai", "madras"],
    "kolkata": ["kolkata", "calcutta"],
    "hyderabad": ["hyderabad", "hyd"],
}

VISA_TYPE_KEYWORDS = {
    "b1b2": ["b1", "b2", "b1/b2", "tourist", "visitor", "business visa"],
    "f1": ["f1", "f-1", "student", "student visa"],
    "h1b": ["h1b", "h1-b", "h-1b", "h1", "work visa"],
    "h4": ["h4", "h-4", "dependent"],
    "l1": ["l1", "l-1", "l1a", "l1b", "intra-company"],
    "j1": ["j1", "j-1", "exchange", "exchange visitor"],
}

DATE_PATTERNS = [
    re.compile(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'),
    re.compile(r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})', re.I),
    re.compile(r'(?:available|open|slots?|appointment)(?:[^.]*?)(\d{1,2}[/-]\d{1,2})', re.I),
]

SLOT_INDICATOR_KEYWORDS = [
    "slot", "slots", "available", "open", "appointment", "booking",
    "dates", "date", "booked", "got slot", "confirmed",
]


async def _telegram_get(endpoint: str, params: dict = None) -> Optional[dict]:
    if not TELEGRAM_BOT_TOKEN:
        return None
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{endpoint}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=params) if params else await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data if data.get("ok") else None
            return None
    except Exception as e:
        logger.debug("Telegram API error: %s", e)
        return None


def _extract_dates(text: str) -> list[str]:
    dates = []
    for pat in DATE_PATTERNS:
        matches = pat.findall(text)
        dates.extend(matches)
    return list(set(dates))[:5]


def _detect_consulate(text: str) -> Optional[str]:
    text_lower = text.lower()
    for cid, keywords in CONSULATE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return cid
    return None


def _detect_visa_type(text: str) -> Optional[str]:
    text_lower = text.lower()
    for vt_id, keywords in VISA_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return vt_id
    return None


def _is_slot_message(text: str) -> bool:
    text_lower = text.lower()
    indicators = sum(1 for kw in SLOT_INDICATOR_KEYWORDS if kw in text_lower)
    return indicators >= 1


async def parse_slot_message(text: str) -> Optional[dict]:
    """Use LLM to parse slot information from a Telegram message."""
    if not _is_slot_message(text):
        return None

    try:
        from model_router import chat_with_profile
        response = await chat_with_profile(
            "fast_cheap",
            [
                {"role": "system", "content": (
                    "Extract US visa appointment slot information from this Telegram message. "
                    "Return JSON: {\"visa_type\": \"b1b2|f1|h1b|h4|l1|j1\", "
                    "\"consulate\": \"mumbai|delhi|chennai|kolkata|hyderabad\", "
                    "\"dates\": [\"YYYY-MM-DD\"], \"has_slots\": true/false, "
                    "\"summary\": \"...\"}. "
                    "If no clear slot info, return {\"has_slots\": false}. Only JSON."
                )},
                {"role": "user", "content": f"Message: {text[:500]}"},
            ],
            max_tokens=200,
            temperature=0.1,
        )
        content = response.get("content", "{}")
        import json
        return json.loads(content)
    except Exception:
        pass

    dates = _extract_dates(text)
    consulate = _detect_consulate(text)
    visa_type = _detect_visa_type(text)

    if dates:
        return {
            "visa_type": visa_type or "unknown",
            "consulate": consulate or "unknown",
            "dates": dates,
            "has_slots": True,
            "summary": text[:200],
            "parsed_by": "regex",
        }
    return None


async def read_channel(channel_username: str, limit: int = 50) -> list[dict]:
    """Read recent messages from a Telegram channel and extract slot info."""
    if not TELEGRAM_BOT_TOKEN:
        return []

    result = await _telegram_get("getUpdates", {
        "limit": min(limit, 100),
        "timeout": 15,
    })

    if not result or "result" not in result:
        return []

    slots_found = []
    for update in result["result"]:
        msg = update.get("message", {}) or update.get("channel_post", {})
        text = msg.get("text", "") or msg.get("caption", "")
        chat = msg.get("chat", {})

        chat_username = chat.get("username", "")
        if channel_username.lstrip("@").lower() not in chat_username.lower():
            continue

        if not text or len(text) < 10:
            continue

        parsed = await parse_slot_message(text)
        if parsed and parsed.get("has_slots"):
            slot_data = {
                "source": "telegram",
                "channel": channel_username,
                "message_id": msg.get("message_id"),
                "message_date": datetime.fromtimestamp(msg.get("date", 0)).isoformat()
                if msg.get("date") else "",
                "text_preview": text[:200],
                **parsed,
            }
            slots_found.append(slot_data)

    return slots_found


async def read_all_channels() -> list[dict]:
    """Read from all configured Telegram slot channels."""
    channels = DEFAULT_CHANNELS

    if TELEGRAM_SLOT_CHANNELS:
        custom = [c.strip() for c in TELEGRAM_SLOT_CHANNELS.split(",") if c.strip()]
        channels = [{"username": c, "focus": "all"} for c in custom]

    all_slots = []
    for ch in channels:
        try:
            slots = await read_channel(ch["username"])
            for s in slots:
                s["channel_focus"] = ch.get("focus", "all")
            all_slots.extend(slots)
            if slots:
                logger.info("Found %d slot mentions in %s", len(slots), ch["username"])
        except Exception as e:
            logger.debug("Channel %s read error: %s", ch["username"], e)

    return all_slots


async def store_telegram_slots(slots: list[dict]):
    """Store extracted Telegram slot mentions in MongoDB."""
    if not slots:
        return 0

    from db import usvisa_slots_col
    import uuid

    stored = 0
    for s in slots:
        for date_str in s.get("dates", []):
            try:
                normalized_date = date_str
                if "/" in date_str:
                    parts = date_str.split("/")
                    normalized_date = f"20{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}" \
                        if len(parts[2]) == 2 else f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
            except Exception:
                normalized_date = datetime.utcnow().strftime("%Y-%m-%d")

            existing = await usvisa_slots_col.find_one({
                "source_channel": s.get("channel", ""),
                "source_message_id": s.get("message_id"),
                "date": normalized_date,
            })
            if not existing:
                await usvisa_slots_col.insert_one({
                    "_id": str(uuid.uuid4()),
                    "consulate": s.get("consulate", "unknown"),
                    "visa_type": s.get("visa_type", "unknown"),
                    "date": normalized_date,
                    "time": s.get("summary", "")[:100],
                    "day_of_week": "",
                    "check_date": datetime.utcnow().strftime("%Y-%m-%d"),
                    "detected_at": datetime.utcnow(),
                    "source": "telegram_channel",
                    "source_channel": s.get("channel", ""),
                    "source_message_id": s.get("message_id"),
                    "text_preview": s.get("text_preview", "")[:200],
                    "notified": False,
                })
                stored += 1

    return stored


def telegram_slot_status() -> dict:
    return {
        "configured": bool(TELEGRAM_BOT_TOKEN),
        "channels": [c["username"] for c in DEFAULT_CHANNELS],
        "channels_count": len(DEFAULT_CHANNELS),
    }
