"""AI-powered university features: recommender, Q&A, scholarship matcher."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import db, universities_col
from ai_marketplace import marketplace

router = APIRouter(prefix="/ai/universities", tags=["ai-universities"])

CN_FIELD_MAP = {'录取率': 'acceptance_rate', '就业率': 'employment_rate'}


def _normalize(doc: dict) -> dict:
    doc.pop('_id', None)
    for cn_key, en_key in CN_FIELD_MAP.items():
        if cn_key in doc and en_key not in doc:
            doc[en_key] = doc.pop(cn_key)
        elif cn_key in doc:
            doc.pop(cn_key)
    if ' scholarships' in doc:
        doc['scholarships'] = doc.pop(' scholarships')
    if ' intakes' in doc:
        doc['intakes'] = doc.pop(' intakes')
    return doc


# --------------------------------------------------------------------------- #
# AI University Recommender
# --------------------------------------------------------------------------- #

class RecommenderProfile(BaseModel):
    budget: int = 30000
    country: Optional[str] = None
    preferred_courses: list[str] = []
    ielts_score: Optional[float] = None
    gre_required: Optional[bool] = None
    gmat_required: Optional[bool] = None
    scholarships_only: bool = False
    preferences: str = ""


@router.post("/recommend")
async def ai_recommend(profile: RecommenderProfile):
    """Return AI-ranked university recommendations based on student profile."""
    flt: dict = {"tuition_usd": {"$lte": profile.budget}}
    if profile.country:
        flt["country"] = profile.country.lower()
    if profile.preferred_courses:
        flt["courses"] = {"$in": [c.lower() for c in profile.preferred_courses]}
    if profile.ielts_score:
        flt["ielts_min"] = {"$lte": profile.ielts_score}
    if profile.gre_required is not None:
        flt["gre_required"] = profile.gre_required
    if profile.gmat_required is not None:
        flt["gmat_required"] = profile.gmat_required
    if profile.scholarships_only:
        flt["scholarships"] = True

    candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=100)

    if not candidates:
        flt.pop("tuition_usd", None)
        candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=50)

    candidates = [_normalize(dict(d)) for d in candidates]
    if not candidates:
        return {"recommendations": [], "note": "No universities match your criteria."}

    top = candidates[:30]
    context = {
        "profile": profile.model_dump(),
        "universities": [
            {"id": u["id"], "name": u.get("name"), "country": u.get("country_name"),
             "rank": u.get("rank"), "tuition_usd": u.get("tuition_usd"),
             "ielts_min": u.get("ielts_min"), "scholarships": u.get("scholarships"),
             "courses": u.get("courses"), "students": u.get("students"),
             "avg_salary_usd": u.get("avg_salary_usd")}
            for u in top
        ],
    }

    prompt = f"""You are a university admission advisor. Based on the student's profile and the list of candidate universities, recommend the 5-8 best matches.

Student profile:
{json.dumps(context["profile"], indent=2)}

Candidate universities:
{json.dumps(context["universities"], indent=2)}

Return ONLY a JSON array of objects, each with:
  - "id": the university id string
  - "fit_score": integer 0-100
  - "reason": 1-2 sentence personalised reason why this is a good match
  - "strengths": array of 2-3 key strengths for this student

Do NOT include any text outside the JSON array."""

    try:
        text = await marketplace.chat(prompt)
        text = _extract_json(text)
        recs = json.loads(text)
        if not isinstance(recs, list):
            recs = []
    except Exception:
        recs = [{"id": u["id"], "fit_score": 50, "reason": f"Matches your criteria.",
                  "strengths": [u.get("country_name", ""), str(u.get("rank", ""))]}
                for u in top[:8]]

    full = []
    rec_map = {r["id"]: r for r in recs}
    for u in top:
        enrichment = rec_map.get(u.get("id"), {})
        full.append({**u, "fit_score": enrichment.get("fit_score", 50),
                     "reason": enrichment.get("reason", ""),
                     "strengths": enrichment.get("strengths", [])})

    full.sort(key=lambda x: x.get("fit_score", 0) if x.get("fit_score") else 0, reverse=True)
    return {"recommendations": full[:10], "total_candidates": len(candidates)}


# --------------------------------------------------------------------------- #
# AI University Q&A
# --------------------------------------------------------------------------- #

class QuestionBody(BaseModel):
    question: str


@router.post("/{university_id}/ask")
async def ai_ask_about_university(university_id: str, body: QuestionBody):
    """Answer a student's question about a specific university."""
    doc = await universities_col.find_one({"id": university_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "University not found")
    doc = _normalize(dict(doc))

    profile = {k: v for k, v in doc.items()
               if k not in ("_id", "courses", "popular_courses", "intakes",
                            "accreditation", "facilities") and v is not None}
    profile["courses"] = doc.get("courses", [])
    profile["popular_courses"] = doc.get("popular_courses", [])
    profile["intakes"] = doc.get("intakes", [])
    profile["facilities"] = doc.get("facilities", [])
    profile["accreditation"] = doc.get("accreditation", [])

    prompt = f"""You are an AI university advisor. Answer the student's question based ONLY on the university data provided below. If the data doesn't contain the answer, say so honestly — do not make up information.

University profile:
{json.dumps(profile, indent=2)}

Student question: {body.question}

Provide a helpful, concise answer (2-4 paragraphs). Mention specific data from the profile when relevant."""

    try:
        answer = await marketplace.chat(prompt)
    except Exception as e:
        answer = f"I'm sorry, I couldn't process your question right now. ({e})"

    return {"university_id": university_id, "university_name": doc.get("name"), "question": body.question, "answer": answer}


# --------------------------------------------------------------------------- #
# AI Scholarship Matcher
# --------------------------------------------------------------------------- #

class ScholarshipProfile(BaseModel):
    budget: int = 30000
    country: Optional[str] = None
    ielts_score: Optional[float] = None
    gre_score: Optional[str] = None
    field_of_study: Optional[str] = None
    academic_achievement: str = ""


@router.post("/scholarship-match")
async def ai_scholarship_match(profile: ScholarshipProfile):
    """Find universities with scholarships that match the student's profile."""
    flt: dict = {"scholarships": True}
    if profile.country:
        flt["country"] = profile.country.lower()
    if profile.field_of_study:
        flt["courses"] = {"$in": [profile.field_of_study.lower()]}
    if profile.ielts_score:
        flt["ielts_min"] = {"$lte": profile.ielts_score}

    candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=100)
    candidates = [_normalize(dict(d)) for d in candidates]

    if not candidates:
        flt.pop("scholarships", None)
        candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=50)
        candidates = [_normalize(dict(d)) for d in candidates]
        if not candidates:
            return {"matches": [], "note": "No matching universities found."}

    top = candidates[:30]
    context = {
        "profile": profile.model_dump(),
        "universities": [
            {"id": u["id"], "name": u.get("name"), "country": u.get("country_name"),
             "rank": u.get("rank"), "tuition_usd": u.get("tuition_usd"),
             "scholarships": u.get("scholarships"), "courses": u.get("courses")}
            for u in top
        ],
    }

    prompt = f"""You are a scholarship advisor. Based on the student's profile, identify the best universities that offer scholarships or are most likely to provide financial aid.

Student profile:
{json.dumps(context["profile"], indent=2)}

Universities with scholarships:
{json.dumps(context["universities"], indent=2)}

Return ONLY a JSON array of objects, each with:
  - "id": university id
  - "match_score": integer 0-100
  - "reason": why this university is a good scholarship match
  - "scholarship_tips": 1-2 sentence tip on how to secure aid here

Do NOT include any text outside the JSON array."""

    try:
        text = await marketplace.chat(prompt)
        text = _extract_json(text)
        matches = json.loads(text)
        if not isinstance(matches, list):
            matches = []
    except Exception:
        matches = [{"id": u["id"], "match_score": 50, "reason": "Scholarships available.",
                     "scholarship_tips": "Check the university website for details."}
                   for u in top if u.get("scholarships")][:8]

    full = []
    match_map = {m["id"]: m for m in matches}
    for u in candidates:
        enrichment = match_map.get(u.get("id"), {})
        if enrichment:
            full.append({**u, "match_score": enrichment.get("match_score", 50),
                         "reason": enrichment.get("reason", ""),
                         "scholarship_tips": enrichment.get("scholarship_tips", "")})

    full.sort(key=lambda x: x.get("match_score", 0) or 0, reverse=True)
    return {"matches": full[:10], "total_candidates": len(candidates)}


# --------------------------------------------------------------------------- #
# AI Data Enrichment  —  batch-fill template data for the 1000+ bare universities
# --------------------------------------------------------------------------- #

@router.post("/enrich-missing")
async def ai_enrich_missing_data():
    """Find universities with thin/template data and generate rich fields via AI."""
    bare = await universities_col.find({
        "$or": [
            {"description": {"$regex": "^A leading university in|^[A-Z][a-z]+ is a university|^[A-Z][a-z]+ University is a"}},
            {"facilities": {"$exists": False}},
            {"popular_courses": {"$exists": False}},
        ]
    }, {"_id": 0}).to_list(length=500)

    if not bare:
        bare = await universities_col.find({
            "$or": [
                {"description": {"$regex": "is a university located in"}},
                {"popular_courses": []},
            ]
        }, {"_id": 0}).to_list(length=300)

    if not bare:
        return {"enriched": 0, "note": "No universities with thin data found."}

    target = bare[:50]
    batch = [
        {"id": u.get("id"), "name": u.get("name"), "country_name": u.get("country_name"),
         "rank": u.get("rank"), "type": u.get("type"), "courses": u.get("courses")}
        for u in target
    ]

    prompt = f"""You are a university data enrichment system. For each university below, generate realistic enrichment data.

Return a JSON array of objects, one per university, each with:
  - "id": the university id
  - "description": 2-3 sentence realistic description (NOT template-like)
  - "popular_courses": array of 3-5 realistic course names (e.g. ["Computer Science", "Mechanical Engineering"])
  - "facilities": array of 4-6 realistic campus facilities
  - "accreditation": array of 1-2 realistic accreditations
  - "living_cost_usd": integer, realistic annual living cost based on country

Universities:
{json.dumps(batch, indent=2)}

Return ONLY the JSON array. Do NOT include any text outside the array."""

    try:
        text = await marketplace.chat(prompt)
        text = _extract_json(text)
        enrichments = json.loads(text)
        if not isinstance(enrichments, list):
            enrichments = []
    except Exception:
        return {"enriched": 0, "error": "AI enrichment failed. Check your AI provider."}

    enriched = 0
    for item in enrichments:
        uid = item.get("id")
        if not uid:
            continue
        update = {k: v for k, v in item.items() if k != "id" and v is not None}
        if update:
            doc = {"description": update.get("description", item.get("description", "")),
                   "popular_courses": update.get("popular_courses", item.get("popular_courses", [])),
                   "facilities": update.get("facilities", item.get("facilities", [])),
                   "accreditation": update.get("accreditation", item.get("accreditation", [])),
                   "living_cost_usd": update.get("living_cost_usd", item.get("living_cost_usd", 0))}
            doc = {k: v for k, v in doc.items() if v is not None}
            if doc:
                await universities_col.update_one({"id": uid}, {"$set": doc})
                enriched += 1

    total = await universities_col.count_documents({})
    return {"enriched": enriched, "total_candidates": len(target), "total": total}


# --------------------------------------------------------------------------- #
# AI Acceptance Probability
# --------------------------------------------------------------------------- #

class AcceptanceQuery(BaseModel):
    gpa: Optional[float] = None
    ielts: Optional[float] = None
    gre: Optional[str] = None
    gmat: Optional[str] = None
    test_scores: str = ""
    background: str = ""


@router.post("/{university_id}/acceptance-probability")
async def ai_acceptance_probability(university_id: str, body: AcceptanceQuery):
    """Estimate admission chances using university data + student profile."""
    doc = await universities_col.find_one({"id": university_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "University not found")

    doc.pop("_id", None)
    uni_summary = {
        "name": doc.get("name"), "rank": doc.get("rank"), "type": doc.get("type"),
        "acceptance_rate": doc.get("acceptance_rate"), "students": doc.get("students"),
        "ielts_min": doc.get("ielts_min"), "toefl_min": doc.get("toefl_min"),
        "gre_required": doc.get("gre_required"), "gmat_required": doc.get("gmat_required"),
        "avg_salary_usd": doc.get("avg_salary_usd"), "country": doc.get("country_name"),
    }

    prompt = f"""You are an admissions advisor. Estimate this student's probability of acceptance at the given university.

University:
{json.dumps(uni_summary, indent=2)}

Student profile:
{json.dumps(body.model_dump(exclude_none=True), indent=2)}

Return ONLY a JSON object with:
  - "probability": integer 0-100
  - "tier": "reach" | "target" | "safety"
  - "factors": array of 3-5 factors that influence this probability (positive or negative)
  - "recommendations": 1-2 sentence actionable advice to improve chances
  - "confidence": "low" | "medium" | "high" (how confident you are in this estimate given available data)

Do NOT include any text outside the JSON object."""

    try:
        text = await marketplace.chat(prompt)
        text = _extract_json(text)
        result = json.loads(text)
        if not isinstance(result, dict):
            result = {}
    except Exception:
        result = {"probability": 50, "tier": "target", "factors": ["Insufficient data for accurate prediction"],
                  "recommendations": "Contact the admissions office for personalized guidance.",
                  "confidence": "low"}

    return {"university_id": university_id, "university_name": doc.get("name"), **result}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _extract_json(text: str) -> str:
    text = text.strip()
    match = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
    if match:
        return match.group()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group()
    return text
