"""AI-powered document generation — routed through AI Marketplace."""

from __future__ import annotations

import json
import os
import re
import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ai_marketplace import marketplace
from core.auth_utils import get_current_user
from core.db import applications
from core.serializers import serialize_doc

router = APIRouter(prefix='/apps', tags=['ai-docs'])
logger = logging.getLogger('wehive.ai-docs')


class GenerateDocRequest(BaseModel):
    type: str
    university_id: Optional[str] = None
    context: Optional[dict] = None


class CoverLetterRequest(BaseModel):
    purpose: str
    applicant_name: str
    nationality: str = 'Indian'
    destination: str
    visa_type: str
    travel_date: Optional[str] = None
    sponsors: Optional[str] = None
    additional_info: Optional[str] = None


class RiskAnalysisRequest(BaseModel):
    focus_areas: Optional[list[str]] = None


# ---------- Generic SOP / LOR Generation ----------
@router.post('/generate-doc')
async def generate_doc(req: GenerateDocRequest, user=Depends(get_current_user)):
    from shared.data import UNIVERSITIES
    uni = None
    if req.university_id:
        uni = next((u for u in UNIVERSITIES if u['id'] == req.university_id), None)
    ctx = req.context or {}
    
    if req.type == 'sop':
        prompt = f"""Write a compelling Statement of Purpose for {uni['name'] if uni else 'university'}.
Context: {ctx.get('country', 'general')}
Applicant background: {ctx.get('background', '')}
Achievements: {ctx.get('achievements', '')}
Goals: {ctx.get('goal', '')}
Program: {ctx.get('program', '')}
Write in a professional, compelling tone. Include:
1. Opening hook about the applicant's motivation
2. Academic background and preparation
3. Why this specific university and program
4. Career goals and how the program fits
5. Closing statement"""
    elif req.type == 'lor':
        prompt = f"""Write a professional Letter of Recommendation for a student applying to {uni['name'] if uni else 'university'}.
Relationship: {ctx.get('background', '')}
Key strengths: {ctx.get('strength', '')}
Achievements: {ctx.get('achievements', '')}
Focus: {ctx.get('focus', 'academic performance and potential')}
Write in a formal, supportive tone."""
    else:
        raise HTTPException(400, 'Invalid document type')

    session_id = f'doc-gen-{uuid.uuid4()}'
    raw = await _call_ai(user['_id'], prompt, session_id)
    return {'content': raw, 'type': req.type, 'university_id': req.university_id}


def _parse_json(text: str) -> dict | None:
    if not text:
        return None
    t = text.strip()
    if t.startswith('`'):
        t = t.strip('`')
        if t.lower().startswith('json'):
            t = t[4:]
        t = t.strip()
    m = re.search(r'\{.*\}', t, re.DOTALL)
    if not m:
        return None
    try:
        return {'_full': json.loads(m.group(0))}
    except Exception:
        pass
    try:
        return {'_raw': text}
    except Exception:
        return None


async def _call_ai(user_id: str, prompt: str, session_id: str) -> str:
    return await marketplace.chat(
        user_id=user_id,
        system_prompt='You are a professional visa consultant assistant. Be thorough, accurate, and helpful.',
        user_prompt=prompt,
        max_tokens=2048,
    )


# ---------- Cover Letter / SOP ----------
@router.post('/{application_id}/cover-letter')
async def generate_cover_letter(
    application_id: str,
    req: CoverLetterRequest,
    user=Depends(get_current_user),
):
    app = await applications.find_one({'_id': application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    session_id = f'cover-letter-{uuid.uuid4()}'
    prompt = f"""You are a professional visa consultant drafting a cover letter / statement of purpose.

Generate a formal cover letter for a {req.nationality} passport holder applying for a {req.visa_type} visa to {req.destination}.

Details:
- Applicant name: {req.applicant_name}
- Purpose of travel: {req.purpose}
- Travel date (if known): {req.travel_date or 'Not specified'}
- Sponsorship / financial support: {req.sponsors or 'Self-sponsored'}
- Additional context: {req.additional_info or 'None provided'}

Application context (if available):
- Visa type: {req.visa_type}
- Destination: {req.destination}

Return ONLY a well-structured formal letter in plain text (no markdown, no JSON).
The letter should be 250–400 words, professional in tone, and include:
1. Introduction — who you are and why you're applying
2. Travel purpose — specific, genuine reasons for visiting
3. Financial arrangements — how you will fund your trip
4. Ties to home country — why you will return (family, job, property, etc.)
5. Closing — reaffirm intent to comply with visa conditions

Do NOT invent specific details. Use placeholders like [COMPANY NAME] where real info is missing.
"""
    letter = await _call_ai(user['_id'], prompt, session_id)
    if not letter:
        raise HTTPException(502, 'Could not generate cover letter. Please try again.')

    now = datetime.utcnow()
    await applications.update_one(
        {'_id': application_id},
        {'$set': {'updated_at': now}},
    )

    return {
        'application_id': application_id,
        'letter': letter,
        'generated_at': now.isoformat(),
        'purpose': req.purpose,
    }


# ---------- AI Itinerary Enhancer ----------
@router.get('/{application_id}/ai-itinerary')
async def generate_ai_itinerary(
    application_id: str,
    days: int = Query(default=7, ge=3, le=30),
    style: str = Query(default='balanced', description='balanced | adventure | relaxed | cultural'),
    budget: str = Query(default='moderate', description='budget | moderate | luxury'),
    user=Depends(get_current_user),
):
    app = await applications.find_one({'_id': application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    country_id = app.get('country_id', '')
    visa_type = app.get('visa_type', 'Tourist')

    from shared.data import get_country, get_holiday_plan
    country = get_country(country_id)
    plan = get_holiday_plan(country_id)

    session_id = f'ai-itinerary-{uuid.uuid4()}'
    prompt = f"""You are an expert travel planner for Indian tourists.

Generate a personalised {days}-day itinerary for a trip to {country_id.upper()}.
Style preference: {style}. Budget level: {budget}.

Destination country: {country.get('name', country_id) if country else country_id}
Visa type: {visa_type}

Known attractions from our database:
{chr(10).join(f"- {a['name']} ({a['city']})" for a in (plan.get('attractions', [])[:8]))}

Best time to visit: {plan.get('best_time', 'Year round')}
Weather: {plan.get('weather', 'Varies')}

Return ONLY a JSON object (no markdown fences, no prose), with this exact shape:
{{
  "days": [
    {{
      "day": 1,
      "title": "Day title",
      "theme": "Theme (e.g. Arrival, Exploration, Food...)",
      "activities": [
        {{ "time": "09:00", "activity": "Activity description", "location": "City/Area", "note": "Optional tip" }}
      ],
      "meals": {{ "breakfast": "Restaurant type or suggestion", "lunch": "...", "dinner": "..." }},
      "travel_tip": "How to get around that day"
    }}
  ],
  "highlights": ["string", "string"],
  "packing_tips": ["string", "string"],
  "budget_estimate": {{ "low": 0, "mid": 0, "high": 0 }}
}}

Rules:
- Must have exactly {days} days
- Each day must have at least 3 activities
- Include realistic meal suggestions
- Use rupees (INR) for all budget figures
- Activities should be diverse (not all museums or all beaches)
- Day 1 should always include arrival/settling in
- Last day should include departure prep
- Include a mix of popular tourist spots and local hidden gems
"""
    raw = await _call_ai(user['_id'], prompt, session_id)

    t = raw.strip()
    if t.startswith('`'):
        t = t.strip('`')
        if t.lower().startswith('json'):
            t = t[4:]
        t = t.strip()
    m = re.search(r'\{.*\}', t, re.DOTALL)
    if not m:
        raise HTTPException(502, 'Could not parse itinerary. Please try again.')
    try:
        itinerary = json.loads(m.group(0))
    except Exception:
        raise HTTPException(502, 'Could not parse itinerary. Please try again.')

    return {
        'application_id': application_id,
        'country': country.get('name', country_id) if country else country_id,
        'days': days,
        'style': style,
        'budget': budget,
        'itinerary': itinerary,
    }


# ---------- Rejection Risk Analyser ----------
@router.post('/{application_id}/risk-analysis')
async def analyse_rejection_risk(
    application_id: str,
    req: RiskAnalysisRequest,
    user=Depends(get_current_user),
):
    app = await applications.find_one({'_id': application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    country_id = app.get('country_id', '')
    visa_type = app.get('visa_type', '')
    form_data = app.get('form_data', {})
    docs = app.get('documents', [])
    user_profile = {
        'name': user.get('name', ''),
        'email': user.get('email', ''),
    }

    from shared.data import get_country
    country = get_country(country_id)

    session_id = f'risk-analysis-{uuid.uuid4()}'
    focus = req.focus_areas or []

    doc_summary = []
    for d in docs:
        doc_summary.append(f"- {d.get('doc_type', 'Unknown')}: {d.get('filename', 'file')}")

    prompt = f"""You are a senior visa eligibility consultant reviewing an application for rejection risks.

Analyze the following visa application for potential rejection risks.

Country: {country.get('name', country_id) if country else country_id}
Visa type: {visa_type}

Applicant profile:
- Name: {user_profile.get('name', 'Not provided')}
- Email: {user_profile.get('email', 'Not provided')}

Form data provided:
{chr(10).join(f"  - {k}: {v}" for k, v in (form_data.items() if form_data else []) )}

Documents uploaded ({len(docs)}):
{chr(10).join(doc_summary) if doc_summary else "  No documents uploaded yet."}

Focus areas to check: {', '.join(focus) if focus else 'All common rejection factors'}

Return ONLY a JSON object (no markdown, no prose):
{{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_score": 0-100,
  "summary": "2-sentence overview of overall risk",
  "factors": [
    {{
      "type": "strong_weak_point | risk_flag | missing_info",
      "severity": "critical | major | minor | note",
      "title": "Short descriptive title",
      "description": "Detailed explanation of this factor",
      "fixable": boolean,
      "fix_suggestion": "How to address this issue (if fixable)"
    }}
  ],
  "checks": {{
    "financial_proof": {{ "status": "ok | weak | missing", "notes": "..." }},
    "travel_history": {{ "status": "ok | weak | missing", "notes": "..." }},
    "document_quality": {{ "status": "ok | weak | missing", "notes": "..." }},
    "genuine_intent": {{ "status": "ok | weak | missing", "notes": "..." }},
    "form_completeness": {{ "status": "ok | weak | missing", "notes": "..." }},
    "ties_to_home": {{ "status": "ok | weak | missing", "notes": "..." }}
  }},
  "overall_advice": "Final recommendation on what to do before submitting",
  "approvals_needed": ["list of things that should be verified before submission"]
}}
"""
    raw = await _call_ai(user['_id'], prompt, session_id)

    t = raw.strip()
    if t.startswith('`'):
        t = t.strip('`')
        if t.lower().startswith('json'):
            t = t[4:]
        t = t.strip()
    m = re.search(r'\{.*\}', t, re.DOTALL)
    if not m:
        raise HTTPException(502, 'Could not parse risk analysis. Please try again.')
    try:
        analysis = json.loads(m.group(0))
    except Exception:
        raise HTTPException(502, 'Could not parse risk analysis. Please try again.')

    now = datetime.utcnow()
    await applications.update_one(
        {'_id': application_id},
        {'$set': {
            'last_risk_analysis': analysis,
            'last_risk_analysis_at': now,
            'updated_at': now,
        }},
    )

    return {
        'application_id': application_id,
        'analysis': analysis,
        'generated_at': now.isoformat(),
        'country': country.get('name', country_id) if country else country_id,
    }
