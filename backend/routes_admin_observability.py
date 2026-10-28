"""Admin observability endpoints.

GET /api/admin/rag/eval/latest    — most recent RAGAS run
GET /api/admin/rag/eval/history   — last N RAGAS runs (default 30)
GET /api/admin/observability/summary — Langfuse trace counts (no-op when not configured)
POST /api/admin/aggregator/run    — trigger all 4 aggregators immediately (super-admin)
"""

import logging
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from admin_auth import get_current_admin_flex, is_super_admin
from eval.ragas_evaluator import eval_runs_col

logger = logging.getLogger("wehive.admin_observability")

router = APIRouter(prefix="/admin", tags=["admin-observability"])


def _serialise(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", ""))
    for k, v in doc.items():
        if hasattr(v, "isoformat"):
            doc[k] = v.isoformat()
    return doc


@router.get("/rag/eval/latest")
async def rag_eval_latest(user=Depends(get_current_admin_flex)):
    doc = await eval_runs_col.find_one(sort=[("_id", -1)])
    if not doc:
        raise HTTPException(404, "No eval runs found")
    return _serialise(doc)


@router.get("/rag/eval/history")
async def rag_eval_history(
    limit: int = Query(30, ge=1, le=200),
    user=Depends(get_current_admin_flex),
):
    cursor = eval_runs_col.find(sort=[("_id", -1)]).limit(limit)
    return [_serialise(d) async for d in cursor]


@router.get("/observability/summary")
async def observability_summary(user=Depends(get_current_admin_flex)):
    """Return Langfuse trace summary. Returns empty metrics when Langfuse is not configured."""
    try:
        from config import LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST
        if not LANGFUSE_PUBLIC_KEY or not LANGFUSE_SECRET_KEY:
            return {"configured": False, "traces": None}

        import httpx
        import base64
        token = base64.b64encode(f"{LANGFUSE_PUBLIC_KEY}:{LANGFUSE_SECRET_KEY}".encode()).decode()
        async with httpx.AsyncClient(base_url=LANGFUSE_HOST, timeout=10) as client:
            resp = await client.get(
                "/api/public/traces",
                params={"limit": 1},
                headers={"Authorization": f"Basic {token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "configured": True,
                "langfuse_host": LANGFUSE_HOST,
                "total_traces": data.get("meta", {}).get("totalItems"),
            }
    except Exception as exc:
        logger.debug("Langfuse summary failed: %s", exc)
        return {"configured": False, "error": str(exc)}


@router.post("/rag/eval/run")
async def trigger_eval_run(user=Depends(get_current_admin_flex)):
    """Fire a RAGAS eval run immediately (background task)."""
    if not is_super_admin(user):
        raise HTTPException(403, "Super-admin only")
    import asyncio
    from eval.ragas_evaluator import evaluate
    asyncio.create_task(evaluate())
    return {"status": "started", "message": "RAGAS eval running in background"}


@router.post("/aggregator/run")
async def trigger_aggregator_run(user=Depends(get_current_admin_flex)):
    if not is_super_admin(user):
        raise HTTPException(403, "Super-admin only")
    import asyncio
    from agents.crewai.aggregator_crew import run_all
    asyncio.create_task(run_all())
    return {"status": "started"}


@router.post("/prompts/optimize")
async def trigger_prompt_optimization(user=Depends(get_current_admin_flex)):
    """Run the prompt optimizer immediately. Reads RAGAS history and suggests
    an improved system prompt for Eva. Suggestion is stored for admin review —
    it is never auto-applied."""
    if not is_super_admin(user):
        raise HTTPException(403, "Super-admin only")
    import asyncio
    from eval.prompt_optimizer import optimize_prompts
    asyncio.create_task(optimize_prompts())
    return {"status": "started", "message": "Optimizer running in background — check /api/admin/prompts/optimize/history"}


@router.get("/prompts/optimize/history")
async def prompt_optimizer_history(
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_admin_flex),
):
    """Recent prompt optimizer runs with suggested prompts."""
    from db import db
    cursor = db["prompt_optimizer_runs"].find(sort=[("_id", -1)]).limit(limit)
    return [_serialise(d) async for d in cursor]
