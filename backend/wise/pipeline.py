"""Wise Country Rules Pipeline — nightly sync of visa/entry requirements.

Fetches country rules from external sources (Sherpa API when configured,
internal countries_v2 as fallback), diffs against stored knowledge chunks,
re-embeds changed content, and writes a pipeline_runs audit entry.

Schedule: daily at 02:00 UTC (configured in startup_pipeline.py).
"""
from __future__ import annotations

import hashlib
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

from db import visa_knowledge_col, pipeline_runs_col, countries_v2

logger = logging.getLogger("wehive.wise.pipeline")

SHERPA_API_KEY = os.getenv("SHERPA_API_KEY", "")
SHERPA_BASE = "https://requirements.sherpa.io/v2"


# ---------------------------------------------------------------------------
# Source adapters
# ---------------------------------------------------------------------------

async def _fetch_sherpa_rules(country_iso: str) -> Optional[List[Dict]]:
    """Fetch visa requirements from Sherpa API for *country_iso* (ISO-3166-1 alpha-2)."""
    if not SHERPA_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{SHERPA_BASE}/visa-requirements",
                params={"destination": country_iso},
                headers={"Authorization": f"Bearer {SHERPA_API_KEY}"},
            )
            resp.raise_for_status()
            data = resp.json()
            chunks = []
            for item in data.get("requirements", []):
                text = (
                    f"Country: {country_iso}\n"
                    f"Visa Type: {item.get('visaType', 'General')}\n"
                    f"Requirements: {item.get('description', '')}\n"
                    f"Processing Time: {item.get('processingTime', 'N/A')}\n"
                    f"Fee: {item.get('fee', 'N/A')}\n"
                    f"Validity: {item.get('validity', 'N/A')}\n"
                    f"Source: {item.get('sourceUrl', SHERPA_BASE)}"
                )
                chunks.append({
                    "country": country_iso,
                    "visa_type": item.get("visaType", "General"),
                    "text": text,
                    "source_url": item.get("sourceUrl", SHERPA_BASE),
                    "hash": hashlib.sha256(text.encode()).hexdigest(),
                })
            return chunks
    except Exception as exc:
        logger.warning("Sherpa fetch failed for %s: %s", country_iso, exc)
        return None


async def _fetch_internal_rules(country_iso: str) -> List[Dict]:
    """Generate knowledge chunks from internal countries_v2 collection."""
    doc = await countries_v2.find_one({"iso": country_iso.upper()})
    if not doc:
        return []

    chunks = []
    name = doc.get("name", country_iso)

    # General entry requirements
    entry_text = (
        f"Country: {name} ({country_iso})\n"
        f"Visa Types: {', '.join(doc.get('visa_types', []))}\n"
        f"Entry Requirements: {doc.get('entry_requirements', 'See official government website')}\n"
        f"Processing Time: {doc.get('processing_time', 'Varies')}\n"
        f"Embassy: {doc.get('embassy_url', '')}"
    )
    chunks.append({
        "country": country_iso,
        "visa_type": "General",
        "text": entry_text,
        "source_url": doc.get("embassy_url", ""),
        "hash": hashlib.sha256(entry_text.encode()).hexdigest(),
    })

    # Per visa-type details
    for vt in doc.get("visa_details", []):
        vt_text = (
            f"Country: {name} ({country_iso})\n"
            f"Visa Type: {vt.get('type', '')}\n"
            f"Requirements: {vt.get('requirements', '')}\n"
            f"Duration: {vt.get('duration', '')}\n"
            f"Fee: {vt.get('fee', '')}"
        )
        chunks.append({
            "country": country_iso,
            "visa_type": vt.get("type", "General"),
            "text": vt_text,
            "source_url": doc.get("embassy_url", ""),
            "hash": hashlib.sha256(vt_text.encode()).hexdigest(),
        })

    return chunks


# ---------------------------------------------------------------------------
# Diff + upsert
# ---------------------------------------------------------------------------

async def _upsert_chunk(chunk: Dict) -> bool:
    """Return True if chunk was new or updated."""
    from wise.embeddings import embed

    existing = await visa_knowledge_col.find_one({
        "country": chunk["country"],
        "visa_type": chunk["visa_type"],
        "source_url": chunk["source_url"],
    }, {"hash": 1})

    if existing and existing.get("hash") == chunk["hash"]:
        return False  # unchanged

    vec = await embed(chunk["text"])
    await visa_knowledge_col.update_one(
        {"country": chunk["country"], "visa_type": chunk["visa_type"],
         "source_url": chunk["source_url"]},
        {"$set": {
            "text": chunk["text"],
            "hash": chunk["hash"],
            "embedding": vec,
            "last_updated": datetime.now(timezone.utc),
        }, "$setOnInsert": {
            "_id": str(uuid.uuid4()),
            "country": chunk["country"],
            "visa_type": chunk["visa_type"],
            "source_url": chunk["source_url"],
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return True


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

async def run_pipeline(countries: Optional[List[str]] = None) -> Dict:
    """Run the country rules sync pipeline.

    Args:
        countries: List of ISO-3166-1 alpha-2 codes. None = all active countries.

    Returns:
        Run summary dict.
    """
    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)
    logger.info("[pipeline] Starting run %s", run_id)

    if countries is None:
        # Fetch all active countries from DB
        docs = await countries_v2.find(
            {"status": {"$in": ["active", "enabled"]}},
            {"iso": 1}
        ).to_list(length=500)
        countries = [d.get("iso") or d.get("code") for d in docs if d.get("iso") or d.get("code")]

    checked = 0
    diffs_found = 0
    errors = []

    for country_iso in countries:
        try:
            # Try Sherpa first, then internal
            chunks = await _fetch_sherpa_rules(country_iso)
            if not chunks:
                chunks = await _fetch_internal_rules(country_iso)

            for chunk in chunks:
                checked += 1
                updated = await _upsert_chunk(chunk)
                if updated:
                    diffs_found += 1

        except Exception as exc:
            logger.error("Pipeline error for %s: %s", country_iso, exc)
            errors.append({"country": country_iso, "error": str(exc)})

    finished_at = datetime.now(timezone.utc)
    duration_s = (finished_at - started_at).total_seconds()

    run_doc = {
        "_id": run_id,
        "run_id": run_id,
        "run_at": started_at,
        "finished_at": finished_at,
        "duration_seconds": duration_s,
        "countries_checked": checked,
        "diffs_found": diffs_found,
        "errors": errors,
        "status": "error" if errors else "success",
    }
    await pipeline_runs_col.insert_one(run_doc)
    logger.info(
        "[pipeline] Run %s complete — checked=%d diffs=%d errors=%d (%.1fs)",
        run_id, checked, diffs_found, len(errors), duration_s
    )
    return run_doc


# ---------------------------------------------------------------------------
# APScheduler registration (called from server startup)
# ---------------------------------------------------------------------------

def schedule_pipeline(scheduler) -> None:
    """Add nightly pipeline job to an APScheduler AsyncIOScheduler."""
    scheduler.add_job(
        run_pipeline,
        trigger="cron",
        hour=2,
        minute=0,
        id="wise_country_pipeline",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    logger.info("Wise country pipeline scheduled: daily 02:00 UTC")
