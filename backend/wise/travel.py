"""Wise Travel Marketplace — post-approval travel planning and affiliate marketplace.

Triggered when an application moves to 'approved' status.
Provides personalized travel plan + curated affiliate marketplace items.

Collections:
  travel_plans — One per approved application
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user
from db import travel_plans_col, applications

router = APIRouter(prefix="/travel", tags=["travel"])
logger = logging.getLogger("wehive.wise.travel")


# ---------------------------------------------------------------------------
# Affiliate marketplace catalogue
# ---------------------------------------------------------------------------

MARKETPLACE_CATEGORIES = [
    {
        "id": "flights",
        "name": "✈️ Flights",
        "description": "Best fares for your visa travel window",
        "items": [
            {"name": "Skyscanner", "type": "search", "url": "https://www.skyscanner.net/",
             "affiliate": True, "logo": "skyscanner"},
            {"name": "Google Flights", "type": "search", "url": "https://flights.google.com/",
             "affiliate": False, "logo": "google"},
            {"name": "MakeMyTrip Flights", "type": "booking",
             "url": "https://www.makemytrip.com/flights/", "affiliate": True, "logo": "mmt"},
        ],
    },
    {
        "id": "hotels",
        "name": "🏨 Hotels & Stays",
        "description": "Student housing and affordable stays near your campus",
        "items": [
            {"name": "Booking.com", "type": "booking", "url": "https://www.booking.com/",
             "affiliate": True, "logo": "booking"},
            {"name": "Hostelworld", "type": "booking", "url": "https://www.hostelworld.com/",
             "affiliate": True, "logo": "hostelworld"},
            {"name": "Airbnb", "type": "booking", "url": "https://www.airbnb.com/",
             "affiliate": True, "logo": "airbnb"},
            {"name": "Student Homes (UK)", "type": "booking",
             "url": "https://www.studentaccommodation.org/", "affiliate": True},
        ],
    },
    {
        "id": "esim",
        "name": "📱 International SIM / eSIM",
        "description": "Stay connected from day one",
        "items": [
            {"name": "Airalo eSIM", "type": "esim", "url": "https://www.airalo.com/",
             "affiliate": True, "logo": "airalo",
             "description": "eSIMs for 190+ countries from $5"},
            {"name": "Truphone", "type": "esim", "url": "https://www.truphone.com/",
             "affiliate": True},
            {"name": "GigSky", "type": "esim", "url": "https://www.gigsky.com/",
             "affiliate": True},
        ],
    },
    {
        "id": "forex",
        "name": "💱 Foreign Exchange & Banking",
        "description": "Best rates for sending and spending money abroad",
        "items": [
            {"name": "Wise (Formerly TransferWise)", "type": "forex",
             "url": "https://wise.com/", "affiliate": True, "logo": "wise",
             "description": "Best mid-market rates for international transfers"},
            {"name": "Revolut", "type": "forex", "url": "https://www.revolut.com/",
             "affiliate": True, "logo": "revolut"},
            {"name": "Niyo Global", "type": "bank", "url": "https://www.goniyo.com/",
             "affiliate": True, "description": "Zero forex markup — popular for Indian students"},
            {"name": "HDFC Forex Card", "type": "forex",
             "url": "https://www.hdfcbank.com/personal/pay/cards/prepaid-cards/forex-plus",
             "affiliate": True},
        ],
    },
    {
        "id": "insurance",
        "name": "🛡️ Travel & Health Insurance",
        "description": "Mandatory coverage for most student visas",
        "items": [
            {"name": "Policybazaar Travel", "type": "insurance",
             "url": "https://www.policybazaar.com/travel-insurance/",
             "affiliate": True, "description": "Schengen-approved, UK/US student plans"},
            {"name": "Columbus Direct", "type": "insurance",
             "url": "https://www.columbusdirect.com/", "affiliate": True},
            {"name": "World Nomads", "type": "insurance",
             "url": "https://www.worldnomads.com/", "affiliate": True, "logo": "worldnomads"},
            {"name": "Care Health (India)", "type": "insurance",
             "url": "https://www.careinsurance.com/", "affiliate": True},
        ],
    },
    {
        "id": "baggage",
        "name": "🧳 Luggage & Travel Accessories",
        "description": "Pack smart for your international move",
        "items": [
            {"name": "Samsonite India", "type": "product",
             "url": "https://www.samsonite.in/", "affiliate": True},
            {"name": "Amazon Travel Essentials", "type": "product",
             "url": "https://www.amazon.in/travel-essentials", "affiliate": True},
            {"name": "Travel Adapters & Converters",
             "url": "https://www.amazon.in/s?k=universal+travel+adapter", "affiliate": True},
            {"name": "Packing Cubes & Organizers",
             "url": "https://www.amazon.in/s?k=travel+packing+cubes", "affiliate": True},
        ],
    },
    {
        "id": "shipping",
        "name": "📦 International Shipping",
        "description": "Ship your belongings ahead",
        "items": [
            {"name": "FedEx International", "type": "shipping",
             "url": "https://www.fedex.com/en-in/", "affiliate": False},
            {"name": "DHL Express", "type": "shipping",
             "url": "https://www.dhl.com/in-en/", "affiliate": False},
            {"name": "ShipBob Student Pack", "type": "shipping",
             "url": "https://www.shipbob.com/", "affiliate": True},
        ],
    },
    {
        "id": "courses",
        "name": "🎓 Pre-Arrival Courses",
        "description": "Get a head start before you land",
        "items": [
            {"name": "IELTS/TOEFL Prep (Magoosh)",
             "url": "https://magoosh.com/", "affiliate": True},
            {"name": "Coursera — Orientation Courses",
             "url": "https://www.coursera.org/", "affiliate": True},
            {"name": "LinkedIn Learning", "url": "https://www.linkedin.com/learning/",
             "affiliate": True},
            {"name": "Udemy — Career Prep",
             "url": "https://www.udemy.com/", "affiliate": True},
        ],
    },
]

CATEGORY_INDEX = {c["id"]: c for c in MARKETPLACE_CATEGORIES}


# ---------------------------------------------------------------------------
# Travel plan creation (fires on approval)
# ---------------------------------------------------------------------------

async def create_travel_plan(application_id: str) -> Dict:
    """Create a travel plan for an approved application.

    Called by the application approval endpoint.
    """
    # Avoid duplicates
    existing = await travel_plans_col.find_one({"application_id": application_id})
    if existing:
        return existing

    app = await applications.find_one({"_id": application_id})
    if not app:
        raise ValueError(f"Application {application_id} not found")

    destination = app.get("destination_country") or app.get("country", "")
    visa_valid_from = app.get("visa_valid_from") or app.get("approved_at")

    # Build pre-travel checklist
    checklist = [
        {"item": "Book flights (at least 3 weeks before visa start date)", "done": False},
        {"item": "Arrange airport pickup or first night accommodation", "done": False},
        {"item": "Purchase travel health insurance (mandatory for most visas)", "done": False},
        {"item": "Get an eSIM or international SIM card", "done": False},
        {"item": "Open a forex account / get a forex card", "done": False},
        {"item": "Notify your bank of international travel", "done": False},
        {"item": "Pack mandatory documents (passport, visa, I-20/CAS/CoE, photos)", "done": False},
        {"item": "Print and carry all original admission and financial documents", "done": False},
        {"item": "Download offline maps for destination city", "done": False},
        {"item": "Research nearest hospital and emergency contacts", "done": False},
        {"item": "Understand customs allowances and prohibited items", "done": False},
        {"item": "Register with Indian Embassy/Consulate (MADAD portal)", "done": False},
    ]

    plan_id = str(uuid.uuid4())
    plan = {
        "_id": plan_id,
        "plan_id": plan_id,
        "application_id": application_id,
        "user_id": str(app.get("user_id", "")),
        "destination": destination,
        "visa_valid_from": visa_valid_from,
        "checklist": checklist,
        "marketplace_clicks": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await travel_plans_col.insert_one(plan)
    logger.info("Travel plan created for application %s → destination %s", application_id, destination)
    return plan


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ClickRequest(BaseModel):
    application_id: str
    category_id: str
    item_name: str


class ChecklistUpdateRequest(BaseModel):
    item_index: int
    done: bool


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/plan/{application_id}")
async def get_travel_plan(application_id: str, user=Depends(get_current_user)):
    plan = await travel_plans_col.find_one({"application_id": application_id})
    if not plan:
        raise HTTPException(404, "Travel plan not found — application may not be approved yet")
    if plan.get("user_id") and plan["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Access denied")
    plan["id"] = str(plan.pop("_id", ""))
    return plan


@router.get("/marketplace/{application_id}")
async def get_marketplace(application_id: str, user=Depends(get_current_user)):
    """Return curated marketplace for the application's destination."""
    plan = await travel_plans_col.find_one(
        {"application_id": application_id}, {"destination": 1, "user_id": 1}
    )
    if not plan:
        raise HTTPException(404, "No travel plan found for this application")
    if plan.get("user_id") and plan["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Access denied")

    destination = plan.get("destination", "")
    # Could filter categories by destination in future; return all for now
    return {
        "destination": destination,
        "categories": MARKETPLACE_CATEGORIES,
        "featured": _get_featured(destination),
    }


def _get_featured(destination: str) -> List[Dict]:
    """Return 3 featured items for the destination."""
    featured = [
        {"category": "flights", "item": MARKETPLACE_CATEGORIES[0]["items"][0]},  # Skyscanner
        {"category": "esim", "item": MARKETPLACE_CATEGORIES[2]["items"][0]},     # Airalo
        {"category": "forex", "item": MARKETPLACE_CATEGORIES[3]["items"][0]},    # Wise
    ]
    if "GB" in destination.upper() or "UK" in destination.upper():
        featured.append({"category": "insurance",
                         "item": MARKETPLACE_CATEGORIES[4]["items"][0]})
    return featured


@router.post("/clicks")
async def track_click(req: ClickRequest, user=Depends(get_current_user)):
    """Track an affiliate marketplace click."""
    await travel_plans_col.update_one(
        {"application_id": req.application_id},
        {"$push": {
            "marketplace_clicks": {
                "category_id": req.category_id,
                "item_name": req.item_name,
                "user_id": str(user["_id"]),
                "ts": datetime.now(timezone.utc),
            }
        }},
    )
    return {"status": "tracked"}


@router.patch("/plan/{application_id}/checklist")
async def update_checklist(
    application_id: str,
    req: ChecklistUpdateRequest,
    user=Depends(get_current_user),
):
    plan = await travel_plans_col.find_one({"application_id": application_id})
    if not plan:
        raise HTTPException(404, "Travel plan not found")
    checklist = plan.get("checklist", [])
    if req.item_index < 0 or req.item_index >= len(checklist):
        raise HTTPException(400, "Invalid item_index")

    update_key = f"checklist.{req.item_index}.done"
    await travel_plans_col.update_one(
        {"application_id": application_id},
        {"$set": {update_key: req.done, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "updated", "item_index": req.item_index, "done": req.done}


# ---------------------------------------------------------------------------
# Admin: pipeline trigger + run history
# ---------------------------------------------------------------------------

@router.get("/pipeline/runs")
async def get_pipeline_runs(limit: int = 20, _=Depends(get_current_user)):
    from db import pipeline_runs_col
    runs = await pipeline_runs_col.find(
        {}, {"_id": 0}
    ).sort("run_at", -1).limit(limit).to_list(length=limit)
    return {"runs": runs}


@router.post("/pipeline/trigger")
async def trigger_pipeline(
    countries: Optional[List[str]] = None,
    _=Depends(get_current_user),
):
    """Manually trigger the country rules pipeline (admin)."""
    from wise.pipeline import run_pipeline
    result = await run_pipeline(countries=countries)
    return result
