from fastapi import APIRouter, Depends, Query, HTTPException
from rate_limit import RateLimit
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

_llm_limiter = RateLimit(max_calls=10, window_seconds=600)


@router.get("/recommendations", dependencies=[Depends(_llm_limiter)])
async def get_university_recommendations(country: str = Query(max_length=60), track: str = Query(max_length=60)):
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

@router.get("/insights", dependencies=[Depends(_llm_limiter)])
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
        if isinstance(data, dict) and isinstance(data.get("insights"), list) and data["insights"]:
            return {**data, "source": "ai"}
    except Exception as e:
        logger.warning("AI insights unavailable, answering from stored data: %s", e)
    # No AI answer: build insights from the university's own record instead of failing.
    from university_fit import insights_from_data
    from db import universities_col
    from normalize import normalize_university
    import re as _re
    doc = await universities_col.find_one({"name": {"$regex": f"^{_re.escape(university.strip())}$", "$options": "i"}}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No details for this university yet. WeHive can look it up for you.")
    return insights_from_data(normalize_university(dict(doc)), track)
