"""User ViewModel — profile assembly and user-level mutations."""
from datetime import datetime
from typing import Optional

from db import users, applications


def _iso(v) -> str:
    return v.isoformat() if hasattr(v, "isoformat") else str(v or "")


def _journey_stage(status: str) -> str:
    if status in ("approved", "visa_issued"):
        return "approved"
    if status in ("submitted", "in_review", "embassy"):
        return "in_review"
    if status in ("docs_pending", "payment_pending"):
        return "action_required"
    if status:
        return "active"
    return "inquiry"


class UserViewModel:
    @staticmethod
    async def get_profile(user_id: str) -> Optional[dict]:
        user = await users.find_one({"_id": user_id})
        if not user:
            return None
        latest_app = await applications.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        total_apps = await applications.count_documents({"user_id": user_id})
        stage = _journey_stage(latest_app.get("status", "") if latest_app else "")
        return {
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "avatar_url": user.get("avatar_url"),
            "is_premium": bool(user.get("is_premium", False)),
            "journey_stage": stage,
            "total_applications": total_apps,
            "latest_application": {
                "id": str(latest_app["_id"]),
                "status": latest_app.get("status", ""),
                "destination": latest_app.get("form_data", {}).get("destination", ""),
                "visa_type": latest_app.get("visa_type", ""),
                "updated_at": _iso(latest_app.get("updated_at")),
            } if latest_app else None,
            "created_at": _iso(user.get("created_at")),
        }

    @staticmethod
    async def update_profile(user_id: str, fields: dict) -> dict:
        fields["updated_at"] = datetime.utcnow()
        await users.update_one({"_id": user_id}, {"$set": fields})
        fresh = await users.find_one({"_id": user_id})
        return {
            "id": str(fresh["_id"]),
            "name": fresh.get("name"),
            "email": fresh.get("email"),
            "phone": fresh.get("phone"),
            "pending_email": fresh.get("pending_email"),
            "pending_phone": fresh.get("pending_phone"),
        }
