"""AI-powered university features: recommender, Q&A, scholarship matcher, enrichment, acceptance probability."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.admin_auth import get_current_admin_flex
from core.db import db, universities_col
from ai_marketplace import marketplace
from shared.normalize import normalize_university

router = APIRouter(prefix="/ai/universities", tags=["ai-universities"])


class RecommenderProfile(BaseModel):
    budget: int = 30000; country: Optional[str] = None
    preferred_courses: list[str] = []; ielts_score: Optional[float] = None
    gre_required: Optional[bool] = None; gmat_required: Optional[bool] = None
    scholarships_only: bool = False; preferences: str = ""


@router.post("/recommend")
async def recommend(profile: RecommenderProfile):
    flt = {"tuition_usd": {"$lte": profile.budget}}
    if profile.country: flt["country"] = profile.country.lower()
    if profile.preferred_courses: flt["courses"] = {"$in": [c.lower() for c in profile.preferred_courses]}
    if profile.ielts_score: flt["ielts_min"] = {"$lte": profile.ielts_score}
    if profile.gre_required is not None: flt["gre_required"] = profile.gre_required
    if profile.gmat_required is not None: flt["gmat_required"] = profile.gmat_required
    if profile.scholarships_only: flt["scholarships"] = True
    candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=100)
    if not candidates:
        flt.pop("tuition_usd", None)
        candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=50)
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
    except Exception: recs = []
    rm = {r["id"]: r for r in recs}
    for u in top: u.update(rm.get(u.get("id"), {"fit_score": 50, "reason": "", "strengths": []}))
    top.sort(key=lambda x: x.get("fit_score", 0) or 0, reverse=True)
    return {"recommendations": top[:10], "total_candidates": len(candidates)}


class QuestionBody(BaseModel):
    question: str


@router.post("/{uid}/ask")
async def ask(uid: str, body: QuestionBody):
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
async def scholarship_match(profile: ScholarshipProfile):
    flt = {"scholarships": True}
    if profile.country: flt["country"] = profile.country.lower()
    if profile.field_of_study: flt["courses"] = {"$in": [profile.field_of_study.lower()]}
    if profile.ielts_score: flt["ielts_min"] = {"$lte": profile.ielts_score}
    candidates = await universities_col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=100)
    candidates = [normalize_university(dict(d)) for d in candidates]
    if not candidates: return {"matches": [], "note": "No matches."}
    top = candidates[:30]
    ctx = {"profile": profile.model_dump(), "universities": [
        {"id": u["id"], "name": u.get("name"), "tuition_usd": u.get("tuition_usd")} for u in top]}
    system_prompt = """Find best scholarship matches. Return JSON array with "id", "match_score"(0-100), "reason", "scholarship_tips"."""
    user_prompt = f"""Student: {json.dumps(ctx["profile"])}
Universities: {json.dumps(ctx["universities"])}"""
    try:
        text = re.search(r"\[\s*\{.*\}\s*\]", (await marketplace.chat("anonymous", system_prompt, user_prompt)).strip(), re.DOTALL)
        matches = json.loads(text.group()) if text else []
    except Exception: matches = []
    mm = {m["id"]: m for m in matches}
    result = [{**u, **mm.get(u.get("id", ""), {"match_score": 50})} for u in candidates if u.get("id") in mm]
    result.sort(key=lambda x: x.get("match_score", 0) or 0, reverse=True)
    return {"matches": result[:10], "total_candidates": len(candidates)}


class AcceptanceQuery(BaseModel):
    gpa: Optional[float] = None; ielts: Optional[float] = None
    test_scores: str = ""; background: str = ""


@router.post("/{uid}/acceptance-probability")
async def acceptance_prob(uid: str, body: AcceptanceQuery):
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
    except Exception: result = {"probability": 50, "tier": "target", "factors": [], "recommendations": "", "confidence": "low"}
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
    except Exception: enrichments = []
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
