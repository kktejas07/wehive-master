"""Payment ViewModel — list user payments for mobile/read-only views."""
from typing import Optional

from db import payments

PLANS = {
    'lite': 'Lite',
    'standard': 'Standard',
    'concierge': 'Concierge',
}


def _serialize(p: dict) -> dict:
    paid_at = p.get("paid_at")
    created_at = p.get("created_at")
    return {
        "id": str(p.get("_id", "")),
        "application_id": p.get("application_id", ""),
        "plan_id": p.get("plan_id", ""),
        "plan_name": PLANS.get(p.get("plan_id", ""), p.get("plan_id", "")),
        "amount_inr": p.get("amount_inr", p.get("amount", 0)),
        "currency": "INR",
        "status": p.get("status", "pending"),
        "description": p.get("description", PLANS.get(p.get("plan_id", ""), "")),
        "invoice_url": p.get("invoice_url"),
        "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at or ""),
        "paid_at": paid_at.isoformat() if hasattr(paid_at, "isoformat") else (str(paid_at) if paid_at else None),
    }


class PaymentViewModel:
    @staticmethod
    async def list_for_user(user_id: str, page: int = 1, per_page: int = 20) -> dict:
        query = {"user_id": user_id}
        skip = (page - 1) * per_page
        total = await payments.count_documents(query)
        items = await payments.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
        return {
            "items": [_serialize(p) for p in items],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": max(1, (total + per_page - 1) // per_page),
        }
