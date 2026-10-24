"""AI-powered university features: recommender, Q&A, scholarship matcher, enrichment, acceptance probability."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from rate_limit import RateLimit
from uni_query import country_code, course_category, find_relaxed, relaxed_note
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from db import db, universities_col
from ai_marketplace import marketplace
from normalize import normalize_university
from university_fit import fit

router = APIRouter(prefix="/ai/universities", tags=["ai-universities"])


class RecommenderProfile(BaseModel):
    budget: int = 30000; country: Optional[str] = None
    preferred_courses: list[str] = []; ielts_score: Optional[float] = None
    gre_required: Optional[bool] = None; gmat_required: Optional[bool] = None
    scholarships_only: bool = False; preferences: str = ""


# Anonymous LLM calls cost money: 10 per IP per 10 minutes, shared across these endpoints.
_llm_limiter = RateLimit(max_calls=10, window_seconds=600)


@router.post("/recommend")
async def recommend(profile: RecommenderProfile, _=Depends(_llm_limiter)):
    flt = {"tuition_usd": {"$lte": profile.budget}}
    if profile.country: flt["country"] = country_code(profile.country)
    if profile.preferred_courses: flt["courses"] = {"$in": sorted({course_category(c) for c in profile.preferred_courses if c})}
    if profile.ielts_score: flt["ielts_min"] = {"$lte": profile.ielts_score}
    if profile.gre_required is not None: flt["gre_required"] = profile.gre_required
    if profile.gmat_required is not None: flt["gmat_required"] = profile.gmat_required
    if profile.scholarships_only: flt["scholarships"] = True
    candidates, dropped = await find_relaxed(
        universities_col, flt,
        ["tuition_usd", "gre_required", "gmat_required", "courses", "ielts_min", "scholarships", "country"])
    candidates = [normalize_university(dict(d)) for d in candidates]
    if not candidates: return {"recommendations": [], "note": "No matches."}
    top = candidates[:30]
    ctx = {"profile": profile.model_dump(), "universities": [
        {"id": u["id"], "name": u.get("name"), "country": u.get("country_name"),
         "rank": u.get("rank"), "tuition_usd": u.get("tuition_usd"), "scholarships": u.get("scholarships")}
        for u in top]}
    system_prompt = """Recommend 5-8 best universities for this student. Return ONLY a JSON array with each having "id", "fit_score"(0-100), "reason"(1-2 sentences), "strengths"(array)."""
    user_prompt = f"""Student: {json.dumps(ctx["profile"])}
Universities: {json.dumps(ctx["universities"])}"""
    try:
        text = re.search(r"\[\s*\{.*\}\s*\]", (await marketplace.chat("anonymous", system_prompt, user_prompt)).strip(), re.DOTALL)
        recs = json.loads(text.group()) if text else []
        if not isinstance(recs, list): recs = []
    except: recs = []
    rm = {r.get("id"): r for r in recs if isinstance(r, dict) and isinstance(r.get("fit_score"), (int, float))}
    for u in top:
        base = fit(u, budget=profile.budget, ielts=profile.ielts_score,
                   courses=[course_category(c) for c in profile.preferred_courses] or None,
                   want_scholarship=profile.scholarships_only)
        ai = rm.get(u.get("id"))
        u.update({**base, **{k: ai[k] for k in ("fit_score", "reason", "strengths") if ai and ai.get(k)}},
                 method="ai" if ai else "rules")
    top.sort(key=lambda x: x.get("fit_score", 0) or 0, reverse=True)
    return {"recommendations": top[:10], "total_candidates": len(candidates),
            "method": "ai" if rm else "rules", "note": relaxed_note(dropped)}


class QuestionBody(BaseModel):
    question: str


@router.post("/{uid}/ask")
async def ask(uid: str, body: QuestionBody, _=Depends(_llm_limiter)):
    doc = await universities_col.find_one({"id": uid}, {"_id": 0})
    if not doc: raise HTTPException(404)
    doc = normalize_university(dict(doc))
    p = {k: v for k, v in doc.items() if v is not None}
    system_prompt = """Answer the student's question about this university using only the data below. Be concise."""
    user_prompt = f"""University: {json.dumps(p, indent=2)}
Question: {body.question}"""
    try: answer = await marketplace.chat("anonymous", system_prompt, user_prompt)
    except Exception as e: answer = f"Sorry, couldn't answer. ({e})"
    return {"university_id": uid, "university_name": doc.get("name"), "answer": answer}


class ScholarshipProfile(BaseModel):
    budget: int = 30000; country: Optional[str] = None
    ielts_score: Optional[float] = None; field_of_study: Optional[str] = None


@router.post("/scholarship-match")
async def scholarship_match(profile: ScholarshipProfile, _=Depends(_llm_limiter)):
    flt = {"scholarships": True}
    if profile.country: flt["country"] = country_code(profile.country)
    if profile.field_of_study: flt["courses"] = {"$in": [course_category(profile.field_of_study)]}
    if profile.ielts_score: flt["ielts_min"] = {"$lte": profile.ielts_score}
    candidates, dropped = await find_relaxed(universities_col, flt, ["courses", "ielts_min", "country"])
    candidates = [normalize_university(dict(d)) for d in candidates]
    if not candidates:
        return {"matches": [], "note": "No universities with scholarships are listed yet. WeHive can search for you."}
    top = candidates[:30]
    ctx = {"profile": profile.model_dump(), "universities": [
        {"id": u["id"], "name": u.get("name"), "tuition_usd": u.get("tuition_usd")} for u in top]}
    system_prompt = """Find best scholarship matches. Return JSON array with "id", "match_score"(0-100), "reason", "scholarship_tips"."""
    user_prompt = f"""Student: {json.dumps(ctx["profile"])}
Universities: {json.dumps(ctx["universities"])}"""
    try:
        text = re.search(r"\[\s*\{.*\}\s*\]", (await marketplace.chat("anonymous", system_prompt, user_prompt)).strip(), re.DOTALL)
        matches = json.loads(text.group()) if text else []
    except: matches = []
    mm = {m.get("id"): m for m in matches if isinstance(m, dict) and isinstance(m.get("match_score"), (int, float))}
    result = []
    for u in top:
        base = fit(u, budget=profile.budget, ielts=profile.ielts_score,
                   courses=[course_category(profile.field_of_study)] if profile.field_of_study else None,
                   want_scholarship=True)
        ai = mm.get(u.get("id"))
        result.append({**u, "match_score": ai["match_score"] if ai else base["fit_score"],
                       "reason": (ai or {}).get("reason") or base["reason"], "strengths": base["strengths"],
                       "scholarship_tips": (ai or {}).get("scholarship_tips", ""), "method": "ai" if ai else "rules"})
    result.sort(key=lambda x: x.get("match_score", 0) or 0, reverse=True)
    return {"matches": result[:10], "total_candidates": len(candidates), "method": "ai" if mm else "rules",
            "note": relaxed_note(dropped)}


class AcceptanceQuery(BaseModel):
    gpa: Optional[float] = None; ielts: Optional[float] = None
    test_scores: str = ""; background: str = ""


@router.post("/{uid}/acceptance-probability")
async def acceptance_prob(uid: str, body: AcceptanceQuery, _=Depends(_llm_limiter)):
    doc = await universities_col.find_one({"id": uid}, {"_id": 0})
    if not doc: raise HTTPException(404)
    uni = {"name": doc.get("name"), "rank": doc.get("rank"), "acceptance_rate": doc.get("acceptance_rate"),
           "ielts_min": doc.get("ielts_min"), "gre_required": doc.get("gre_required")}
    system_prompt = """Estimate acceptance probability. Return ONLY JSON: {"probability":int 0-100, "tier":"reach|target|safety", "factors":[], "recommendations":"", "confidence":"low|medium|high"}"""
    user_prompt = f"""University: {json.dumps(uni)}
Student: {json.dumps(body.model_dump(exclude_none=True))}"""
    try:
        text = (await marketplace.chat("anonymous", system_prompt, user_prompt)).strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        result = json.loads(m.group()) if m else {}
    except: result = {"probability": 50, "tier": "target", "factors": [], "recommendations": "", "confidence": "low"}
    return {"university_id": uid, "university_name": doc.get("name"), **result}


@router.post("/enrich-missing")
async def ai_enrich_missing_data(admin=Depends(get_current_admin_flex)):
    """Find universities with thin/template data and generate rich fields via AI. Admin-only."""
    bare = await universities_col.find({"$or": [
        {"description": {"$regex": "is a university located in|A leading university in"}},
        {"popular_courses": {"$exists": False}}]}, {"_id": 0}).to_list(length=200)
    if not bare: return {"enriched": 0, "note": "No thin data found."}
    target = bare[:30]
    batch = [{"id": u.get("id"), "name": u.get("name"), "country_name": u.get("country_name")} for u in target]
    system_prompt = """Generate realistic data for each university. Return JSON array with "id", "description"(2-3 sentences), "popular_courses"(3-5), "facilities"(4-6), "living_cost_usd"."""
    user_prompt = json.dumps(batch)
    try:
        text = re.search(r"\[\s*\{.*\}\s*\]", (await marketplace.chat(str(admin.get("_id", "admin")), system_prompt, user_prompt)).strip(), re.DOTALL)
        enrichments = json.loads(text.group()) if text else []
    except: enrichments = []
    enriched = 0
    for item in enrichments:
        uid = item.get("id")
        if not uid: continue
        upd = {k: v for k, v in item.items() if k != "id" and v is not None}
        if upd:
            await universities_col.update_one({"id": uid}, {"$set": upd})
            enriched += 1
    return {"enriched": enriched, "total_candidates": len(target)}


def _extract_json(text: str) -> str:
    text = text.strip()
    m = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if m: return m.group()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m: return m.group()
    return text
