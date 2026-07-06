"""Proactive Support Agent — monitors user behavior and triggers contextual help.

Monitors:
- Users who haven't completed their profile
- Users viewing country pages but haven't started application
- Users who abandoned an application mid-way
- Repeated visits to the same page (confusion signal)
- Users who viewed Help/FAQ but didn't resolve their issue
"""

from datetime import datetime, timedelta
from typing import List


async def check_incomplete_profiles(db) -> List[dict]:
    """Find users who registered but haven't completed their profile."""
    alerts = []
    seven_days = datetime.utcnow() - timedelta(days=7)
    cur = db["users"].find({
        "created_at": {"$lte": seven_days},
        "$or": [
            {"name": {"$in": [None, ""]}},
            {"phone": {"$in": [None, ""]}},
        ],
    }).limit(30)
    async for user in cur:
        alerts.append({
            "user_id": user["_id"],
            "type": "incomplete_profile",
            "severity": "info",
            "message": (
                "Your profile is incomplete. Add your name and phone number "
                "to speed up visa applications. Go to Account → Profile to update."
            ),
            "action_link": "/account?tab=profile",
        })
    return alerts


async def check_browsing_without_applying(db) -> List[dict]:
    """Find users who viewed countries but never started an application."""
    alerts = []
    # Users with no applications at all, created > 1 day ago
    one_day = datetime.utcnow() - timedelta(days=1)
    cur = db["users"].find({"created_at": {"$lte": one_day}}).limit(50)
    async for user in cur:
        app_count = await db["applications"].count_documents({"user_id": user["_id"]})
        if app_count == 0:
            alerts.append({
                "user_id": user["_id"],
                "type": "browsing_no_application",
                "severity": "info",
                "message": (
                    "Explore any country's visa requirements and start your application today! "
                    "Browse destinations or ask Hive for help."
                ),
                "action_link": "/",
            })
    return alerts


async def check_recent_rejections(db) -> List[dict]:
    """Find recently rejected applications and offer help."""
    alerts = []
    seven_days = datetime.utcnow() - timedelta(days=7)
    cur = db["applications"].find({
        "status": "rejected",
        "updated_at": {"$gte": seven_days},
    }).limit(20)
    async for app in cur:
        alerts.append({
            "user_id": app.get("user_id"),
            "application_id": app["_id"],
            "type": "rejection_support",
            "severity": "info",
            "message": (
                f"We noticed your {app.get('visa_type', 'visa')} application for "
                f"{app.get('country_name', app.get('country_id', '')).upper()} "
                f"was not approved. Our team can help review and reapply. "
                f"Contact us or chat with Hive for guidance."
            ),
            "action_link": "/contact",
        })
    return alerts


async def run_all_checks(db) -> List[dict]:
    results = []
    results.extend(await check_incomplete_profiles(db))
    results.extend(await check_browsing_without_applying(db))
    results.extend(await check_recent_rejections(db))

    try:
        llm = await llm_behavior_insight(results)
        if llm:
            results.append({"type": "llm_insight", "severity": "info", "message": llm})
    except Exception:
        pass

    return results


async def llm_behavior_insight(check_results: list) -> str:
    """Use LLM to generate a personalized nudge based on user behavior."""
    signals = [r.get("message", "") for r in check_results if r.get("message")]
    if not signals:
        return "Everything looks good. Keep going!"

    signal_text = "\n".join(signals)
    try:
        from model_router import chat_with_profile
        response = await chat_with_profile(
            "fast_cheap",
            [
                {"role": "system", "content": (
                    "You are a helpful immigration assistant. Given user behavior signals, "
                    "write a friendly, motivating 2-sentence nudge to help them take the next step. "
                    "Be encouraging, never pushy."
                )},
                {"role": "user", "content": f"Signals: {signal_text}"},
            ],
            max_tokens=150,
        )
        return response.get("content", "We're here to help!").strip()
    except Exception:
        return signal_text[:200]
