"""AI-powered flight suggestions.

We don't have a paid Amadeus / Kiwi key, but we can lean on Gemini via the
Emergent LLM key to generate *realistic* cheapest / most-popular / fastest
flight options between an origin (typically BLR or DEL) and the destination
country's main airport. Results are cached per (country, origin) for 6 hours
in Mongo so we don't pay for the same prompt twice during a session.

The shape returned is intentionally similar to what an Amadeus offer would
look like, so the frontend can swap providers later without churn.

  GET /api/flights/suggest?country=us&from=BLR
"""

from __future__ import annotations

import json
import os
import logging
import re
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from emergentintegrations.llm.chat import LlmChat, UserMessage

from db import db, countries_v2 as countries_col

router = APIRouter(prefix="/flights", tags=["flights"])
logger = logging.getLogger("wehive.flights")

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
CACHE_TTL = timedelta(hours=6)
flights_cache = db["flights_cache"]

PROMPT = """You are a flight pricing analyst for Indian travellers.
Suggest THREE realistic flights for a return trip from {origin} ({origin_city}) to {country_name}'s primary international airport for an Indian passport holder, departing roughly 4-8 weeks from today.

Return ONLY valid JSON (no markdown, no prose), exactly:
{{
  "currency": "INR",
  "routes": [
    {{
      "kind": "cheapest" | "popular" | "fastest",
      "airline": "Air India" | "Emirates" | etc,
      "code": "AI" | "EK" | etc (IATA),
      "logo_emoji": single flag emoji of airline's home country,
      "from": "{origin}",
      "to": "<destination IATA>",
      "stops": int,
      "duration_h": float,
      "price_inr": int
    }}
  ]
}}

Rules:
- Exactly 3 routes — one of each kind: cheapest, popular, fastest.
- Use airlines that *actually fly* this corridor commonly for Indians.
- Prices in INR for one return economy ticket, current market range.
- Duration in hours including layovers, one-way (not round trip).
- IATA codes only (3 letters for airports, 2 letters for airline).
- No commentary, no fences, JSON only.
"""

ORIGIN_CITY = {
    "BLR": "Bengaluru",
    "DEL": "Delhi",
    "BOM": "Mumbai",
    "MAA": "Chennai",
    "HYD": "Hyderabad",
    "CCU": "Kolkata",
    "COK": "Kochi",
}


def _cache_key(country_id: str, origin: str) -> str:
    return f"{country_id.lower()}__{origin.upper()}"


def _parse_json(text: str) -> dict | None:
    """Strip code fences, find first { ... } block, return parsed dict or None."""
    if not text:
        return None
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
        t = t.strip()
    m = re.search(r"\{.*\}", t, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception as e:
        logger.warning("flights JSON parse failed: %s", e)
        return None


def _normalise(payload: dict, country_id: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, r in enumerate(payload.get("routes") or []):
        kind = (r.get("kind") or "popular").lower()
        if kind not in {"cheapest", "popular", "fastest"}:
            kind = "popular"
        try:
            stops = int(r.get("stops") or 0)
            duration_h = float(r.get("duration_h") or 0)
            price_inr = int(r.get("price_inr") or 0)
        except (TypeError, ValueError):
            continue
        if price_inr <= 0 or duration_h <= 0:
            continue
        out.append({
            "id": f"{country_id}-{kind}-{i}",
            "kind": kind,
            "airline": (r.get("airline") or "").strip()[:60] or "—",
            "code": (r.get("code") or "").strip().upper()[:3],
            "logo": (r.get("logo_emoji") or "✈️").strip()[:4],
            "from": (r.get("from") or "").upper()[:3],
            "to": (r.get("to") or "").upper()[:3],
            "stops": max(0, min(stops, 4)),
            "duration_h": round(duration_h, 1),
            "price_inr": price_inr,
        })
    return out


async def _generate(country: dict, origin: str) -> list[dict[str, Any]]:
    if not EMERGENT_KEY:
        raise HTTPException(503, "AI service not configured")
    origin_city = ORIGIN_CITY.get(origin.upper(), origin)
    chat = (
        LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"flights-{country.get('id')}-{origin}",
            system_message="You are a precise flight pricing assistant. You always reply with valid JSON only.",
        )
        .with_model("gemini", "gemini-2.5-flash")
    )
    prompt = PROMPT.format(
        origin=origin.upper(),
        origin_city=origin_city,
        country_name=country.get("name") or country.get("id"),
    )
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("flights LLM failed: %s", e)
        raise HTTPException(502, "Flight suggestions service is busy. Please try again.") from e
    parsed = _parse_json(reply or "")
    if not parsed:
        raise HTTPException(502, "Could not parse flight suggestions response.")
    routes = _normalise(parsed, country.get("id") or "x")
    if not routes:
        raise HTTPException(502, "AI returned no usable flight suggestions.")
    return routes


@router.get("/suggest")
async def suggest_flights(
    country: str = Query(..., description="Country id (lowercase ISO-2)"),
    origin: str = Query("BLR", description="Origin IATA — BLR / DEL / BOM …"),
    refresh: bool = Query(False, description="Bypass the 6 h cache"),
):
    country_id = country.strip().lower()
    origin = origin.strip().upper() or "BLR"
    if len(country_id) < 2:
        raise HTTPException(400, "Invalid country id")

    country_doc = await countries_col.find_one({"id": country_id}, {"_id": 0, "id": 1, "name": 1})
    if not country_doc:
        raise HTTPException(404, "Country not found")

    key = _cache_key(country_id, origin)
    if not refresh:
        cached = await flights_cache.find_one({"_id": key})
        if cached and cached.get("expires_at") and cached["expires_at"] > datetime.utcnow():
            return {
                "country": country_doc,
                "origin": origin,
                "routes": cached.get("routes", []),
                "cached": True,
                "generated_at": cached.get("created_at").isoformat() if cached.get("created_at") else None,
            }

    routes = await _generate(country_doc, origin)
    now = datetime.utcnow()
    await flights_cache.update_one(
        {"_id": key},
        {"$set": {
            "country_id": country_id,
            "origin": origin,
            "routes": routes,
            "created_at": now,
            "expires_at": now + CACHE_TTL,
        }},
        upsert=True,
    )

    return {
        "country": country_doc,
        "origin": origin,
        "routes": routes,
        "cached": False,
        "generated_at": now.isoformat(),
    }
