"""Content Pipeline Routes — admin endpoints for multi-agent content generation.

Endpoints:
  POST /api/content-pipeline/run              Trigger a content pipeline
  GET  /api/content-pipeline/runs             List pipeline runs (paginated)
  GET  /api/content-pipeline/runs/{run_id}    Get a single run detail
  POST /api/content-pipeline/runs/{id}/approve  Approve content
  POST /api/content-pipeline/runs/{id}/reject   Reject with feedback
  POST /api/content-pipeline/batch            Trigger multiple pipelines
  GET  /api/content-pipeline/templates        Available content types
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from content_pipeline import (
    CONTENT_TYPES,
    approve_run,
    get_run,
    list_runs,
    reject_run,
    run_pipeline,
)

router = APIRouter(
    prefix="/content-pipeline",
    tags=["content-pipeline"],
    dependencies=[Depends(get_current_admin_flex)],
)
logger = logging.getLogger("wehive.routes_content_pipeline")


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class RunPipelineRequest(BaseModel):
    content_type: str = Field("linkedin_post", description="One of: reel_30s, reel_10s, linkedin_post, newsletter_article")
    topic: Optional[str] = Field("", description="Topic to write about (blank = auto-discover)")


class BatchRequest(BaseModel):
    content_type: str = "linkedin_post"
    topics: list[str] = Field(default_factory=list, max_length=10)


class RejectRequest(BaseModel):
    feedback: Optional[str] = ""


# ---------------------------------------------------------------------------
# Background runner
# ---------------------------------------------------------------------------


async def _bg_pipeline(content_type: str, topic: str, admin_id: str) -> None:
    try:
        await run_pipeline(content_type, topic, admin_id)
    except Exception:
        logger.exception("Background pipeline failed")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/run")
async def trigger_pipeline(
    req: RunPipelineRequest,
    bg: BackgroundTasks,
    admin=Depends(get_current_admin_flex),
):
    if req.content_type not in CONTENT_TYPES:
        raise HTTPException(400, f"Unknown content_type. Choose from: {', '.join(CONTENT_TYPES)}")
    admin_id = str(admin.get("_id", admin.get("email", "")))
    bg.add_task(_bg_pipeline, req.content_type, req.topic or "", admin_id)
    return {"status": "started", "content_type": req.content_type, "topic": req.topic or "(auto)"}


@router.get("/runs")
async def get_runs(
    limit: int = 20,
    skip: int = 0,
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    _admin=Depends(get_current_admin_flex),
):
    runs = await list_runs(limit=min(limit, 100), skip=skip, status=status, content_type=content_type)
    return {"runs": runs, "count": len(runs)}


@router.get("/runs/{run_id}")
async def get_single_run(run_id: str, _admin=Depends(get_current_admin_flex)):
    doc = await get_run(run_id)
    if not doc:
        raise HTTPException(404, "Run not found")
    return doc


@router.post("/runs/{run_id}/approve")
async def approve(run_id: str, admin=Depends(get_current_admin_flex)):
    admin_id = str(admin.get("_id", admin.get("email", "")))
    ok = await approve_run(run_id, admin_id)
    if not ok:
        raise HTTPException(404, "Run not found or not in a reviewable state")
    return {"status": "approved"}


@router.post("/runs/{run_id}/reject")
async def reject(run_id: str, req: RejectRequest, admin=Depends(get_current_admin_flex)):
    admin_id = str(admin.get("_id", admin.get("email", "")))
    ok = await reject_run(run_id, admin_id, req.feedback or "")
    if not ok:
        raise HTTPException(404, "Run not found or not in a reviewable state")
    return {"status": "rejected"}


@router.post("/batch")
async def batch_pipelines(
    req: BatchRequest,
    bg: BackgroundTasks,
    admin=Depends(get_current_admin_flex),
):
    if req.content_type not in CONTENT_TYPES:
        raise HTTPException(400, f"Unknown content_type. Choose from: {', '.join(CONTENT_TYPES)}")
    admin_id = str(admin.get("_id", admin.get("email", "")))
    topics = req.topics or [""]
    for topic in topics[:10]:
        bg.add_task(_bg_pipeline, req.content_type, topic, admin_id)
    return {"status": "started", "count": len(topics[:10]), "content_type": req.content_type}


@router.get("/templates")
async def get_templates(_admin=Depends(get_current_admin_flex)):
    return {"content_types": CONTENT_TYPES}
