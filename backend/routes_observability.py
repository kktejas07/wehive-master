"""Observability admin endpoints — trace viewer and aggregate statistics.

All endpoints require admin authentication.

  GET  /api/observability/traces                  paginated trace/span list
  GET  /api/observability/traces/{trace_id}       all spans for one trace
  GET  /api/observability/stats/latency           p50 / p95 / p99
  GET  /api/observability/stats/cost              cost by provider per day
  GET  /api/observability/stats/errors            error rate + recent errors
  GET  /api/observability/stats/tokens            token usage by model
  GET  /api/observability/stats/dashboard         combined summary (24 h)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from admin_auth import get_current_admin_flex
from db import db
from observability_internal import (
    get_cost_by_provider,
    get_error_rate,
    get_latency_percentiles,
    get_recent_errors,
    get_tokens_by_model,
)

router = APIRouter(
    prefix="/observability",
    tags=["observability"],
    dependencies=[Depends(get_current_admin_flex)],
)
logger = logging.getLogger("wehive.observability")


# ------------------------------------------------------------------
# Traces
# ------------------------------------------------------------------


@router.get("/traces")
async def list_traces(
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    model: Optional[str] = None,
    provider: Optional[str] = None,
    status: Optional[str] = None,
    kind: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
):
    filt: dict = {}
    if model:
        filt["model"] = model
    if provider:
        filt["provider"] = provider
    if status:
        filt["status"] = status
    if kind:
        filt["kind"] = kind
    date_filt: dict = {}
    if from_date:
        try:
            date_filt["$gte"] = datetime.fromisoformat(from_date).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    if to_date:
        try:
            date_filt["$lte"] = datetime.fromisoformat(to_date).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    if date_filt:
        filt["started_at"] = date_filt

    cursor = (
        db["llm_traces"]
        .find(filt, {"input": 0})
        .sort("started_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    total = await db["llm_traces"].count_documents(filt)
    return {"items": items, "total": total, "limit": limit, "skip": skip}


@router.get("/traces/{trace_id}")
async def get_trace(trace_id: str):
    cursor = (
        db["llm_traces"]
        .find({"trace_id": trace_id})
        .sort("started_at", 1)
    )
    spans = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        spans.append(doc)
    if not spans:
        return {"trace_id": trace_id, "spans": [], "error": "not found"}
    return {"trace_id": trace_id, "spans": spans}


# ------------------------------------------------------------------
# Stats
# ------------------------------------------------------------------


@router.get("/stats/latency")
async def stats_latency(minutes: int = Query(60, ge=1, le=10080)):
    return await get_latency_percentiles(minutes)


@router.get("/stats/cost")
async def stats_cost(days: int = Query(7, ge=1, le=90)):
    rows = await get_cost_by_provider(days)
    for r in rows:
        r["provider"] = r.pop("_id", {}).get("provider", "")
        r["day"] = r.get("_id", {}).get("day", "") if isinstance(r.get("_id"), dict) else ""
        r.pop("_id", None)
    return {"days": days, "rows": rows}


@router.get("/stats/errors")
async def stats_errors(minutes: int = Query(60, ge=1, le=10080)):
    summary = await get_error_rate(minutes)
    recent = await get_recent_errors(10)
    return {**summary, "recent": recent}


@router.get("/stats/tokens")
async def stats_tokens(days: int = Query(7, ge=1, le=90)):
    rows = await get_tokens_by_model(days)
    for r in rows:
        info = r.pop("_id", {})
        r["provider"] = info.get("provider", "")
        r["model"] = info.get("model", "")
    return {"days": days, "rows": rows}


@router.get("/stats/dashboard")
async def stats_dashboard():
    latency = await get_latency_percentiles(minutes=1440)
    errors = await get_error_rate(minutes=1440)
    cost_rows = await get_cost_by_provider(days=1)
    token_rows = await get_tokens_by_model(days=1)

    total_cost = sum(r.get("total_cost", 0) for r in cost_rows)
    total_calls = sum(r.get("calls", 0) for r in cost_rows)

    top_providers = {}
    for r in cost_rows:
        p = (r.get("_id") or {}).get("provider", "unknown")
        top_providers[p] = top_providers.get(p, 0) + r.get("calls", 0)

    top_models = {}
    for r in token_rows:
        m = (r.get("_id") or {}).get("model", "unknown")
        top_models[m] = top_models.get(m, 0) + r.get("calls", 0)

    return {
        "period": "24h",
        "latency": latency,
        "error_rate": errors.get("rate", 0),
        "total_errors": errors.get("errors", 0),
        "total_calls": total_calls,
        "total_cost": round(total_cost, 4),
        "top_providers": top_providers,
        "top_models": top_models,
    }
