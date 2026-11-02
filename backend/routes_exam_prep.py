"""
routes_exam_prep.py — Exam preparation data and partner referral endpoints.

Provides:
  GET  /exam-prep/list          — All supported exams with fees, urls, sections
  GET  /exam-prep/{exam_id}     — Single exam detail
  POST /exam-prep/partner-click — Track partner banner CTA clicks (Credila, Zolve)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime, timezone

from db import db

router = APIRouter(prefix='/exam-prep', tags=['exam-prep'])
logger = logging.getLogger('wehive')

# ---------------------------------------------------------------------------
# Static exam data (source of truth; optionally override via DB)
# ---------------------------------------------------------------------------

EXAMS = [
    {
        "id": "toefl",
        "name": "TOEFL iBT",
        "org": "ETS",
        "type": "english_proficiency",
        "score_range": "0-120",
        "validity_years": 2,
        "fee_usd": 220,
        "fee_inr": 18300,
        "sections": ["Reading", "Listening", "Speaking", "Writing"],
        "accepted_countries": ["USA", "Canada", "Australia", "UK", "Germany", "Netherlands"],
        "register_url": "https://www.ets.org/toefl/test-takers/ibt/register",
        "official_url": "https://www.ets.org/toefl",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "toefl"},
    },
    {
        "id": "ielts",
        "name": "IELTS Academic",
        "org": "IDP / British Council",
        "type": "english_proficiency",
        "score_range": "0-9",
        "validity_years": 2,
        "fee_usd": 205,
        "fee_inr": 17500,
        "sections": ["Reading", "Listening", "Speaking", "Writing"],
        "accepted_countries": ["UK", "Australia", "Canada", "USA", "New Zealand", "Ireland"],
        "register_url": "https://www.britishcouncil.in/exam/ielts",
        "alt_register_url": "https://www.idp.com/india/ielts/",
        "official_url": "https://www.ielts.org",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "ielts"},
    },
    {
        "id": "gre",
        "name": "GRE General Test",
        "org": "ETS",
        "type": "graduate_admissions",
        "score_range": "260-340",
        "validity_years": 5,
        "fee_usd": 220,
        "fee_inr": 18300,
        "sections": ["Verbal Reasoning", "Quantitative Reasoning", "Analytical Writing"],
        "accepted_countries": ["USA", "Canada", "UK", "Germany", "Australia"],
        "register_url": "https://www.ets.org/gre/test-takers/general-test/register.html",
        "official_url": "https://www.ets.org/gre",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "gre"},
    },
    {
        "id": "gmat",
        "name": "GMAT Focus Edition",
        "org": "GMAC",
        "type": "mba_admissions",
        "score_range": "205-805",
        "validity_years": 5,
        "fee_usd": 275,
        "fee_inr": 22900,
        "sections": ["Quantitative Reasoning", "Verbal Reasoning", "Data Insights"],
        "accepted_countries": ["USA", "UK", "Canada", "Australia", "France", "Germany"],
        "register_url": "https://www.mba.com/mba/thegmat/appointmentsandcheckin",
        "official_url": "https://www.mba.com",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "gmat"},
    },
    {
        "id": "pte",
        "name": "PTE Academic",
        "org": "Pearson",
        "type": "english_proficiency",
        "score_range": "10-90",
        "validity_years": 2,
        "fee_usd": 190,
        "fee_inr": 15900,
        "sections": ["Speaking & Writing", "Reading", "Listening"],
        "accepted_countries": ["Australia", "UK", "Canada", "USA", "New Zealand"],
        "register_url": "https://www.pearsonpte.com/book-a-test",
        "official_url": "https://www.pearsonpte.com",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "pte"},
    },
    {
        "id": "duolingo",
        "name": "Duolingo English Test",
        "org": "Duolingo",
        "type": "english_proficiency",
        "score_range": "10-160",
        "validity_years": 2,
        "fee_usd": 59,
        "fee_inr": 4900,
        "sections": ["Literacy", "Comprehension", "Conversation", "Production"],
        "accepted_countries": ["USA", "Canada", "UK", "Australia", "Germany"],
        "register_url": "https://englishtest.duolingo.com/register",
        "official_url": "https://englishtest.duolingo.com",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "duolingo"},
    },
    {
        "id": "sat",
        "name": "SAT",
        "org": "College Board",
        "type": "undergrad_admissions",
        "score_range": "400-1600",
        "validity_years": 5,
        "fee_usd": 60,
        "fee_inr": 5000,
        "sections": ["Evidence-Based Reading & Writing", "Math"],
        "accepted_countries": ["USA", "Canada", "UK"],
        "register_url": "https://www.collegeboard.org/sat/register",
        "official_url": "https://www.collegeboard.org",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "sat"},
    },
    {
        "id": "act",
        "name": "ACT",
        "org": "ACT Inc.",
        "type": "undergrad_admissions",
        "score_range": "1-36",
        "validity_years": 5,
        "fee_usd": 63,
        "fee_inr": 5250,
        "sections": ["English", "Mathematics", "Reading", "Science"],
        "accepted_countries": ["USA", "Canada", "UK"],
        "register_url": "https://www.act.org/content/act/en/products-and-services/the-act/registration.html",
        "official_url": "https://www.act.org",
        "prep_namespace": "wehive-exam-prep",
        "pinecone_filter": {"exam": "act"},
    },
]

EXAM_INDEX = {e["id"]: e for e in EXAMS}

# ---------------------------------------------------------------------------
# Partner data (Credila + Zolve)
# ---------------------------------------------------------------------------

PARTNERS = {
    "credila": {
        "id": "credila",
        "name": "Credila",
        "subtitle": "HDFC Group",
        "type": "education_loan",
        "cta_url": "https://credila.com/apply?utm_source=wehive&utm_medium=partner",
        "features": [
            "No upper loan limit",
            "Collateral-free up to ₹40L",
            "Pre-visa loan sanction letter",
            "Covers tuition + living costs",
            "Repayment starts after course",
        ],
        "eligible_countries": ["USA", "UK", "Canada", "Australia", "Germany", "France",
                                "Netherlands", "Ireland", "New Zealand", "Singapore"],
    },
    "zolve": {
        "id": "zolve",
        "name": "Zolve",
        "subtitle": "Banking Without Borders",
        "type": "banking",
        "cta_url": "https://zolve.com/students?utm_source=wehive&utm_medium=partner",
        "features": [
            "No US credit history required",
            "Credit card before you land",
            "2% cashback on dining & travel",
            "Zero forex markup fees",
            "FDIC-insured US bank account",
        ],
        "eligible_countries": ["USA"],
    },
}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class PartnerClickEvent(BaseModel):
    partner_id: str
    source_page: Optional[str] = "home"
    user_id: Optional[str] = None
    session_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get('/list')
async def list_exams(exam_type: Optional[str] = None):
    """Return all exams, optionally filtered by type (english_proficiency, graduate_admissions, etc.)."""
    exams = EXAMS
    if exam_type:
        exams = [e for e in EXAMS if e["type"] == exam_type]
    return {"exams": exams, "total": len(exams)}


@router.get('/partners')
async def list_partners(destination: Optional[str] = None):
    """Return partner data, optionally filtered by eligible destination country."""
    partners = list(PARTNERS.values())
    if destination:
        dest_upper = destination.upper()
        partners = [
            p for p in partners
            if dest_upper in [c.upper() for c in p.get("eligible_countries", [])]
        ]
    return {"partners": partners, "total": len(partners)}


@router.get('/{exam_id}')
async def get_exam(exam_id: str):
    """Return a single exam's full detail."""
    exam = EXAM_INDEX.get(exam_id.lower())
    if not exam:
        raise HTTPException(status_code=404, detail=f"Exam '{exam_id}' not found")
    return exam


@router.post('/partner-click')
async def track_partner_click(event: PartnerClickEvent):
    """Track a partner banner CTA click for analytics."""
    if event.partner_id not in PARTNERS:
        raise HTTPException(status_code=404, detail=f"Partner '{event.partner_id}' not found")

    partner = PARTNERS[event.partner_id]

    # Store click event in MongoDB for analytics
    click_doc = {
        "partner_id": event.partner_id,
        "partner_name": partner["name"],
        "source_page": event.source_page,
        "user_id": event.user_id,
        "session_id": event.session_id,
        "timestamp": datetime.now(timezone.utc),
    }
    try:
        col = db["partner_clicks"]
        await col.insert_one(click_doc)
    except Exception as e:
        logger.warning("Failed to log partner click: %s", e)

    return {
        "success": True,
        "partner": event.partner_id,
        "redirect_url": partner["cta_url"],
    }
