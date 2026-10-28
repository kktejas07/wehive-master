"""Observability — lightweight LLM tracing for the WeHive backend.

Every LLM call, RAG retrieval, and tool execution is recorded as a span
within a trace.  Traces are stored in the ``llm_traces`` MongoDB collection
and exposed via admin endpoints in ``routes_observability``.

All public functions are safe to call even when the DB is unavailable —
failures are logged and silently swallowed so the main request path is
never blocked by tracing.
"""

from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger("wehive.observability")

# ---------------------------------------------------------------------------
# Context propagation
# ---------------------------------------------------------------------------

_current_trace: ContextVar[Optional[str]] = ContextVar("_current_trace", default=None)
_current_span: ContextVar[Optional[str]] = ContextVar("_current_span", default=None)

# In-flight spans keyed by span_id → {started_at_mono, doc}
_inflight: dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Cost estimation (per 1K tokens)
# ---------------------------------------------------------------------------

COST_PER_1K_TOKENS: dict[tuple[str, str], tuple[float, float]] = {
    # (provider, model): (input_per_1k, output_per_1k)
    ("openai", "gpt-4o"): (0.0025, 0.01),
    ("openai", "gpt-4o-mini"): (0.00015, 0.0006),
    ("openai", "gpt-4-turbo"): (0.01, 0.03),
    ("anthropic", "claude-3-opus"): (0.015, 0.075),
    ("anthropic", "claude-3-sonnet"): (0.003, 0.015),
    ("anthropic", "claude-3-haiku"): (0.00025, 0.00125),
    ("google", "gemini-1.5-pro"): (0.00125, 0.005),
    ("google", "gemini-1.5-flash"): (0.000075, 0.0003),
    ("groq", "llama-3.3-70b"): (0.00059, 0.00079),
    ("groq", "llama-3.1-8b"): (0.00005, 0.00008),
    ("mistral", "mistral-large"): (0.002, 0.006),
    ("deepseek", "deepseek-chat"): (0.00014, 0.00028),
    ("together", "meta-llama/Llama-3-70b"): (0.0009, 0.0009),
}


def _estimate_cost(provider: str, model: str, token_count: dict) -> float:
    prompt_tokens = (token_count or {}).get("prompt", 0)
    completion_tokens = (token_count or {}).get("completion", 0)
    key = (provider, model)
    if key not in COST_PER_1K_TOKENS:
        for k, v in COST_PER_1K_TOKENS.items():
            if k[0] == provider:
                return (prompt_tokens * v[0] + completion_tokens * v[1]) / 1000.0
        return 0.0
    inp, out = COST_PER_1K_TOKENS[key]
    return (prompt_tokens * inp + completion_tokens * out) / 1000.0


def _span_id() -> str:
    return uuid.uuid4().hex[:16]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Trace / Span lifecycle
# ---------------------------------------------------------------------------


async def start_trace(name: str, metadata: Optional[dict] = None) -> str:
    """Begin a new trace. Returns the trace_id."""
    trace_id = uuid.uuid4().hex[:16]
    _current_trace.set(trace_id)
    try:
        from db import db
        await db["llm_traces"].insert_one({
            "_id": f"trace:{trace_id}",
            "trace_id": trace_id,
            "name": name,
            "kind": "trace",
            "metadata": metadata or {},
            "status": "running",
            "started_at": _now(),
        })
    except Exception as exc:
        logger.warning("start_trace write failed: %s", exc)
    return trace_id


async def start_span(
    name: str,
    kind: str,
    input_data: dict,
    parent_span_id: Optional[str] = None,
) -> str:
    """Begin a new span inside the current trace. Returns span_id."""
    trace_id = _current_trace.get()
    span_id = _span_id()
    _current_span.set(span_id)
    _inflight[span_id] = {
        "mono": time.monotonic(),
        "doc": {
            "_id": span_id,
            "trace_id": trace_id,
            "parent_span_id": parent_span_id or _current_span.get(),
            "name": name,
            "kind": kind,
            "input": _truncate(input_data),
            "output": {},
            "model": "",
            "provider": "",
            "latency_ms": 0,
            "token_count": {},
            "cost_estimate": 0.0,
            "metadata": {},
            "status": "running",
            "error": None,
            "started_at": _now(),
            "finished_at": None,
        },
    }
    return span_id


async def end_span(
    span_id: str,
    output_data: dict,
    *,
    token_count: Optional[dict] = None,
    error: Optional[str] = None,
    model: str = "",
    provider: str = "",
    metadata: Optional[dict] = None,
) -> None:
    """Finalize a span and persist it to MongoDB."""
    info = _inflight.pop(span_id, None)
    if not info:
        return
    doc = info["doc"]
    elapsed_ms = int((time.monotonic() - info["mono"]) * 1000)
    doc["output"] = _truncate(output_data)
    doc["latency_ms"] = elapsed_ms
    doc["token_count"] = token_count or {}
    doc["cost_estimate"] = _estimate_cost(provider, model, token_count)
    doc["model"] = model
    doc["provider"] = provider
    doc["status"] = "error" if error else "ok"
    doc["error"] = error
    doc["finished_at"] = _now()
    if metadata:
        doc["metadata"].update(metadata)
    try:
        from db import db
        await db["llm_traces"].insert_one(doc)
    except Exception as exc:
        logger.warning("end_span write failed: %s", exc)


async def end_trace(trace_id: str) -> None:
    """Mark a trace as complete."""
    _current_trace.set(None)
    _current_span.set(None)
    try:
        from db import db
        await db["llm_traces"].update_one(
            {"_id": f"trace:{trace_id}"},
            {"$set": {"status": "completed", "finished_at": _now()}},
        )
    except Exception as exc:
        logger.warning("end_trace write failed: %s", exc)


def get_current_trace_id() -> Optional[str]:
    return _current_trace.get()


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------


async def get_latency_percentiles(minutes: int = 60) -> dict:
    """Return p50 / p95 / p99 latency over the last *minutes*."""
    try:
        from db import db
        cutoff = _now() - timedelta(minutes=minutes)
        pipeline = [
            {"$match": {"kind": "llm", "started_at": {"$gte": cutoff}}},
            {"$sort": {"latency_ms": 1}},
            {"$group": {
                "_id": None,
                "values": {"$push": "$latency_ms"},
                "count": {"$sum": 1},
            }},
        ]
        async for row in db["llm_traces"].aggregate(pipeline):
            vals = row["values"]
            n = row["count"]
            if n == 0:
                return {"p50": 0, "p95": 0, "p99": 0, "count": 0}
            return {
                "p50": vals[int(n * 0.50)],
                "p95": vals[min(int(n * 0.95), n - 1)],
                "p99": vals[min(int(n * 0.99), n - 1)],
                "count": n,
            }
        return {"p50": 0, "p95": 0, "p99": 0, "count": 0}
    except Exception as exc:
        logger.warning("get_latency_percentiles failed: %s", exc)
        return {"p50": 0, "p95": 0, "p99": 0, "count": 0}


async def get_cost_by_provider(days: int = 7) -> list[dict]:
    try:
        from db import db
        cutoff = _now() - timedelta(days=days)
        pipeline = [
            {"$match": {"kind": "llm", "started_at": {"$gte": cutoff}}},
            {"$group": {
                "_id": {"provider": "$provider", "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$started_at"}}},
                "total_cost": {"$sum": "$cost_estimate"},
                "calls": {"$sum": 1},
            }},
            {"$sort": {"_id.day": -1}},
        ]
        return [doc async for doc in db["llm_traces"].aggregate(pipeline)]
    except Exception as exc:
        logger.warning("get_cost_by_provider failed: %s", exc)
        return []


async def get_error_rate(minutes: int = 60) -> dict:
    try:
        from db import db
        cutoff = _now() - timedelta(minutes=minutes)
        pipeline = [
            {"$match": {"kind": "llm", "started_at": {"$gte": cutoff}}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "errors": {"$sum": {"$cond": [{"$eq": ["$status", "error"]}, 1, 0]}},
            }},
        ]
        async for row in db["llm_traces"].aggregate(pipeline):
            total = row["total"]
            errors = row["errors"]
            rate = (errors / total) if total else 0.0
            return {"rate": round(rate, 4), "total": total, "errors": errors}
        return {"rate": 0.0, "total": 0, "errors": 0}
    except Exception as exc:
        logger.warning("get_error_rate failed: %s", exc)
        return {"rate": 0.0, "total": 0, "errors": 0}


async def get_tokens_by_model(days: int = 7) -> list[dict]:
    try:
        from db import db
        cutoff = _now() - timedelta(days=days)
        pipeline = [
            {"$match": {"kind": "llm", "started_at": {"$gte": cutoff}}},
            {"$group": {
                "_id": {"provider": "$provider", "model": "$model"},
                "prompt_tokens": {"$sum": "$token_count.prompt"},
                "completion_tokens": {"$sum": "$token_count.completion"},
                "calls": {"$sum": 1},
            }},
            {"$sort": {"calls": -1}},
        ]
        return [doc async for doc in db["llm_traces"].aggregate(pipeline)]
    except Exception as exc:
        logger.warning("get_tokens_by_model failed: %s", exc)
        return []


async def get_recent_errors(limit: int = 10) -> list[dict]:
    try:
        from db import db
        cursor = db["llm_traces"].find(
            {"kind": "llm", "status": "error"},
            {"_id": 0, "input": 0},
        ).sort("started_at", -1).limit(limit)
        return [doc async for doc in cursor]
    except Exception as exc:
        logger.warning("get_recent_errors failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _truncate(data: Any, max_len: int = 4000) -> Any:
    """Truncate large string values so traces stay manageable."""
    if isinstance(data, str):
        return data[:max_len] if len(data) > max_len else data
    if isinstance(data, dict):
        return {k: _truncate(v, max_len) for k, v in data.items()}
    if isinstance(data, list):
        return [_truncate(v, max_len) for v in data[:50]]
    return data
