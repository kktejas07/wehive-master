"""Student Memory Routes — user profile and admin memory management.

User endpoints:
  GET    /api/student-memory/me/profile         — current user's extracted profile
  GET    /api/student-memory/me/memories         — all memories (paginated)
  DELETE /api/student-memory/me/memories/{key}   — delete a specific memory

Admin endpoints:
  GET  /api/student-memory/admin/profiles             — paginated user profiles
  GET  /api/student-memory/admin/profiles/{user_id}   — specific student profile + memories
  GET  /api/student-memory/admin/stats                — extraction statistics
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from admin_auth import get_current_admin_flex
from auth_utils import get_current_user
from db import db

from student_memory import (
    delete_memory,
    get_student_profile,
)

router = APIRouter(prefix="/student-memory", tags=["student-memory"])
logger = logging.getLogger("wehive.routes_student_memory")

COLL = "student_memories"


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------


@router.get("/me/profile")
async def my_profile(user=Depends(get_current_user)):
    profile = await get_student_profile(user["id"])
    return {"ok": True, "profile": profile}


@router.get("/me/memories")
async def my_memories(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
):
    coll = db[COLL]
    cursor = coll.find(
        {"user_id": user["id"]},
        {"_id": 0},
    ).sort("extracted_at", -1).skip(skip).limit(limit)
    items = [doc async for doc in cursor]
    total = await coll.count_documents({"user_id": user["id"]})
    return {"ok": True, "items": items, "total": total}


@router.delete("/me/memories/{key:path}")
async def delete_my_memory(key: str, user=Depends(get_current_user)):
    deleted = await delete_memory(user["id"], key)
    if not deleted:
        raise HTTPException(404, "Memory not found")
    return {"ok": True, "deleted": key}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.get("/admin/profiles")
async def admin_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _admin=Depends(get_current_admin_flex),
):
    coll = db[COLL]
    pipeline = [
        {"$group": {
            "_id": "$user_id",
            "memory_count": {"$sum": 1},
            "latest": {"$max": "$extracted_at"},
            "keys": {"$addToSet": "$key"},
        }},
        {"$sort": {"latest": -1}},
        {"$skip": skip},
        {"$limit": limit},
    ]
    items = [doc async for doc in coll.aggregate(pipeline)]
    for item in items:
        item["user_id"] = item.pop("_id")
    total_pipeline = [{"$group": {"_id": "$user_id"}}, {"$count": "n"}]
    total_result = [doc async for doc in coll.aggregate(total_pipeline)]
    total = total_result[0]["n"] if total_result else 0
    return {"ok": True, "items": items, "total": total}


@router.get("/admin/profiles/{user_id}")
async def admin_user_profile(user_id: str, _admin=Depends(get_current_admin_flex)):
    coll = db[COLL]
    profile = await get_student_profile(user_id)
    memories = [doc async for doc in coll.find({"user_id": user_id}, {"_id": 0}).sort("extracted_at", -1)]
    if not memories:
        raise HTTPException(404, "No memories for this user")
    return {"ok": True, "user_id": user_id, "profile": profile, "memories": memories}


@router.get("/admin/stats")
async def admin_stats(_admin=Depends(get_current_admin_flex)):
    coll = db[COLL]
    total_memories = await coll.count_documents({})
    users_pipeline = [{"$group": {"_id": "$user_id"}}, {"$count": "n"}]
    users_result = [doc async for doc in coll.aggregate(users_pipeline)]
    total_users = users_result[0]["n"] if users_result else 0
    avg_per_user = round(total_memories / total_users, 1) if total_users else 0

    top_keys_pipeline = [
        {"$group": {"_id": "$key", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    top_keys = [doc async for doc in coll.aggregate(top_keys_pipeline)]

    return {
        "ok": True,
        "total_users_with_memories": total_users,
        "total_memories": total_memories,
        "avg_memories_per_user": avg_per_user,
        "top_extracted_facts": [{"key": d["_id"], "count": d["count"]} for d in top_keys],
    }
