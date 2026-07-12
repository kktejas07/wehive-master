from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
import logging

from core.db import global_blogs_col
from shared.blog_aggregator_agent import run_aggregator

router = APIRouter(prefix="/api/blogs", tags=["Blogs"])
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

@router.get("/", response_model=List[BlogResponse])
async def get_blogs(country_id: Optional[str] = None, category: Optional[str] = None, limit: int = 10):
    filt = {"status": "approved"}
    if country_id:
        filt["country_id"] = country_id
    if category:
        filt["category"] = category
        
    try:
        cursor = global_blogs_col.find(filt).sort('created_at', -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching blogs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/pending", response_model=List[BlogResponse])
async def get_pending_blogs():
    try:
        cursor = global_blogs_col.find({"status": "pending"}).sort('created_at', -1)
        docs = await cursor.to_list(length=100)
        return [serialize_doc(doc) for doc in docs]
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
