from fastapi import APIRouter, HTTPException, Query, Depends
import logging
from typing import Optional

from ai_marketplace import marketplace
from auth_utils import get_current_user
from db import db

router = APIRouter(prefix="/travel", tags=["travel"])
logger = logging.getLogger("wehive.travel")

travel_cache = db["travel_planner_cache"]

@router.get("/planner")
async def travel_planner(
    country: str = Query(..., description="Destination Country"),
    days: int = Query(5, ge=1, le=14, description="Number of days for the trip"),
    preferences: str = Query("Budget friendly, cultural", description="User travel preferences"),
    refresh: bool = Query(False, description="Bypass cache"),
    user=Depends(get_current_user)
):
    """Generates a day-by-day travel itinerary using an AI Agent."""
    cache_key = f"{country.lower()}_{days}_{preferences.lower()}"

    if not refresh:
        cached = await travel_cache.find_one({"_id": cache_key})
        if cached:
            return {"itinerary": cached["itinerary"], "cached": True}

    prompt = f"""You are an elite AI Travel Agent.
Create a detailed, day-by-day itinerary for a {days}-day trip to {country}.
The traveler's preferences are: {preferences}.

Structure the response as a JSON array where each object represents a day.
Example Format:
[
  {{
    "day": 1,
    "theme": "Arrival & Initial Exploration",
    "activities": ["Check-in at hotel", "Walk around city center", "Dinner at local spot"]
  }}
]

Return ONLY valid JSON (no markdown fences, no prose)."""

    try:
        reply = await marketplace.chat(
            user_id=user["_id"],
            system_prompt="You are a JSON-only travel planner.",
            user_prompt=prompt,
            max_tokens=2000
        )

        # Super simple parse logic (assuming AI follows JSON-only rule)
        import json
        import re
        t = reply.strip()
        m = re.search(r"\[.*\]", t, re.DOTALL)
        if not m:
            raise ValueError("No JSON array found in reply")

        itinerary = json.loads(m.group(0))

        await travel_cache.update_one(
            {"_id": cache_key},
            {"$set": {"itinerary": itinerary}},
            upsert=True
        )

        return {"itinerary": itinerary, "cached": False}

    except Exception as e:
        logger.error(f"Error generating travel plan: {e}")
        raise HTTPException(status_code=502, detail="AI Service is busy or returned invalid JSON.")
