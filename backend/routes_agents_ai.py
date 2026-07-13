"""AI Agent runner — triggers agents and streams results into notifications.

Endpoints:
  POST /api/agents/run          Run all agents now
  GET  /api/agents/status       Current agent status / last run
  POST /api/agents/schedule     Toggle periodic scheduling
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth_utils import get_current_user
from db import db

from agents.agent_runner import run_all_agents, AGENT_REGISTRY

router = APIRouter(prefix="/agents", tags=["agents"])
logger = logging.getLogger("wehive.agents_router")

notifications_col = db["notifications"]

SCHEDULE_INTERVAL = 3600  # 1 hour
_scheduler_task: Optional[asyncio.Task] = None
_last_run: Optional[str] = None
_last_results: dict = {}


async def _insert_alert_as_notification(user_id: str, alert: dict):
    """Insert an agent alert into the user's notification stream."""
    alert_type = alert.get("type", "agent_alert")
    severity = alert.get("severity", "info")
    title_map = {
        "stalled_application": "⚠️ Application Stalled",
        "missing_appointment": "📅 Appointment Needed",
        "visa_approved": "🎉 Visa Approved!",
        "missing_documents": "📋 Missing Documents",
        "invalid_document_format": "❌ Invalid File",
        "invalid_document_size": "📦 File Too Large",
        "passport_expiring_soon": "🛂 Passport Expiring",
        "document_deadline": "⏰ Document Deadline",
        "document_overdue": "🔴 Documents Overdue",
        "visa_expiring": "⚠️ Visa Expiring Soon",
        "intake_deadline": "📅 Intake Deadline",
        "incomplete_profile": "👤 Complete Your Profile",
        "browsing_no_application": "✈️ Start Your Application",
        "rejection_support": "💪 Reapplication Support",
        "missed_appointment": "📅 Missed Appointment",
        "passport_expiring": "🛂 Passport Renewal",
    }
    title = title_map.get(alert_type, f"🤖 Agent: {alert_type.replace('_', ' ').title()}")

    await notifications_col.insert_one({
        "_id": str(__import__("uuid").uuid4()),
        "user_id": user_id,
        "type": alert_type,
        "title": title,
        "body": alert.get("message", ""),
        "severity": severity,
        "application_id": alert.get("application_id"),
        "action_link": alert.get("action_link"),
        "read": False,
        "created_at": datetime.utcnow(),
    })


@router.post("/run")
async def trigger_agents(user=Depends(get_current_user)):
    """Run all agents now. Alerts are pushed into the user's notification stream."""
    global _last_run, _last_results
    _last_run = datetime.utcnow().isoformat()
    results = await run_all_agents()
    _last_results = results

    total_alerts = 0
    for agent_id, data in results.items():
        for alert in data.get("alerts", []):
            uid = alert.get("user_id")
            if uid:
                await _insert_alert_as_notification(uid, alert)
                total_alerts += 1

    logger.info("Agents run complete: %d alerts generated", total_alerts)
    return {
        "ok": True,
        "run_at": _last_run,
        "total_alerts": total_alerts,
        "agents": {
            agent_id: {"name": data["name"], "alerts_count": data["alerts_count"]}
            for agent_id, data in results.items()
        },
    }


@router.get("/status")
async def agent_status(user=Depends(get_current_user)):
    """Get current agent status and last run summary."""
    return {
        "scheduler_active": _scheduler_task is not None and not _scheduler_task.done(),
        "last_run": _last_run,
        "last_results": _last_results,
        "available_agents": [
            {"id": aid, "name": meta["name"], "description": meta["description"]}
            for aid, meta in AGENT_REGISTRY.items()
        ],
    }


async def _scheduler_loop():
    """Background loop: run agents every SCHEDULE_INTERVAL seconds."""
    while True:
        try:
            logger.info("Scheduler: running agents...")
            results = await run_all_agents()
            for agent_id, data in results.items():
                for alert in data.get("alerts", []):
                    uid = alert.get("user_id")
                    if uid:
                        await _insert_alert_as_notification(uid, alert)
            logger.info("Scheduler: agents complete")
        except Exception as e:
            logger.exception("Scheduler error: %s", e)
        await asyncio.sleep(SCHEDULE_INTERVAL)


_daily_task: Optional[asyncio.Task] = None

async def _daily_aggregator_loop():
    """Background loop: run web aggregators (events, news, blogs) every 24 hours."""
    while True:
        try:
            logger.info("Daily Aggregator Scheduler: running...")
            from event_aggregator_agent import run_aggregator as run_events
            from news_aggregator_agent import run_aggregator as run_news
            from blog_aggregator_agent import run_aggregator as run_blogs
            await run_events()
            await run_news()
            await run_blogs()
            logger.info("Daily Aggregator Scheduler: complete")
        except Exception as e:
            logger.exception("Daily Aggregator Scheduler error: %s", e)
        await asyncio.sleep(86400)  # 24 hours



def start_scheduler():
    """Start the background scheduler (called from server.py on startup)."""
    global _scheduler_task, _daily_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("Agent scheduler started (interval=%ds)", SCHEDULE_INTERVAL)
    if _daily_task is None or _daily_task.done():
        _daily_task = asyncio.create_task(_daily_aggregator_loop())
        logger.info("Daily aggregator scheduler started (interval=86400s)")
