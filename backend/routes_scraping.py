"""Scraping management — admin CRUD for automated visa-update scraping.

Endpoints:
  GET    /api/scraping/targets              List all scrape targets
  POST   /api/scraping/targets              Add a new target
  PUT    /api/scraping/targets/{id}         Update a target
  DELETE /api/scraping/targets/{id}         Remove a target
  POST   /api/scraping/targets/{id}/scrape  Manual scrape one target
  POST   /api/scraping/run                  Run full scrape cycle
  GET    /api/scraping/history              Paginated scrape run history
  GET    /api/scraping/changes              Recent detected changes
  POST   /api/scraping/changes/{id}/dismiss Dismiss a change flag
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from db import db

router = APIRouter(
    prefix="/scraping",
    tags=["scraping"],
    dependencies=[Depends(get_current_admin_flex)],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AddTargetRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=2048)
    selector: str = Field("body", max_length=500)
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field("general", max_length=100)
    scrape_interval_hours: int = Field(24, ge=1, le=168)


class UpdateTargetRequest(BaseModel):
    url: Optional[str] = Field(None, min_length=10, max_length=2048)
    selector: Optional[str] = Field(None, max_length=500)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    scrape_interval_hours: Optional[int] = Field(None, ge=1, le=168)
    active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Targets CRUD
# ---------------------------------------------------------------------------


@router.get("/targets")
async def list_targets():
    targets = []
    async for t in db["scrape_targets"].find({}, {"_id": 0}).sort("created_at", -1):
        targets.append(t)
    return {"targets": targets, "count": len(targets)}


@router.post("/targets", status_code=201)
async def add_target(req: AddTargetRequest):
    doc = {
        "id": uuid.uuid4().hex[:16],
        "url": req.url,
        "selector": req.selector,
        "name": req.name,
        "category": req.category,
        "active": True,
        "scrape_interval_hours": req.scrape_interval_hours,
        "last_scraped_at": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db["scrape_targets"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/targets/{target_id}")
async def update_target(target_id: str, req: UpdateTargetRequest):
    updates = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.utcnow().isoformat()
    result = await db["scrape_targets"].update_one({"id": target_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Target not found")
    return {"ok": True, "updated": target_id}


@router.delete("/targets/{target_id}")
async def delete_target(target_id: str):
    result = await db["scrape_targets"].delete_one({"id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Target not found")
    return {"ok": True, "deleted": target_id}


# ---------------------------------------------------------------------------
# Scrape execution
# ---------------------------------------------------------------------------


@router.post("/targets/{target_id}/scrape")
async def scrape_one(target_id: str):
    from scraping_agent import scrape_target, detect_diff, ingest_into_rag

    target = await db["scrape_targets"].find_one({"id": target_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Target not found")

    result = await scrape_target(target)
    if result["status"] != "ok":
        return {"ok": False, "error": result["error"], "latency_ms": result["latency_ms"]}

    diff = await detect_diff(target_id, result["content"])

    ingested = False
    if diff["changed"]:
        try:
            await ingest_into_rag(target_id, result["content"], {
                "name": target.get("name", ""),
                "category": target.get("category", ""),
                "url": target.get("url", ""),
            })
            ingested = True
        except Exception:
            pass

    run_id = uuid.uuid4().hex[:16]
    await db["scrape_runs"].insert_one({
        "_id": run_id,
        "target_id": target_id,
        "status": "ok",
        "error": None,
        "latency_ms": result["latency_ms"],
        "scraped_at": result["scraped_at"],
        "changed": diff["changed"],
        "content_hash": diff["content_hash"],
        "content_preview": result["content"][:5000],
        "diff_summary": diff["diff_summary"],
        "ingested": ingested,
        "dismissed": False,
    })
    await db["scrape_targets"].update_one(
        {"id": target_id},
        {"$set": {"last_scraped_at": result["scraped_at"]}},
    )
    return {
        "ok": True,
        "run_id": run_id,
        "changed": diff["changed"],
        "diff_summary": diff["diff_summary"],
        "ingested": ingested,
        "latency_ms": result["latency_ms"],
    }


@router.post("/run")
async def run_cycle(background_tasks: BackgroundTasks):
    from scraping_agent import run_scrape_cycle

    background_tasks.add_task(run_scrape_cycle, "manual")
    return {"ok": True, "message": "Scrape cycle started in background"}


# ---------------------------------------------------------------------------
# History & changes
# ---------------------------------------------------------------------------


@router.get("/history")
async def scrape_history(
    target_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query: dict = {}
    if target_id:
        query["target_id"] = target_id
    runs = []
    cursor = db["scrape_runs"].find(query, {"content_preview": 0}).sort("scraped_at", -1).skip(skip).limit(limit)
    async for r in cursor:
        r["id"] = r.pop("_id", r.get("id"))
        runs.append(r)
    total = await db["scrape_runs"].count_documents(query)
    return {"runs": runs, "total": total}


@router.get("/changes")
async def recent_changes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query = {"changed": True, "dismissed": {"$ne": True}}
    runs = []
    cursor = db["scrape_runs"].find(query, {"content_preview": 0}).sort("scraped_at", -1).skip(skip).limit(limit)
    async for r in cursor:
        r["id"] = r.pop("_id", r.get("id"))
        runs.append(r)
    total = await db["scrape_runs"].count_documents(query)
    return {"changes": runs, "total": total}


@router.post("/changes/{run_id}/dismiss")
async def dismiss_change(run_id: str):
    result = await db["scrape_runs"].update_one({"_id": run_id}, {"$set": {"dismissed": True}})
    if result.matched_count == 0:
        raise HTTPException(404, "Run not found")
    return {"ok": True, "dismissed": run_id}
