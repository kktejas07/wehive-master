import asyncio
import logging
from datetime import datetime, timedelta
import json
import os
import re
import uuid

from db import db
from ai_marketplace import marketplace

logger = logging.getLogger("wehive.intake_aggregator")

global_intakes_col = db["global_intakes"]

SYSTEM_USER_ID = "system_aggregator"
REFRESH_HOURS = int(os.environ.get("INTAKE_REFRESH_HOURS", "24"))

TARGET_COUNTRIES = [
    "USA", "United Kingdom", "Canada", "Australia",
    "Germany", "France", "Ireland", "New Zealand", "Netherlands",
    "Singapore", "Russia", "China", "Italy", "Philippines"
]

async def run_aggregator():
    """Runs the LLM aggregator to extract real-time intake data globally (excluding India)."""
    latest = await global_intakes_col.find_one({}, sort=[("fetched_at", -1)])
    if latest and isinstance(latest.get("fetched_at"), datetime) and \
            datetime.utcnow() - latest["fetched_at"] < timedelta(hours=REFRESH_HOURS):
        logger.info("Intake aggregator skipped: data refreshed within the last %dh.", REFRESH_HOURS)
        return {"status": "skipped", "reason": f"fresh (< {REFRESH_HOURS}h old)"}

    logger.info("Starting intake aggregator agent...")

    # We ask the LLM to output a JSON list of countries with intakes broken down by track
    prompt = f"""
You are an expert global education admissions counselor.
Generate the standard university application intake cycles and deadlines for the NEXT 6 MONTHS for the following countries:
{", ".join(TARGET_COUNTRIES)}
Important: EXCLUDE India. Do not generate data for India.

For each country, provide the intake schedule broken down into 3 tracks:
1. "Engineering & Masters" (Standard MS, MEng, BEng, BS)
2. "MBA" (Business Schools, usually Round 1, Round 2, Round 3)
3. "MBBS" (Medicine, specify any clinical/entrance deadlines like MCAT, UKCAT, BMAT)

Return ONLY valid JSON in this exact structure:
[
  {{
    "country": "Canada",
    "flag": "🇨🇦",
    "color": "#ef4444",
    "tracks": {{
      "Engineering & Masters": [
        {{ "name": "Fall / September", "months": "Sep-Dec", "apply_start": "Jan", "apply_end": "Jun", "popular": true }}
      ],
      "MBA": [
        {{ "name": "Round 1", "months": "Sep", "apply_start": "Jul", "apply_end": "Sep", "popular": true }}
      ],
      "MBBS": [
        {{ "name": "Medicine Intake", "months": "Sep", "apply_start": "May", "apply_end": "Oct", "popular": true }}
      ]
    }},
    "notes": "Fall is primary..."
  }}
]

Return only the raw JSON. No markdown fences. No prose.
"""

    # Scheduled runs use the platform key pool under a system identity, calling the
    # provider directly: no per-user free-token quota, and no local template
    # fallback (which returns prose, not JSON).
    provider, _pid = await marketplace.get_active_provider(SYSTEM_USER_ID)
    if provider is None:
        logger.info("Intake aggregator skipped: no LLM provider configured (set an LLM key or Settings -> Default LLM).")
        return {"status": "skipped", "reason": "no LLM provider configured"}

    try:
        reply = await provider.chat(
            system_prompt="You are a JSON-only API.",
            user_prompt=prompt,
            max_tokens=4000,
        )
        await marketplace._estimate_and_track_usage(SYSTEM_USER_ID, prompt, reply or "")

        reply = (reply or "").strip()
        m = re.search(r"\[.*\]", reply, re.DOTALL)
        if m:
            data = json.loads(m.group(0))
        else:
            data = json.loads(reply)

        if not isinstance(data, list):
            raise ValueError("Expected a JSON list")

        # Store in DB
        batch_id = str(uuid.uuid4())
        docs = []
        for c in data:
            c["_id"] = str(uuid.uuid4())
            c["batch_id"] = batch_id
            c["fetched_at"] = datetime.utcnow()
            c["source"] = "ai_generated"
            docs.append(c)

        if docs:
            # Clear old and insert new (for simplicity, we just keep the latest)
            await global_intakes_col.delete_many({})
            await global_intakes_col.insert_many(docs)
            logger.info(f"Successfully aggregated {len(docs)} countries' intake data.")

        return {"status": "ok" if docs else "empty", "inserted": len(docs)}

    except Exception as e:
        logger.error(f"Failed to run intake aggregator: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    asyncio.run(run_aggregator())
