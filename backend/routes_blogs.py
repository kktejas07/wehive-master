from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timedelta
import logging

from db import global_blogs_col
from blog_aggregator_agent import run_aggregator

router = APIRouter(prefix="/blogs", tags=["Blogs"])
logger = logging.getLogger("wehive.routes_blogs")

class BlogResponse(BaseModel):
    id: str
    title: str
    country_id: str
    description: str
    readTime: str
    category: str
    imageUrl: Optional[str]
    author: dict
    status: str
    created_at: str

def serialize_doc(doc) -> dict:
    doc["id"] = str(doc["_id"])
    doc["created_at"] = doc["created_at"].isoformat() + "Z"
    del doc["_id"]
    return doc

@router.get("/")
async def get_blogs(
    country_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="ISO date filter start"),
    date_to: Optional[str] = Query(None, description="ISO date filter end"),
    period: Optional[str] = Query(None, description="'old' or 'new' relative filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    sort: str = Query("created_at"),
    order: str = Query("desc", regex="^(asc|desc)$"),
):
    filt = {"status": status or "approved"}
    if country_id:
        filt["country_id"] = country_id
    if category:
        filt["category"] = category

    if date_from or date_to:
        date_filt = {}
        if date_from:
            date_filt['$gte'] = datetime.fromisoformat(date_from)
        if date_to:
            date_filt['$lte'] = datetime.fromisoformat(date_to) + timedelta(days=1)
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
        total = await global_blogs_col.count_documents(filt)
        cursor = global_blogs_col.find(filt).sort(sort, sort_dir).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return {
            'items': [serialize_doc(doc) for doc in docs],
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit if total > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Error fetching blogs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/pending")
async def get_pending_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
):
    try:
        total = await global_blogs_col.count_documents({"status": "pending"})
        skip = (page - 1) * limit
        cursor = global_blogs_col.find({"status": "pending"}).sort('created_at', -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return {
            'items': [serialize_doc(doc) for doc in docs],
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit if total > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Error fetching pending blogs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{blog_id}/approve")
async def approve_blog(blog_id: str):
    try:
        query = {"_id": ObjectId(blog_id)}
        res = await global_blogs_col.update_one(query, {"$set": {"status": "approved"}})
        if res.modified_count == 0:
            raise HTTPException(status_code=404, detail="Blog not found or already approved")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error approving blog {blog_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{blog_id}/reject")
async def reject_blog(blog_id: str):
    try:
        query = {"_id": ObjectId(blog_id)}
        res = await global_blogs_col.update_one(query, {"$set": {"status": "rejected"}})
        if res.modified_count == 0:
            raise HTTPException(status_code=404, detail="Blog not found or already rejected")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error rejecting blog {blog_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/run_aggregator")
async def trigger_aggregator():
    """Trigger the blogs aggregator manually (admin only)."""
    import asyncio
    asyncio.create_task(run_aggregator())
    return {"status": "success", "message": "Blog aggregator started"}
