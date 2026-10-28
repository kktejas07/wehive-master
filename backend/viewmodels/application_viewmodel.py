"""Application ViewModel — assembles full response objects, keeps routes thin."""
from typing import Optional

from db import applications


def _derive_alert(app: dict) -> Optional[str]:
    status = app.get("status", "")
    if status == "docs_pending":
        return "Documents required"
    if status == "payment_pending":
        return "Payment due"
    return None


def _serialize_app(app: dict) -> dict:
    return {
        "id": str(app["_id"]),
        "visa_type": app.get("visa_type", ""),
        "destination": app.get("form_data", {}).get("destination", app.get("destination", "")),
        "status": app.get("status", "draft"),
        "created_at": app["created_at"].isoformat() if hasattr(app.get("created_at"), "isoformat") else str(app.get("created_at", "")),
        "updated_at": app["updated_at"].isoformat() if hasattr(app.get("updated_at"), "isoformat") else str(app.get("updated_at", "")),
        "alert": _derive_alert(app),
    }


class ApplicationViewModel:
    @staticmethod
    async def list_for_user(
        user_id: str,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
    ) -> dict:
        query: dict = {"user_id": user_id}
        if status:
            query["status"] = status
        skip = (page - 1) * per_page
        total = await applications.count_documents(query)
        apps = await applications.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
        return {
            "items": [_serialize_app(a) for a in apps],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": max(1, (total + per_page - 1) // per_page),
        }

    @staticmethod
    async def get_detail(app_id: str, user_id: str) -> Optional[dict]:
        app = await applications.find_one({"_id": app_id, "user_id": user_id})
        if not app:
            return None
        result = _serialize_app(app)
        # Documents are embedded in the application document
        docs = [
            {
                "id": str(d.get("id", d.get("_id", ""))),
                "name": d.get("name", ""),
                "type": d.get("type", ""),
                "status": d.get("status", "pending"),
                "url": d.get("url"),
                "uploaded_at": d["uploaded_at"].isoformat() if hasattr(d.get("uploaded_at"), "isoformat") else str(d.get("uploaded_at", "")),
            }
            for d in app.get("documents", [])
        ]
        result.update({
            "form_data": app.get("form_data", {}),
            "documents": docs,
            "messages": [
                {
                    "id": str(m.get("id", "")),
                    "sender": m.get("sender", ""),
                    "text": m.get("text", ""),
                    "created_at": m["created_at"].isoformat() if hasattr(m.get("created_at"), "isoformat") else str(m.get("created_at", "")),
                }
                for m in app.get("messages", [])
            ],
            "timeline": app.get("timeline", []),
            "visa_appointment": app.get("visa_appointment"),
        })
        return result
