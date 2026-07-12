from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
import logging

from db import global_news_col
from news_aggregator_agent import run_aggregator

router = APIRouter(prefix="/api/news", tags=["News"])
logger = logging.getLogger("wehive.routes_news")

class NewsResponse(BaseModel):
    id: str
    title: str
    country_id: str
    content: str
    date: str
    category: str
    source_url: Optional[str]
    status: str
    created_at: str

def serialize_doc(doc) -> dict:
    doc["id"] = str(doc["_id"])
    doc["created_at"] = doc["created_at"].isoformat() + "Z"
    del doc["_id"]
    return doc

@router.get("/", response_model=List[NewsResponse])
async def get_news(country_id: Optional[str] = None, category: Optional[str] = None, limit: int = 10):
    filt = {"status": "approved"}
    if country_id:
        filt["country_id"] = country_id
    if category:
        filt["category"] = category
        
    try:
        cursor = global_news_col.find(filt).sort('created_at', -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/pending", response_model=List[NewsResponse])
async def get_pending_news():
    try:
        cursor = global_news_col.find({"status": "pending"}).sort('created_at', -1)
        docs = await cursor.to_list(length=100)
        return [serialize_doc(doc) for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching pending news: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{news_id}/approve")
async def approve_news(news_id: str):
    try:
        query = {"_id": ObjectId(news_id)}
        res = await global_news_col.update_one(query, {"$set": {"status": "approved"}})
        if res.modified_count == 0:
            raise HTTPException(status_code=404, detail="News not found or already approved")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error approving news {news_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{news_id}/reject")
async def reject_news(news_id: str):
    try:
        query = {"_id": ObjectId(news_id)}
        res = await global_news_col.update_one(query, {"$set": {"status": "rejected"}})
        if res.modified_count == 0:
            raise HTTPException(status_code=404, detail="News not found or already rejected")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error rejecting news {news_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/run_aggregator")
async def trigger_aggregator():
    """Trigger the news aggregator manually (admin only)."""
    import asyncio
    asyncio.create_task(run_aggregator())
    return {"status": "success", "message": "News aggregator started"}
