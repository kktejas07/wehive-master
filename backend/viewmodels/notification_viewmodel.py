"""Notification ViewModel — list, mark-read, mark-all-read."""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from db import db

notifications_col = db['notifications']


def _serialize(n: dict) -> dict:
    return {
        "id": str(n.get("_id", "")),
        "kind": n.get("kind", n.get("type", "general")),
        "title": n.get("title", ""),
        "body": n.get("body", n.get("message", "")),
        "read": n.get("read", False),
        "created_at": n["created_at"].isoformat() if hasattr(n.get("created_at"), "isoformat") else str(n.get("created_at", "")),
        "link": n.get("link"),
    }


class NotificationViewModel:
    @staticmethod
    async def list_for_user(user_id: str, page: int = 1, per_page: int = 30) -> dict:
        query = {"user_id": user_id}
        skip = (page - 1) * per_page
        total = await notifications_col.count_documents(query)
        unread = await notifications_col.count_documents({**query, "read": {"$ne": True}})
        items = await notifications_col.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
        return {
            "items": [_serialize(n) for n in items],
            "total": total,
            "unread": unread,
            "page": page,
            "per_page": per_page,
        }

    @staticmethod
    async def mark_read(notif_id: str, user_id: str) -> bool:
        result = await notifications_col.update_one(
            {"_id": notif_id, "user_id": user_id},
            {"$set": {"read": True, "read_at": datetime.utcnow()}},
        )
        return result.modified_count > 0

    @staticmethod
    async def mark_all_read(user_id: str) -> int:
        result = await notifications_col.update_many(
            {"user_id": user_id, "read": {"$ne": True}},
            {"$set": {"read": True, "read_at": datetime.utcnow()}},
        )
        return result.modified_count
