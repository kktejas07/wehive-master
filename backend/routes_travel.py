import json
import re
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends

import google_kg
from ai_marketplace import marketplace
from auth_utils import get_current_user
from db import db
from eva_tools import lookup_country

router = APIRouter(prefix="/travel", tags=["travel"])
logger = logging.getLogger("wehive.travel")

travel_cache = db["travel_planner_cache"]


async def _destination(country: str) -> tuple[str, Optional[dict]]:
    """Display name + Knowledge Graph card; never raises — returns (country, None) on any error."""
    try:
        data = await lookup_country(country)
        name = (data or {}).get("name") or country
        e = await google_kg.lookup(name, types="Country") or await google_kg.lookup(name)
        card = e and {
            "name": e["name"],
            "description": e["description"],
            "detail": e["detail"][:500],
            "url": e["detail_url"] or e["url"],
            "image": e["image"],
        }
        return name, card
    except Exception as exc:
        logger.warning("_destination(%s) failed: %s", country, exc)
        return country, None


@router.get("/planner")
async def travel_planner(
    country: str = Query(..., description="Destination Country"),
    days: int = Query(5, ge=1, le=14, description="Number of days for the trip"),
    preferences: str = Query("Budget friendly, cultural", description="User travel preferences"),
    refresh: bool = Query(False, description="Bypass cache"),
    user=Depends(get_current_user),
):
    """Generates a day-by-day travel itinerary using an AI Agent."""
    cache_key = f"{country.lower()}_{days}_{preferences.lower()}"

    # Always serve stale cache on refresh=False; also serve it as a fallback on errors.
    cached_doc = await travel_cache.find_one({"_id": cache_key})
    if not refresh and cached_doc:
        name, destination = await _destination(country)
        return {"itinerary": cached_doc["itinerary"], "cached": True, "destination": destination}

    name, destination = await _destination(country)

    grounding = (
        f"\nVerified facts about the destination (Google Knowledge Graph): "
        f"{(destination or {}).get('detail') or (destination or {}).get('description', '')}\n"
        if destination else ""
    )
    prompt = (
        f"You are an elite AI Travel Agent.\n"
        f"Create a detailed, day-by-day itinerary for a {days}-day trip to {name}.\n"
        f"The traveler's preferences are: {preferences}.{grounding}\n\n"
        f"Structure the response as a JSON array where each object represents a day.\n"
        f"Example Format:\n"
        f'[{{"day":1,"theme":"Arrival & Initial Exploration","activities":["Check-in at hotel","Walk around city center","Dinner at local spot"]}}]\n\n'
        f"Return ONLY valid JSON (no markdown fences, no prose)."
    )

    try:
        reply = await marketplace.chat(
            user_id=user["_id"],
            system_prompt="You are a JSON-only travel planner.",
            user_prompt=prompt,
            max_tokens=2000,
        )

        t = reply.strip()
        m = re.search(r"\[.*\]", t, re.DOTALL)
        if not m:
            raise ValueError("No JSON array found in AI reply")

        itinerary = json.loads(m.group(0))

        await travel_cache.update_one(
            {"_id": cache_key},
            {"$set": {"itinerary": itinerary}},
            upsert=True,
        )

        return {"itinerary": itinerary, "cached": False, "destination": destination}

    except Exception as exc:
        logger.error("Error generating travel plan for %s: %s", country, exc)

        # Serve stale cache as a graceful fallback rather than returning an error.
        if cached_doc:
            logger.info("Serving stale cache for %s after AI failure", cache_key)
            return {"itinerary": cached_doc["itinerary"], "cached": True, "destination": destination, "stale": True}

        raise HTTPException(
            status_code=503,
            detail="AI service is temporarily unavailable. Please try again in a few moments.",
        )
