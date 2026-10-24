from fastapi import APIRouter, HTTPException, Depends, Query, Header
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timedelta
import logging

from db import global_news_col
from news_aggregator_agent import run_aggregator
from ai_marketplace import marketplace
from auth_utils import get_current_user
from admin_auth import get_current_admin_flex

router = APIRouter(prefix="/news", tags=["News"])
logger = logging.getLogger("wehive.routes_news")

def serialize_doc(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    created = doc.get("created_at")
    if isinstance(created, datetime):
        doc["created_at"] = created.isoformat() + "Z"
    return doc

@router.get("")
async def get_news(
    country_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="ISO date filter start"),
    date_to: Optional[str] = Query(None, description="ISO date filter end"),
    period: Optional[str] = Query(None, description="'old' or 'new' relative filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    sort: str = Query("published_at", regex="^(published_at|created_at|date|title)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    authorization: Optional[str] = Header(default=None),
):
    if status and status != "approved":
        await get_current_admin_flex(authorization)
    filt = {"status": status or "approved"}
    if country_id:
        filt["country_id"] = country_id
    if category:
        filt["category"] = category

    if date_from or date_to:
        date_filt = {}
        try:
            if date_from:
                date_filt['$gte'] = datetime.fromisoformat(date_from)
            if date_to:
                date_filt['$lte'] = datetime.fromisoformat(date_to) + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from/date_to must be ISO dates (YYYY-MM-DD)")
        filt['created_at'] = date_filt

    if period == 'new':
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        filt.setdefault('created_at', {})['$gte'] = seven_days_ago
    elif period == 'old':
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        filt.setdefault('created_at', {})['$lt'] = seven_days_ago

    sort_dir = -1 if order == 'desc' else 1
    skip = (page - 1) * limit
        
    try:
        total = await global_news_col.count_documents(filt)
        # Newest published first; ingestion time breaks ties (and orders items with no published date).
        cursor = global_news_col.find(filt).sort([(sort, sort_dir), ("created_at", sort_dir)]).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return {
            'items': [serialize_doc(doc) for doc in docs],
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit if total > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/digest")
async def get_news_digest(
    user=Depends(get_current_user)
):
    """Generates a daily intelligence digest (HN Briefing / DevPulse style) of recent news."""
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    
    cursor = global_news_col.find({"created_at": {"$gte": one_day_ago}, "status": "approved"}).limit(30)
    recent_news = await cursor.to_list(length=30)
    
    if not recent_news:
        return {"digest": "No new news in the last 24 hours to digest."}
        
    news_text = "\n\n".join([f"Title: {n.get('title')}\nCategory: {n.get('category')}\nContent: {n.get('content')}" for n in recent_news])
    
    prompt = f"""You are an elite Signal Intelligence Agent. Review the following news items from the last 24 hours and write a high-quality, executive 'Daily Digest'.
Group the news logically (e.g., Policy Updates, Travel Advisories, General News). Use bullet points. Keep it professional and concise.

News Items:
{news_text}
"""
    try:
        reply = await marketplace.chat(
            user_id=user["_id"],
            system_prompt="You are an elite AI intelligence analyst. Output clean markdown.",
            user_prompt=prompt,
            max_tokens=1000
        )
        return {"digest": reply}
    except Exception as e:
        logger.error(f"Error generating news digest: {e}")
        raise HTTPException(status_code=502, detail="AI Service is busy")

@router.get("/pending")
async def get_pending_news(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    _admin=Depends(get_current_admin_flex),
):
    try:
        total = await global_news_col.count_documents({"status": "pending"})
        skip = (page - 1) * limit
        cursor = global_news_col.find({"status": "pending"}).sort('created_at', -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return {
            'items': [serialize_doc(doc) for doc in docs],
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit if total > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Error fetching pending news: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{news_id}/approve")
async def approve_news(news_id: str, _admin=Depends(get_current_admin_flex)):
    """Set a news item's moderation status to 'approved' (admin only)."""
    if not ObjectId.is_valid(news_id):
        raise HTTPException(status_code=404, detail="News not found")
    res = await global_news_col.update_one({"_id": ObjectId(news_id)}, {"$set": {"status": "approved"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"status": "success", "new_status": "approved"}

@router.post("/{news_id}/reject")
async def reject_news(news_id: str, _admin=Depends(get_current_admin_flex)):
    """Set a news item's moderation status to 'rejected' (admin only)."""
    if not ObjectId.is_valid(news_id):
        raise HTTPException(status_code=404, detail="News not found")
    res = await global_news_col.update_one({"_id": ObjectId(news_id)}, {"$set": {"status": "rejected"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"status": "success", "new_status": "rejected"}

@router.post("/run_aggregator")
async def trigger_aggregator(_admin=Depends(get_current_admin_flex)):
    """Trigger the news aggregator manually (admin only)."""
    import asyncio
    asyncio.create_task(run_aggregator())
    return {"status": "success", "message": "News aggregator started"}
