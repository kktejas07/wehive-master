"""AI Agent runner — triggers agents and streams results into notifications.

Endpoints:
  POST /api/agents/run          Run all agents now
  GET  /api/agents/status       Current agent status / last run
  POST /api/agents/schedule     Toggle periodic scheduling
"""

import asyncio
import logging
from datetime import datetime, timedelta
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
    # Fetch last aggregator runs from DB
    agg_runs = []
    try:
        from db import db
        cursor = db["aggregator_runs"].find(
            {}, {"_id": 0}
        ).sort("ts", -1).limit(5)
        agg_runs = [doc async for doc in cursor]
    except Exception:
        pass

    return {
        "scheduler_active": _scheduler_task is not None and not _scheduler_task.done(),
        "daily_aggregator_active": _daily_task is not None and not _daily_task.done(),
        "last_run": _last_run,
        "last_results": _last_results,
        "recent_aggregator_runs": agg_runs,
        "available_agents": [
            {"id": aid, "name": meta["name"], "description": meta["description"]}
            for aid, meta in AGENT_REGISTRY.items()
        ],
    }


@router.get("/aggregator-runs")
async def aggregator_runs(user=Depends(get_current_user)):
    """Get last 20 aggregator runs with results."""
    try:
        from db import db
        cursor = db["aggregator_runs"].find(
            {}, {"_id": 0}
        ).sort("ts", -1).limit(20)
        runs = [doc async for doc in cursor]
        return {"ok": True, "runs": runs}
    except Exception as e:
        return {"ok": False, "error": str(e)}


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
    """Background loop: run web aggregators (events, news, blogs) every 24 hours.
    Each aggregator is isolated — one failure won't block the others.
    Auto-approval runs after each aggregation. Runs immediately on first startup."""
    first_run = True
    while True:
        if not first_run:
            logger.info("Aggregator sleeping for 2 hours (7200 seconds)")
            await asyncio.sleep(7200)
        first_run = False

        start_ts = datetime.utcnow().isoformat()
        results = {}

        async def _run_one(name: str, agg_fn, approve_fn):
            try:
                logger.info("Daily Aggregator: running %s...", name)
                await agg_fn()
                await approve_fn()
                logger.info("Daily Aggregator: %s complete", name)
                return "ok"
            except Exception as e:
                logger.exception("Daily Aggregator: %s failed: %s", name, e)
                return str(e)

        from event_aggregator_agent import run_aggregator as run_events
        from event_aggregator_agent import run_auto_approval as approve_events
        from news_aggregator_agent import run_aggregator as run_news
        from news_aggregator_agent import run_auto_approval as approve_news
        from blog_aggregator_agent import run_aggregator as run_blogs
        from blog_aggregator_agent import run_auto_approval as approve_blogs
        from intake_aggregator_agent import run_aggregator as run_intakes

        async def _noop(): pass

        results["events"] = await _run_one("events", run_events, approve_events)
        results["news"] = await _run_one("news", run_news, approve_news)
        results["blogs"] = await _run_one("blogs", run_blogs, approve_blogs)
        results["intakes"] = await _run_one("intakes", run_intakes, _noop)

        # Record run in DB for monitoring
        try:
            from db import db
            await db["aggregator_runs"].insert_one({
                "ts": start_ts,
                "finished_at": datetime.utcnow().isoformat(),
                "results": results,
            })
        except Exception as e:
            logger.warning("Failed to record aggregator run: %s", e)

        logger.info("Daily Aggregator Scheduler: complete — %s", results)



def start_scheduler():
    """Start the background scheduler (called from server.py on startup)."""
    global _scheduler_task, _daily_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("Agent scheduler started (interval=%ds)", SCHEDULE_INTERVAL)
    if _daily_task is None or _daily_task.done():
        _daily_task = asyncio.create_task(_daily_aggregator_loop())
        logger.info("Periodic aggregator scheduler started (interval=7200s)")
