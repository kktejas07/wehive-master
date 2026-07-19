import asyncio
import logging
from datetime import datetime
import json
import os
import uuid

from db import db
from ai_marketplace import marketplace

logger = logging.getLogger("wehive.intake_aggregator")

global_intakes_col = db["global_intakes"]

TARGET_COUNTRIES = [
    "USA", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Ireland", "New Zealand", "Netherlands"
]

async def run_aggregator():
    """Runs the LLM aggregator to extract real-time intake data globally (excluding India)."""
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

    try:
        reply = await marketplace.chat(
            user_id="system_aggregator",
            system_prompt="You are a JSON-only API.",
            user_prompt=prompt,
            max_tokens=4000
        )
        
        reply = reply.strip()
        import re
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
            docs.append(c)
            
        if docs:
            # Clear old and insert new (for simplicity, we just keep the latest)
            await global_intakes_col.delete_many({})
            await global_intakes_col.insert_many(docs)
            logger.info(f"Successfully aggregated {len(docs)} countries' intake data.")
            
        return {"status": "ok", "countries_processed": len(docs)}
        
    except Exception as e:
        logger.error(f"Failed to run intake aggregator: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    asyncio.run(run_aggregator())
