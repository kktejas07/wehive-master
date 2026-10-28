"""RAG Evaluation Routes — admin endpoints for RAG quality metrics.

Endpoints:
  POST /api/rag-eval/evaluate           Run evaluation on a specific message
  GET  /api/rag-eval/evaluations        Paginated evaluation list
  GET  /api/rag-eval/evaluations/{id}   Single evaluation detail
  GET  /api/rag-eval/trends             Aggregate scores over time
  POST /api/rag-eval/evaluate-batch     Evaluate last N conversations (background)
  PUT  /api/rag-eval/config             Set auto-eval configuration
  GET  /api/rag-eval/config             Current auto-eval config
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from db import db
from rag_eval import evaluate_conversation

router = APIRouter(
    prefix="/rag-eval",
    tags=["rag-eval"],
    dependencies=[Depends(get_current_admin_flex)],
)
logger = logging.getLogger("wehive.rag_eval")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EvaluateRequest(BaseModel):
    session_id: str
    message_id: str


class BatchEvaluateRequest(BaseModel):
    count: int = Field(10, ge=1, le=100)


class EvalConfigRequest(BaseModel):
    auto_enabled: bool = False
    every_nth: int = Field(10, ge=1, le=1000)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/evaluate")
async def run_evaluation(req: EvaluateRequest):
    result = await evaluate_conversation(req.session_id, req.message_id)
    if "error" in result and "_id" not in result:
        raise HTTPException(status_code=400, detail=result["error"])
    result.pop("_id", None)
    return result


@router.get("/evaluations")
async def list_evaluations(
    session_id: Optional[str] = None,
    auto_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {}
    if session_id:
        query["session_id"] = session_id
    if auto_only:
        query["auto"] = True

    cursor = (
        db["rag_evaluations"]
        .find(query, {"details": 0})
        .sort("evaluated_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = []
    async for doc in cursor:
        doc["id"] = doc.pop("_id")
        items.append(doc)

    total = await db["rag_evaluations"].count_documents(query)
    return {"items": items, "total": total}


@router.get("/evaluations/{eval_id}")
async def get_evaluation(eval_id: str):
    doc = await db["rag_evaluations"].find_one({"_id": eval_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    doc["id"] = doc.pop("_id")
    return doc


@router.get("/trends")
async def evaluation_trends(days: int = Query(30, ge=1, le=365)):
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"evaluated_at": {"$gte": since}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$evaluated_at"}
                },
                "count": {"$sum": 1},
                "avg_faithfulness": {"$avg": "$scores.faithfulness"},
                "avg_relevancy": {"$avg": "$scores.answer_relevancy"},
                "avg_precision": {"$avg": "$scores.context_precision"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    results = []
    async for doc in db["rag_evaluations"].aggregate(pipeline):
        results.append({
            "date": doc["_id"],
            "count": doc["count"],
            "avg_faithfulness": round(doc["avg_faithfulness"] or 0, 4),
            "avg_relevancy": round(doc["avg_relevancy"] or 0, 4),
            "avg_precision": round(doc["avg_precision"] or 0, 4),
        })
    return {"days": days, "trends": results}


@router.post("/evaluate-batch")
async def evaluate_batch(req: BatchEvaluateRequest):
    async def _run_batch(count: int):
        cursor = (
            db["chat_messages"]
            .find({"role": "assistant"})
            .sort("created_at", -1)
            .limit(count)
        )
        evaluated = 0
        async for msg in cursor:
            try:
                await evaluate_conversation(
                    session_id=msg.get("session_id", ""),
                    message_id=str(msg["_id"]),
                )
                evaluated += 1
            except Exception:
                logger.exception("Batch eval failed for message %s", msg.get("_id"))
        logger.info("Batch evaluation complete: %d/%d", evaluated, count)

    asyncio.create_task(_run_batch(req.count))
    return {"status": "started", "count": req.count}


@router.put("/config")
async def update_config(req: EvalConfigRequest):
    await db["settings"].update_one(
        {"_id": "rag_eval_config"},
        {
            "$set": {
                "auto_enabled": req.auto_enabled,
                "every_nth": req.every_nth,
            }
        },
        upsert=True,
    )
    return {"auto_enabled": req.auto_enabled, "every_nth": req.every_nth}


@router.get("/config")
async def get_config():
    doc = await db["settings"].find_one({"_id": "rag_eval_config"}) or {}
    return {
        "auto_enabled": doc.get("auto_enabled", False),
        "every_nth": doc.get("every_nth", 10),
        "counter": doc.get("counter", 0),
    }
