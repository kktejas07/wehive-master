"""Landing page config endpoints — exam prep, partners, global trends.

GET  /api/exam-prep           — list exam configs (seed on first request)
GET  /api/partners            — list partner configs (seed on first request)
GET  /api/global-trends       — list global trends (seed on first request)
POST   /api/admin/global-trends       — create trend (JWT protected)
PATCH  /api/admin/global-trends/{id} — update trend (JWT protected)
DELETE /api/admin/global-trends/{id} — delete trend (JWT protected)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from db import db

router = APIRouter(tags=["landing"])

exam_configs_col = db["exam_configs"]
partner_configs_col = db["partner_configs"]
global_trends_col = db["global_trends"]

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

_EXAM_SEED = [
    {
        "id": "toefl",
        "name": "TOEFL",
        "full_name": "Test of English as a Foreign Language",
        "fee_usd": 205,
        "fee_inr": 17000,
        "registration_url": "https://www.ets.org/toefl",
        "logo_color": "#005A9C",
        "description": "Widely accepted by 11,000+ universities in 150 countries.",
        "validity_years": 2,
        "score_range": "0–120",
        "accepted_by": ["USA", "Canada", "UK", "Australia"],
    },
    {
        "id": "ielts",
        "name": "IELTS",
        "full_name": "International English Language Testing System",
        "fee_usd": 215,
        "fee_inr": 17000,
        "registration_url": "https://www.ielts.org",
        "logo_color": "#E31837",
        "description": "Most popular English test for study & immigration globally.",
        "validity_years": 2,
        "score_range": "0–9",
        "accepted_by": ["UK", "Australia", "Canada", "New Zealand"],
    },
    {
        "id": "gre",
        "name": "GRE",
        "full_name": "Graduate Record Examination",
        "fee_usd": 220,
        "fee_inr": 22500,
        "registration_url": "https://www.ets.org/gre",
        "logo_color": "#003B71",
        "description": "Required for most US/Canada graduate school admissions.",
        "validity_years": 5,
        "score_range": "260–340",
        "accepted_by": ["USA", "Canada", "UK"],
    },
    {
        "id": "gmat-focus",
        "name": "GMAT Focus",
        "full_name": "Graduate Management Admission Test Focus Edition",
        "fee_usd": 275,
        "fee_inr": 22000,
        "registration_url": "https://www.mba.com/exams/gmat",
        "logo_color": "#005587",
        "description": "Premier MBA admissions test accepted worldwide.",
        "validity_years": 5,
        "score_range": "205–805",
        "accepted_by": ["USA", "UK", "EU", "Australia"],
    },
    {
        "id": "pte",
        "name": "PTE",
        "full_name": "Pearson Test of English Academic",
        "fee_usd": 185,
        "fee_inr": 15900,
        "registration_url": "https://www.pearsonpte.com",
        "logo_color": "#0066CC",
        "description": "AI-scored English test with fast results in 48 hours.",
        "validity_years": 2,
        "score_range": "10–90",
        "accepted_by": ["Australia", "UK", "New Zealand", "USA"],
    },
    {
        "id": "duolingo",
        "name": "Duolingo English Test",
        "full_name": "Duolingo English Test",
        "fee_usd": 59,
        "fee_inr": 4900,
        "registration_url": "https://englishtest.duolingo.com",
        "logo_color": "#58CC02",
        "description": "Affordable online English test accepted by 4,000+ programs.",
        "validity_years": 2,
        "score_range": "10–160",
        "accepted_by": ["USA", "Canada", "UK", "Australia"],
    },
    {
        "id": "sat",
        "name": "SAT",
        "full_name": "Scholastic Assessment Test",
        "fee_usd": 60,
        "fee_inr": 7500,
        "registration_url": "https://satsuite.collegeboard.org/sat",
        "logo_color": "#009CDE",
        "description": "Standard undergraduate admissions test for US universities.",
        "validity_years": 5,
        "score_range": "400–1600",
        "accepted_by": ["USA", "Canada"],
    },
    {
        "id": "act",
        "name": "ACT",
        "full_name": "American College Testing",
        "fee_usd": 63,
        "fee_inr": 7900,
        "registration_url": "https://www.act.org",
        "logo_color": "#E8001C",
        "description": "Alternative to SAT; widely accepted by US colleges.",
        "validity_years": 5,
        "score_range": "1–36",
        "accepted_by": ["USA"],
    },
]

_PARTNER_SEED = [
    {
        "id": "credila",
        "name": "Credila",
        "tagline": "HDFC Education Loans — Study Abroad Financing",
        "logo_color": "#EE3424",
        "cta_url": "https://www.credila.com",
        "benefits": [
            "Loan up to ₹1.5 Cr without collateral",
            "Quick approval in 48 hours",
            "Tax benefit under Section 80E",
            "Covers tuition, living, travel expenses",
        ],
        "badge": "HDFC Group",
    },
    {
        "id": "zolve",
        "name": "Zolve",
        "tagline": "US Banking for International Students — No SSN Needed",
        "logo_color": "#7B2FBE",
        "cta_url": "https://www.zolve.com",
        "benefits": [
            "Open US bank account before you land",
            "Credit card with no US credit history required",
            "No hidden fees or minimum balance",
            "Instant virtual card for online purchases",
        ],
        "badge": "Fintech Partner",
    },
]

_TRENDS_SEED = [
    {
        "id": "trend-001",
        "urgency": "URGENT",
        "title": "Canada Caps International Student Permits for 2024–25",
        "description": "Canada has announced a cap on new study permits for 2024 and 2025. Apply early and check provincial quotas before submitting applications.",
        "country": "Canada",
        "flag": "🇨🇦",
        "tag": "Study Permit",
        "updated_at": "2024-01-15T00:00:00Z",
    },
    {
        "id": "trend-002",
        "urgency": "UPDATE",
        "title": "UK Graduate Route Visa Extended to 3 Years for STEM Graduates",
        "description": "The UK government has extended the Graduate Route stay period to 3 years for graduates in STEM subjects from select universities.",
        "country": "UK",
        "flag": "🇬🇧",
        "tag": "Graduate Visa",
        "updated_at": "2024-02-10T00:00:00Z",
    },
    {
        "id": "trend-003",
        "urgency": "GOOD NEWS",
        "title": "Australia Raises Post-Study Work Visa Duration",
        "description": "Australia has increased post-study work rights for international graduates. Bachelor's holders now get 2 years; master's holders get 3 years.",
        "country": "Australia",
        "flag": "🇦🇺",
        "tag": "Work Visa",
        "updated_at": "2024-03-01T00:00:00Z",
    },
    {
        "id": "trend-004",
        "urgency": "ALERT",
        "title": "US F-1 Visa Interview Wait Times Surge in India",
        "description": "F-1 student visa interview wait times have exceeded 300+ days at Mumbai and Chennai consulates. Schedule as early as possible.",
        "country": "USA",
        "flag": "🇺🇸",
        "tag": "F-1 Visa",
        "updated_at": "2024-03-20T00:00:00Z",
    },
]


async def _seed_if_empty(col, seed: list, id_field: str = "id") -> None:
    count = await col.count_documents({})
    if count == 0:
        docs = [{**d, "_id": d[id_field]} for d in seed]
        await col.insert_many(docs)


# ---------------------------------------------------------------------------
# Public GET endpoints
# ---------------------------------------------------------------------------


@router.get("/exam-prep")
async def get_exam_prep():
    await _seed_if_empty(exam_configs_col, _EXAM_SEED)
    cursor = exam_configs_col.find({}, {"_id": 0})
    exams = await cursor.to_list(length=50)
    return {"exams": exams}


@router.get("/partners")
async def get_partners():
    await _seed_if_empty(partner_configs_col, _PARTNER_SEED)
    cursor = partner_configs_col.find({}, {"_id": 0})
    partners = await cursor.to_list(length=20)
    return {"partners": partners}


@router.get("/global-trends")
async def get_global_trends():
    await _seed_if_empty(global_trends_col, _TRENDS_SEED)
    cursor = global_trends_col.find({}, {"_id": 0}).sort("updated_at", -1)
    trends = await cursor.to_list(length=50)
    return {"trends": trends}


# ---------------------------------------------------------------------------
# Admin write endpoints for global-trends
# ---------------------------------------------------------------------------


class TrendBody(BaseModel):
    urgency: str
    title: str
    description: str
    country: str
    flag: str
    tag: str


@router.post("/admin/global-trends")
async def create_trend(body: TrendBody, _=Depends(get_current_admin_flex)):
    oid = str(ObjectId())
    doc = {
        "_id": oid,
        "id": oid,
        **body.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await global_trends_col.insert_one(doc)
    out = {k: v for k, v in doc.items() if k != "_id"}
    return out


@router.patch("/admin/global-trends/{trend_id}")
async def update_trend(trend_id: str, body: TrendBody, _=Depends(get_current_admin_flex)):
    update = {
        **body.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await global_trends_col.update_one({"_id": trend_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Trend not found")
    doc = await global_trends_col.find_one({"_id": trend_id}, {"_id": 0})
    return doc


@router.delete("/admin/global-trends/{trend_id}")
async def delete_trend(trend_id: str, _=Depends(get_current_admin_flex)):
    result = await global_trends_col.delete_one({"_id": trend_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Trend not found")
    return {"deleted": trend_id}
