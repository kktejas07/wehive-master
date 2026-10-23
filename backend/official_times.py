"""Official visa time sources, one per destination corridor.

Each source publishes a figure per visa type for applicants in India:
- usa:    US State Department, next available interview appointment per consulate
          (handled in slot_monitor.refresh_official_wait_times, per consulate).
- canada: IRCC processing time (country-level).
- uk:     Home Office service standard processing time (country-level).

Country-level figures apply to every visa centre in the corridor. To add a
country: write an adapter whose fetch() returns {"updated", "visa": {visa_id: value}}
with the corridor's visa ids, and register it in SOURCES.

Destinations with no machine-readable official source keep the hand-maintained
estimates (labelled "Estimated" on the site).
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from adapters import govuk_processing_times as govuk
from adapters import ircc_processing_times as ircc

logger = logging.getLogger("wehive.official_times")

REFRESH_SECONDS = 12 * 3600

SOURCES = {
    "canada": {"fetch": ircc.fetch, "name": ircc.SOURCE_NAME, "url": ircc.PAGE_URL, "metric": "processing_time"},
    "uk": {"fetch": govuk.fetch, "name": govuk.SOURCE_NAME, "url": govuk.PAGE_URL, "metric": "processing_time"},
}


def _col():
    from db import db
    return db["official_processing_times"]


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
