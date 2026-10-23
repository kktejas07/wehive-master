"""Official visa time sources, one per destination corridor.

Each source publishes a figure per visa type for applicants in India:
- usa:    US State Department, next available interview appointment per consulate
          (handled in slot_monitor.refresh_official_wait_times, per consulate).
- canada: IRCC processing time (country-level).
- uk:     Home Office service standard processing time (country-level).
- ireland: Embassy of Ireland, New Delhi processing time (country-level).

Country-level figures apply to every visa centre in the corridor. To add a
country: write an adapter whose fetch() returns {"updated", "visa": {visa_id: value}}
with the corridor's visa ids, and register it in SOURCES.

Destinations with no machine-readable official source keep the hand-maintained
estimates (labelled "Estimated" on the site).
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Optional

from adapters import govuk_processing_times as govuk
from adapters import ircc_processing_times as ircc
from adapters import ireland_processing_times as ireland

logger = logging.getLogger("wehive.official_times")

REFRESH_SECONDS = 12 * 3600

SOURCES = {
    "canada": {"fetch": ircc.fetch, "name": ircc.SOURCE_NAME, "url": ircc.PAGE_URL, "metric": "processing_time"},
    "uk": {"fetch": govuk.fetch, "name": govuk.SOURCE_NAME, "url": govuk.PAGE_URL, "metric": "processing_time"},
    "ireland": {"fetch": ireland.fetch, "name": ireland.SOURCE_NAME, "url": ireland.PAGE_URL,
                "metric": "processing_time"},
}


def _col():
    from db import db
    return db["official_processing_times"]


# A processing-time drop worth alerting on: at least a week AND a quarter shorter.
DROP_MIN_DAYS = 7
DROP_MIN_FRACTION = 0.25


def to_days(value: Optional[str]) -> Optional[float]:
    """'29 days' -> 29, '8 weeks' -> 56, '6-8 weeks' -> 49 (midpoint), '2 months' -> 60."""
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|to|–)?\s*(\d+(?:\.\d+)?)?\s*(?:working\s+)?(day|week|month)",
                  (value or "").lower())
    if not m:
        return None
    low = float(m.group(1))
    high = float(m.group(2)) if m.group(2) else low
    return (low + high) / 2 * {"day": 1, "week": 7, "month": 30}[m.group(3)]


async def _alert_drops(corridor: str, drops: list, updated: Optional[str]) -> int:
    """Notify this country's subscribers whose visa types got faster."""
    from db import usvisa_subscriptions_col
    from notify import notify_user
    from slot_monitor import CORRIDORS

    info = CORRIDORS.get(corridor, {})
    names = {v["id"]: v["name"] for v in info.get("visa_types", [])}
    src = SOURCES[corridor]
    alerted = 0
    async for sub in usvisa_subscriptions_col.find({"country": corridor}):
        mine = [d for d in drops if d[0] in (sub.get("visa_types") or [])]
        if not mine:
            continue
        lines = [f"{names.get(v, v)}: now {new} (was {old})" for v, old, new in mine]
        await notify_user(
            sub["user_id"],
            title=f"{info.get('name', corridor)} visa processing got faster",
            body="; ".join(lines) + f". Processing time per the {src['name']}" + (f" (updated {updated})." if updated else "."),
            kind="processing_time_drop",
            link="/us-visa-slots",
            dedupe_key=f"ptdrop:{sub['user_id']}:{corridor}:{updated}:" + ",".join(d[0] for d in mine),
        )
        alerted += 1
    return alerted


async def refresh_all(force: bool = False) -> dict:
    """Fetch each stale source (older than 12h) and store it. Failures are logged
    per source and keep the last good figures."""
    results = {}
    now = datetime.utcnow()
    for corridor, src in SOURCES.items():
        prev = await _col().find_one({"_id": corridor}) or {}
        last = prev.get("fetched_at")
        if not force and last and (now - last).total_seconds() < REFRESH_SECONDS:
            results[corridor] = "fresh"
            continue
        try:
            data = await src["fetch"]()
        except Exception as e:
            logger.warning("Official times for %s failed: %s", corridor, e)
            results[corridor] = "error"
            continue
        if not data.get("visa"):
            logger.warning("Official times for %s parsed with no figures; page layout may have changed", corridor)
            results[corridor] = "empty"
            continue
        await _col().update_one({"_id": corridor}, {"$set": {
            "visa": data["visa"], "updated": data.get("updated"), "fetched_at": now,
        }}, upsert=True)
        results[corridor] = "ok"
        drops = []  # (visa_id, old_value, new_value)
        if prev.get("visa") and prev.get("updated") != data.get("updated"):
            for visa_id, value in data["visa"].items():
                old_v = prev["visa"].get(visa_id)
                old_d, new_d = to_days(old_v), to_days(value)
                if (old_d is not None and new_d is not None
                        and old_d - new_d >= DROP_MIN_DAYS and new_d <= old_d * (1 - DROP_MIN_FRACTION)):
                    drops.append((visa_id, old_v, value))
        if drops:
            try:
                await _alert_drops(corridor, drops, data.get("updated"))
            except Exception as e:
                logger.warning("Drop alerts for %s failed: %s", corridor, e)
    return results


async def load(corridor: str, consulate_ids: list[str]) -> Optional[dict]:
    """Stored figures shaped like the US loader: {"updated", "posts": {cid: {visa_id: value}},
    "source_name", "source_url", "metric"}, or None when there is no official source/data."""
    src = SOURCES.get(corridor)
    if not src:
        return None
    doc = await _col().find_one({"_id": corridor})
    if not doc or not doc.get("visa"):
        return None
    return {
        "updated": doc.get("updated"),
        "posts": {cid: dict(doc["visa"]) for cid in consulate_ids},
        "source_name": src["name"], "source_url": src["url"], "metric": src["metric"],
    }
