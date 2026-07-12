"""Events Management API — handles public retrieval and admin scraping controls.

Public Endpoints:
  GET /api/events            Fetch approved events

Admin Endpoints:
  GET /api/events/pending    Fetch pending events
  POST /api/events/{id}/action Approve/Reject event
  POST /api/events/scrape/trigger Trigger the ScrapeGraphAI pipeline
"""

import asyncio
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from db import global_events_col
from audit import record as audit_record
from event_aggregator_agent import fetch_events_from_url

router = APIRouter(prefix="/events", tags=["events"])

# --- PUBLIC ROUTES ---
@router.get("/")
async def public_events(
    country: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    filt = {'status': 'approved'}
    if country:
        filt['country_id'] = country
    
    cursor = global_events_col.find(filt).sort('created_at', -1).limit(limit)
    events = []
    async for evt in cursor:
        evt['id'] = str(evt.pop('_id', ''))
        if 'created_at' in evt and isinstance(evt['created_at'], datetime):
            evt['created_at'] = evt['created_at'].isoformat()
        events.append(evt)
        
    return {'items': events, 'total': len(events)}


# --- ADMIN ROUTES ---
class GlobalEventAction(BaseModel):
    action: Literal['approve', 'reject']

class ScrapeTriggerRequest(BaseModel):
    url: str
    country_id: str
    platform: Optional[str] = None

@router.get("/pending")
async def admin_get_pending_events(user=Depends(get_current_admin_flex)):
    cursor = global_events_col.find({"status": "pending"}).sort('created_at', -1)
    events = []
    async for evt in cursor:
        evt['id'] = str(evt.pop('_id', ''))
        if 'created_at' in evt and isinstance(evt['created_at'], datetime):
            evt['created_at'] = evt['created_at'].isoformat()
        events.append(evt)
    return events

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
