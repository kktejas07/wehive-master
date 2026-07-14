"""Events Management API — handles public retrieval and admin scraping controls.

Public Endpoints:
  GET /api/events            Fetch approved events with pagination & filters

Admin Endpoints:
  GET /api/events/pending    Fetch pending events
  POST /api/events/{id}/action Approve/Reject event
  POST /api/events/scrape/trigger Trigger the ScrapeGraphAI pipeline
  POST /api/events/run_aggregator Trigger the full event aggregator
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from db import global_events_col
from audit import record as audit_record
from event_aggregator_agent import fetch_events_from_url, run_aggregator as run_event_aggregator

router = APIRouter(prefix="/events", tags=["events"])

# --- PUBLIC ROUTES ---
@router.get("")
async def public_events(
    country: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: approved, pending, rejected"),
    date_from: Optional[str] = Query(None, description="ISO date filter start (e.g. 2026-01-01)"),
    date_to: Optional[str] = Query(None, description="ISO date filter end (e.g. 2026-12-31)"),
    period: Optional[str] = Query(None, description="'old' or 'new' relative filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    sort: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", regex="^(asc|desc)$"),
):
    filt = {'status': status or 'approved'}
    if country:
        filt['country_id'] = country
    if category:
        filt['category'] = category
    
    # Date range filter
    if date_from or date_to:
        date_filt = {}
        if date_from:
            date_filt['$gte'] = datetime.fromisoformat(date_from)
        if date_to:
            date_filt['$lte'] = datetime.fromisoformat(date_to) + timedelta(days=1)
        filt['created_at'] = date_filt
    
    # Old/new relative period filter
    if period == 'new':
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        filt.setdefault('created_at', {})['$gte'] = seven_days_ago
    elif period == 'old':
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        filt.setdefault('created_at', {})['$lt'] = seven_days_ago
    
    sort_dir = -1 if order == 'desc' else 1
    skip = (page - 1) * limit
    total = await global_events_col.count_documents(filt)
    cursor = global_events_col.find(filt).sort(sort, sort_dir).skip(skip).limit(limit)
    events = []
    async for evt in cursor:
        evt['id'] = str(evt.pop('_id', ''))
        if 'created_at' in evt and isinstance(evt['created_at'], datetime):
            evt['created_at'] = evt['created_at'].isoformat()
        events.append(evt)
        
    return {
        'items': events,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit if total > 0 else 0,
    }


# --- ADMIN ROUTES ---
class GlobalEventAction(BaseModel):
    action: Literal['approve', 'reject']

class ScrapeTriggerRequest(BaseModel):
    url: str
    country_id: str
    platform: Optional[str] = None

@router.get("/pending")
async def admin_get_pending_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    user=Depends(get_current_admin_flex),
):
    skip = (page - 1) * limit
    total = await global_events_col.count_documents({"status": "pending"})
    cursor = global_events_col.find({"status": "pending"}).sort('created_at', -1).skip(skip).limit(limit)
    events = []
    async for evt in cursor:
        evt['id'] = str(evt.pop('_id', ''))
        if 'created_at' in evt and isinstance(evt['created_at'], datetime):
            evt['created_at'] = evt['created_at'].isoformat()
        events.append(evt)
    return {'items': events, 'total': total, 'page': page, 'limit': limit, 'pages': (total + limit - 1) // limit if total > 0 else 0}

@router.post("/{event_id}/action")
async def admin_event_action(event_id: str, payload: GlobalEventAction, user=Depends(get_current_admin_flex)):
    from bson import ObjectId
    
    query = {}
    if len(event_id) == 24:
        try:
            query = {"_id": ObjectId(event_id)}
        except:
            query = {"id": event_id}
    else:
        query = {"$or": [{"_id": event_id}, {"id": event_id}]}

    new_status = 'approved' if payload.action == 'approve' else 'rejected'
    res = await global_events_col.update_one(query, {"$set": {"status": new_status}})
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
        
    await audit_record(user['id'], f"{payload.action.capitalize()}d global event {event_id}", "global_event", event_id)
    return {"status": "success", "event_id": event_id, "new_status": new_status}

@router.post("/scrape/trigger")
async def admin_trigger_scrape(payload: ScrapeTriggerRequest, user=Depends(get_current_admin_flex)):
    """Triggers the ScrapeGraphAI pipeline on a specific URL or social media profile."""
    try:
        events = await fetch_events_from_url(payload.url, payload.country_id, payload.platform)
        total_added = 0
        for evt in events:
            doc = {
                "name": evt.get("name"),
                "country_id": payload.country_id.lower().replace(" ", "-"),
                "date": evt.get("date"),
                "category": evt.get("category"),
                "image_url": evt.get("image_url"),
                "status": "pending",
                "is_high_risk": evt.get("is_high_risk", False),
                "created_at": datetime.utcnow()
            }
            await global_events_col.insert_one(doc)
            total_added += 1
        
        await audit_record(user['id'], f"Triggered event scrape for {payload.url}", "scrape_trigger", payload.url)
        return {"status": "success", "events_added": total_added}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run_aggregator")
async def admin_run_aggregator(user=Depends(get_current_admin_flex)):
    """Trigger the full event aggregator pipeline (admin only)."""
    try:
        asyncio.create_task(run_event_aggregator())
        await audit_record(user['id'], "Triggered full event aggregator", "aggregator_trigger", "events")
        return {"status": "success", "message": "Event aggregator started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
