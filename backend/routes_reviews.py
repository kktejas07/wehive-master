"""University reviews and ratings — user-generated."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth_utils import get_current_user
from db import db

router = APIRouter(prefix="/reviews", tags=["reviews"])

reviews_col = db["university_reviews"]


class ReviewCreate(BaseModel):
    university_id: str
    rating: int = Field(ge=1, le=5)
    title: str = ""
    review_text: str = ""
    pros: str = ""
    cons: str = ""
    program_name: str = ""
    year_attended: Optional[int] = None


@router.post("")
async def create_review(body: ReviewCreate, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "university_id": body.university_id,
        "user_id": user["_id"],
        "user_name": user.get("name") or "Anonymous",
        "user_avatar": f"https://ui-avatars.com/api/?name={user.get('name', 'A')}&background=1a2a5e&color=fff&size=64&bold=true",
        "rating": body.rating,
        "title": body.title,
        "review_text": body.review_text,
        "pros": body.pros,
        "cons": body.cons,
        "program_name": body.program_name,
        "year_attended": body.year_attended,
        "verified": False,
        "created_at": datetime.utcnow(),
    }
    await reviews_col.insert_one(doc)
    await _update_university_rating(body.university_id)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.get("/{university_id}")
async def list_reviews(
    university_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    total = await reviews_col.count_documents({"university_id": university_id})
    cursor = reviews_col.find(
        {"university_id": university_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    items = [doc async for doc in cursor]
    avg = await _average_rating(university_id)
    return {"total": total, "average_rating": avg, "items": items}


@router.delete("/{review_id}")
async def delete_review(review_id: str, user=Depends(get_current_user)):
    review = await reviews_col.find_one({"id": review_id})
    if not review:
        raise HTTPException(404, "Review not found")
    if review["user_id"] != user["_id"]:
        raise HTTPException(403, "You can only delete your own reviews")
    uni_id = review.get("university_id")
    await reviews_col.delete_one({"id": review_id})
    if uni_id:
        await _update_university_rating(uni_id)
    return {"ok": True}


async def _average_rating(university_id: str) -> float:
    pipeline = [
        {"$match": {"university_id": university_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
    ]
    async for doc in reviews_col.aggregate(pipeline):
        return round(doc["avg"], 1)
    return 0.0


async def _update_university_rating(university_id: str):
    avg = await _average_rating(university_id)
    count = await reviews_col.count_documents({"university_id": university_id})
    await db["universities_v2"].update_one(
        {"id": university_id},
        {"$set": {"rating_avg": avg, "rating_count": count}},
    )
