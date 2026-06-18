"""Agent Performance Agent — scheduled analytics and performance reports for partner agents.

Generates:
- Weekly/monthly commission summaries and forecasts
- Student pipeline analysis (stages, conversion)
- Top performing countries/courses for the agent
- Actionable recommendations to improve performance
- Automated report cards
"""

from datetime import datetime, timedelta
from typing import List, Optional


async def generate_weekly_summary(db, agent_id: str) -> dict:
    """Generate a weekly performance summary card for an agent."""
    week_ago = datetime.utcnow() - timedelta(days=7)

    students_added = await db["agent_students"].count_documents({
        "agent_id": agent_id, "created_at": {"$gte": week_ago},
    })
    total_students = await db["agent_students"].count_documents({"agent_id": agent_id})

    # Applications this week
    pipeline = []
    cur = db["agent_students"].find({"agent_id": agent_id}).limit(100)
    async for s in db["agent_students"].find({"agent_id": agent_id}).limit(100):
        student_id = s.get("student_id") or s.get("email", "")
        apps = await db["applications"].find({"user_id": student_id}).sort("created_at", -1).to_list(1)
        status = apps[0].get("status", "no_application") if apps else "no_application"
        pipeline.append(status)

    status_counts = {}
    for s in pipeline:
        status_counts[s] = status_counts.get(s, 0) + 1

    # Commission summary
    commissions = []
    cur = db["commissions"].find({"agent_id": agent_id})
    total_commission = 0
    pending_commission = 0
    async for c in cur:
        amt = c.get("amount", 0)
        total_commission += amt
        if c.get("status") == "pending":
            pending_commission += amt

    return {
        "agent_id": agent_id,
        "period": "weekly",
        "generated_at": datetime.utcnow().isoformat(),
        "students_added_this_week": students_added,
        "total_students": total_students,
        "pipeline_summary": status_counts,
        "total_commission": total_commission,
        "pending_commission": pending_commission,
        "forecast": _forecast_commission(pending_commission, total_commission),
    }


def _forecast_commission(pending: int, total: int) -> dict:
    if total == 0:
        return {"estimated_next_month": 0, "confidence": "low"}
    conversion_rate = (total - pending) / total if total > 0 else 0
    estimated = int(pending * conversion_rate) if conversion_rate > 0 else pending // 2
    return {
        "estimated_next_month": estimated,
        "confidence": "high" if conversion_rate > 0.5 else "medium" if conversion_rate > 0.2 else "low",
    }


async def generate_monthly_report(db, agent_id: str) -> dict:
    """Generate a detailed monthly performance report."""
    month_ago = datetime.utcnow() - timedelta(days=30)

    # Students per country
    country_counts = {}
    cur = db["agent_students"].find({"agent_id": agent_id}).limit(200)
    async for s in cur:
        for field in ["target_country", "country"]:
            country = s.get(field, "")
            if country:
                country_counts[country] = country_counts.get(country, 0) + 1
                break

    # Recent commissions with dates
    recent_commissions = []
    cur = db["commissions"].find({"agent_id": agent_id, "created_at": {"$gte": month_ago}}).sort("created_at", -1).limit(20)
    async for c in cur:
        recent_commissions.append({
            "amount": c.get("amount", 0),
            "status": c.get("status", "pending"),
            "created_at": c.get("created_at", "").isoformat() if hasattr(c.get("created_at"), "isoformat") else str(c.get("created_at", "")),
        })

    summary = await generate_weekly_summary(db, agent_id)

    return {
        "agent_id": agent_id,
        "period": "monthly",
        "generated_at": datetime.utcnow().isoformat(),
        **summary,
        "top_countries": sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        "recent_commissions": recent_commissions[:10],
    }


async def get_actionable_tips(summary: dict) -> list:
    """Generate actionable tips based on performance data."""
    tips = []
    pipeline = summary.get("pipeline_summary", {})

    draft_count = pipeline.get("draft", 0) + pipeline.get("no_application", 0)
    if draft_count > 5:
        tips.append({
            "type": "follow_up",
            "priority": "high",
            "message": f"You have {draft_count} students in draft stage. Reach out to help them submit.",
        })

    if summary.get("pending_commission", 0) > 0:
        tips.append({
            "type": "commission",
            "priority": "medium",
            "message": f"You have ₹{summary['pending_commission']:,} in pending commissions. Encourage students to complete their applications.",
        })

    if not tips:
        tips.append({
            "type": "growth",
            "priority": "low",
            "message": "Everything looks good! Keep recruiting new students to grow your business.",
        })

    return tips
