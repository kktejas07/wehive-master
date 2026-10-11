"""AI Agent runner — triggers agents and streams results into notifications.

Endpoints:
  POST /api/agents/run                 Run all proactive agents now (admin)
  GET  /api/agents/status              Scheduler status + last-run counts
  GET  /api/agents/aggregator-runs     Last 20 aggregator runs (admin)
  POST /api/agents/aggregators/run     Trigger one aggregator cycle in background (admin)
  GET  /api/agents/aggregators/status  Run status (optionally ?run_id=) + DB counts (admin)
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from admin_auth import get_current_admin_flex
from auth_utils import get_current_user
from db import db

from agents.agent_runner import run_all_agents, AGENT_REGISTRY

router = APIRouter(prefix="/agents", tags=["agents"])
logger = logging.getLogger("wehive.agents_router")

notifications_col = db["notifications"]
aggregator_runs_col = db["aggregator_runs"]

SCHEDULE_INTERVAL = 3600  # 1 hour
DAILY_AGGREGATOR_INTERVAL_SECONDS = int(os.environ.get("DAILY_AGGREGATOR_INTERVAL_SECONDS", 1800))  # 30 minutes
_scheduler_task: Optional[asyncio.Task] = None
_next_daily_run: Optional[str] = None
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
async def trigger_agents(_admin=Depends(get_current_admin_flex)):
    """Run all agents now (admin only — agents scan every user's data).
    Alerts are pushed into each affected user's notification stream."""
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
    """Get current agent status and last run summary (counts only — the raw
    alerts belong to other users and are never returned here)."""
    agg_runs = []
    try:
        cursor = aggregator_runs_col.find({}, {"_id": 0}).sort("ts", -1).limit(5)
        agg_runs = [doc async for doc in cursor]
    except Exception:
        pass

    return {
        "scheduler_active": _scheduler_task is not None and not _scheduler_task.done(),
        "daily_aggregator_active": _daily_task is not None and not _daily_task.done(),
        "daily_interval_hours": DAILY_AGGREGATOR_INTERVAL_SECONDS / 3600,
        "next_daily_run_utc": _next_daily_run,
        "last_run": _last_run,
        "last_results": {
            aid: {"name": d.get("name"), "alerts_count": d.get("alerts_count", 0)}
            for aid, d in _last_results.items()
        },
        "recent_aggregator_runs": agg_runs,
        "available_agents": [
            {"id": aid, "name": meta["name"], "description": meta["description"]}
            for aid, meta in AGENT_REGISTRY.items()
        ],
    }


@router.get("/aggregator-runs")
async def aggregator_runs(_admin=Depends(get_current_admin_flex)):
    """Last 20 aggregator runs: overall status plus per-source
    {status, inserted, updated, skipped, errors}."""
    cursor = aggregator_runs_col.find({}, {"_id": 0}).sort("ts", -1).limit(20)
    return {"ok": True, "runs": [doc async for doc in cursor]}


@router.post("/aggregators/run")
async def run_aggregators_now(admin=Depends(get_current_admin_flex)):
    """Trigger one full aggregator cycle (news, blogs, events, intakes) in the
    background. Returns the run id to poll via GET /agents/aggregators/status."""
    if _cycle_lock.locked():
        running = await aggregator_runs_col.find_one({"status": "running"}, {"_id": 0}, sort=[("ts", -1)])
        raise HTTPException(409, {"message": "An aggregator run is already in progress",
                                  "run_id": (running or {}).get("run_id")})
    run_id = str(uuid.uuid4())
    await aggregator_runs_col.insert_one({
        "run_id": run_id, "ts": datetime.utcnow().isoformat(), "trigger": "admin",
        "triggered_by": admin.get("_id"), "status": "running", "results": {},
    })
    asyncio.create_task(run_aggregator_cycle(trigger="admin", run_id=run_id))
    return {"ok": True, "run_id": run_id, "status": "running"}


@router.get("/aggregators/status")
async def aggregators_status(
    run_id: Optional[str] = Query(None),
    _admin=Depends(get_current_admin_flex),
):
    """One run (by run_id) or the latest 5 runs, plus pending/total counts per collection."""
    if run_id:
        run = await aggregator_runs_col.find_one({"run_id": run_id}, {"_id": 0})
        if not run:
            raise HTTPException(404, "Run not found")
        return {"ok": True, "run": run}
    counts = {}
    for name in ("global_news", "global_blogs", "global_events", "global_intakes"):
        col = db[name]
        counts[name] = {
            "total": await col.count_documents({}),
            "pending": await col.count_documents({"status": "pending"}),
        }
    cursor = aggregator_runs_col.find({}, {"_id": 0}).sort("ts", -1).limit(5)
    return {
        "ok": True,
        "running": _cycle_lock.locked(),
        "next_scheduled_run_utc": _next_daily_run,
        "counts": counts,
        "recent_runs": [doc async for doc in cursor],
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
_cycle_lock = asyncio.Lock()


def _source_result(outcome) -> dict:
    """Normalise an aggregator's return value / exception into
    {status: ok|empty|skipped|error, inserted, updated, skipped, errors}."""
    if isinstance(outcome, Exception):
        return {"status": "error", "inserted": 0, "updated": 0, "skipped": 0,
                "errors": [f"{type(outcome).__name__}: {outcome}"[:300]]}
    r = dict(outcome or {})
    errors = list(r.pop("errors", []) or [])
    if r.get("status") == "error" and r.get("message"):
        errors.append(str(r.pop("message"))[:300])
    res = {
        "inserted": int(r.get("inserted", 0) or 0),
        "updated": int(r.get("updated", 0) or 0),
        "skipped": int(r.get("skipped", 0) or 0),
        "errors": errors,
    }
    if r.get("feeds"):
        res["feeds"] = r["feeds"]
    reason = r.get("disabled") or (r.get("reason") if r.get("status") == "skipped" else None)
    if errors or r.get("status") == "error":
        res["status"] = "error"
    elif reason:
        res["status"], res["reason"] = "skipped", reason
    elif res["inserted"] + res["updated"] + res["skipped"] == 0:
        res["status"] = "empty"
    else:
        res["status"] = "ok"
    return res


async def run_aggregator_cycle(trigger: str = "scheduler", run_id: Optional[str] = None) -> dict:
    """Run events, news, blogs and intakes once (each isolated) and record the
    outcome in aggregator_runs. Concurrent cycles are serialised."""
    from event_aggregator_agent import run_aggregator as run_events
    from news_aggregator_agent import run_aggregator as run_news
    from blog_aggregator_agent import run_aggregator as run_blogs
    from intake_aggregator_agent import run_aggregator as run_intakes

    async with _cycle_lock:
        run_id = run_id or str(uuid.uuid4())
        start_ts = datetime.utcnow().isoformat()
        await aggregator_runs_col.update_one(
            {"run_id": run_id},
            {"$setOnInsert": {"ts": start_ts, "trigger": trigger}, "$set": {"status": "running"}},
            upsert=True,
        )

        # Mark past events as past. Never re-date or auto-approve items here:
        # approval is admin-driven unless AGGREGATOR_AUTO_APPROVE is set.
        try:
            from db import global_events_col
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            await global_events_col.update_many(
                {"date": {"$type": "string", "$lt": today_str}, "is_past": {"$ne": True}},
                {"$set": {"is_past": True}},
            )
        except Exception as e:
            logger.warning("Aggregator past-event marking failed: %s", e)

        results = {}
        for name, fn in (("events", run_events), ("news", run_news),
                         ("blogs", run_blogs), ("intakes", run_intakes)):
            try:
                logger.info("Aggregator: running %s...", name)
                outcome = await fn()
            except Exception as e:
                logger.exception("Aggregator: %s failed", name)
                outcome = e
            results[name] = _source_result(outcome)
            logger.info("Aggregator: %s -> %s", name, results[name]["status"])

        statuses = {r["status"] for r in results.values()}
        if "error" in statuses:
            overall = "error"
        elif "ok" in statuses:
            overall = "ok"
        else:
            overall = "empty"
        try:
            await aggregator_runs_col.update_one({"run_id": run_id}, {"$set": {
                "status": overall,
                "finished_at": datetime.utcnow().isoformat(),
                "results": results,
            }})
        except Exception as e:
            logger.warning("Failed to record aggregator run: %s", e)
        logger.info("Aggregator cycle %s finished: %s", run_id, overall)
        return {"run_id": run_id, "status": overall, "results": results}


async def _daily_aggregator_loop():
    """Background loop: run one aggregator cycle every DAILY_AGGREGATOR_INTERVAL_SECONDS
    (first run immediately on startup)."""
    global _next_daily_run
    while True:
        _next_daily_run = (datetime.utcnow() + timedelta(seconds=DAILY_AGGREGATOR_INTERVAL_SECONDS)).isoformat()
        try:
            await run_aggregator_cycle(trigger="scheduler")
        except Exception as e:
            logger.exception("Critical error in aggregator loop: %s", e)
        logger.info("Aggregator sleeping %ds. Next run: %s UTC", DAILY_AGGREGATOR_INTERVAL_SECONDS, _next_daily_run)
        await asyncio.sleep(DAILY_AGGREGATOR_INTERVAL_SECONDS)


def start_scheduler():
    """Start the background scheduler (called from server.py on startup)."""
    global _scheduler_task, _daily_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("Agent scheduler started (interval=%ds)", SCHEDULE_INTERVAL)
    if _daily_task is None or _daily_task.done():
        _daily_task = asyncio.create_task(_daily_aggregator_loop())
        logger.info("Aggregator agent scheduler started (interval=%ds / %0.1fh)",
                    DAILY_AGGREGATOR_INTERVAL_SECONDS, DAILY_AGGREGATOR_INTERVAL_SECONDS / 3600)
