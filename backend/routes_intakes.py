from fastapi import APIRouter, Query, HTTPException
from db import db, universities_col
from ai_marketplace import marketplace
import json
import logging

logger = logging.getLogger("wehive.routes_intakes")
from db import db

router = APIRouter(prefix="/intakes", tags=["intakes"])
global_intakes_col = db["global_intakes"]

@router.get("/calendar")
async def get_intake_calendar():
    """Returns the latest aggregated intake calendar from the LLM agent."""
    cursor = global_intakes_col.find({}, {"_id": 0, "batch_id": 0, "fetched_at": 0})
    intakes = [doc async for doc in cursor]
    return {"intakes": intakes}

@router.get("/recommendations")
async def get_university_recommendations(country: str, track: str):
    """Recommends top universities for a given country and track."""
    # Attempt to query local DB first for speed
    cl = country.lower()
    cursor = universities_col.find({"country": {"$in": [cl, country]}}, {"_id": 0, "name": 1, "logo": 1, "rank": 1, "qs_rank": 1}).sort("rank", 1).limit(4)
    unis = [doc async for doc in cursor]
    
    if not unis:
        # Fallback to AI generation if DB has no matches for this country
        prompt = f"""
        Provide the top 4 universities in {country} for {track} programs.
        Format as a JSON array of objects, with each object having a 'name' field.
        Example:
        [
            {{"name": "University Name 1"}},
            {{"name": "University Name 2"}}
        ]
        Return ONLY valid JSON.
        """
        try:
            reply = await marketplace.chat(
                user_id="system_recommendations",
                system_prompt="You are an expert university admissions counselor. Output JSON array only.",
                user_prompt=prompt,
                max_tokens=400
            )
            import re
            m = re.search(r"\[.*\]", reply.strip(), re.DOTALL)
            if m:
                unis = json.loads(m.group(0))
            else:
                unis = json.loads(reply.strip())
        except Exception as e:
            logger.error(f"Failed to generate AI recommendations: {e}")
            return {"universities": []}
        
    return {"universities": unis}

@router.get("/insights")
async def get_university_insights(university: str, country: str, track: str):
    """Uses LLM to dynamically generate admission insights and FAQs."""
    prompt = f"""
    Provide rapid admission insights and FAQs for {track} programs at {university} in {country}.
    Format as JSON:
    {{
        "insights": [
            "Insight 1 (e.g. Acceptance rate or difficulty)",
            "Insight 2 (e.g. Standardized test requirements like GMAT/MCAT)",
            "Insight 3 (e.g. Application tips)"
        ],
        "faqs": [
            {{"q": "Question 1", "a": "Answer 1"}},
            {{"q": "Question 2", "a": "Answer 2"}},
            {{"q": "Question 3", "a": "Answer 3"}}
        ]
    }}
    Return ONLY valid JSON.
    """
    
    try:
        reply = await marketplace.chat(
            user_id="system_insights",
            system_prompt="You are an expert university admissions counselor. Output JSON only.",
            user_prompt=prompt,
            max_tokens=800
        )
        reply = reply.strip()
        import re
        m = re.search(r"\{.*\}", reply, re.DOTALL)
        if m:
            data = json.loads(m.group(0))
        else:
            data = json.loads(reply)
            
        return data
    except Exception as e:
        logger.error(f"Failed to generate insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI insights")
