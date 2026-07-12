"""Admin API endpoints for university management."""
from __future__ import annotations

import json as _json
import logging
import os
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger("wehive.admin_universities")

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel

from core.admin_auth import get_current_admin_flex
from audit import record as audit_record
from core.db import db
from seed.seed_service import seed_from_csv_bytes, enrich_from_csv_bytes, enrich_scorecard
from seed.seed_universities import seed as seed_universities

router = APIRouter(prefix="/admin/universities", tags=["admin-universities"])
universities_col = db["universities_v2"]


async def _admin(user=Depends(get_current_admin_flex)):
    return user


class UniversityPatch(BaseModel):
    name: Optional[str] = None; short_name: Optional[str] = None
    country: Optional[str] = None; country_name: Optional[str] = None
    rank: Optional[int] = None; qs_rank: Optional[int] = None; times_rank: Optional[int] = None
    type: Optional[str] = None; established: Optional[int] = None
    students: Optional[int] = None; intl_students: Optional[int] = None
    tuition_usd: Optional[int] = None; living_cost_usd: Optional[int] = None; avg_salary_usd: Optional[int] = None
    scholarships: Optional[bool] = None; gre_required: Optional[bool] = None; gmat_required: Optional[bool] = None
    courses: Optional[list[str]] = None; popular_courses: Optional[list[str]] = None; intakes: Optional[list[str]] = None
    accreditation: Optional[list[str]] = None; facilities: Optional[list[str]] = None
    ielts_min: Optional[float] = None; toefl_min: Optional[int] = None
    acceptance_rate: Optional[str] = None; employment_rate: Optional[str] = None
    description: Optional[str] = None; location: Optional[str] = None; website: Optional[str] = None; image_url: Optional[str] = None


@router.get("/stats")
async def get_stats(_=Depends(_admin)):
    return {"total": await universities_col.count_documents({}),
            "countries": len(await universities_col.distinct("country"))}


@router.post("/seed-from-csv")
async def seed_csv(file: UploadFile = File(...), dry_run: bool = Form(False), admin=Depends(_admin)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Must be a CSV file")
    result = await seed_from_csv_bytes(await file.read(), file.filename, dry_run=dry_run)
    if "error" in result: raise HTTPException(400, result["error"])
    await audit_record(admin, "seed_from_csv" if not dry_run else "seed_from_csv_dryrun", "universities", file.filename,
        extra={"rows": result["rows"], "dry_run": dry_run})
    return result


@router.post("/enrich-from-csv")
async def enrich_csv(file: UploadFile = File(...), threshold: int = Form(88),
    insert_missing: bool = Form(False), dry_run: bool = Form(False),
    column_overrides: Optional[str] = Form(None), admin=Depends(_admin)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Must be a CSV file")
    overrides = _json.loads(column_overrides) if column_overrides else {}
    if not isinstance(overrides, dict):
        raise HTTPException(400, "column_overrides must be a JSON object, e.g. {\"rank\": \"My Rank\"}")
    result = await enrich_from_csv_bytes(await file.read(), file.filename, threshold=threshold,
        insert_missing=insert_missing, dry_run=dry_run, column_overrides=overrides)
    if "error" in result: raise HTTPException(400, result["error"])
    await audit_record(admin, "enrich" if not dry_run else "enrich_dryrun", "universities", file.filename,
        extra={"rows": result["rows"], "dry_run": dry_run})
    return result


@router.post("/enrich-scorecard")
async def scorecard(threshold: int = Form(88), insert_missing: bool = Form(False),
    dry_run: bool = Form(False), admin=Depends(_admin)):
    result = await enrich_scorecard(os.environ.get("SCORECARD_API_KEY", "DEMO_KEY"),
        threshold=threshold, insert_missing=insert_missing, dry_run=dry_run)
    if "error" in result: raise HTTPException(400, result["error"])
    await audit_record(admin, "scorecard" if not dry_run else "scorecard_dryrun", "universities", "api",
        extra={"dry_run": dry_run})
    return result


@router.post("/re-seed")
async def re_seed(admin=Depends(_admin)):
    try:
        result = await seed_universities()
        await audit_record(admin, "re_seed", "universities", "static",
            extra={"static": result.get("static", 0), "api": result.get("api", 0), "total": result.get("total", 0)})
        return {"ok": True, "result": result}
    except Exception:
        logger.exception("Re-seed failed")
        raise HTTPException(500, "Re-seed failed")


@router.get("")
async def list_all(q: Optional[str] = Query(None), country: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500), skip: int = Query(0, ge=0), _=Depends(_admin)):
    flt = {}
    if q: flt["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"short_name": {"$regex": q, "$options": "i"}}, {"id": {"$regex": q, "$options": "i"}}]
    if country: flt["country"] = {"$in": [c.strip() for c in country.lower().split(",") if c.strip()]}
    cursor = universities_col.find(flt).sort("name", 1).skip(skip).limit(limit)
    items = [d async for d in cursor]
    for i in items: i.pop("_id", None)
    return {"total": await universities_col.count_documents(flt), "items": items, "limit": limit, "skip": skip}


@router.get("/{uid}")
async def get_one(uid: str, _=Depends(_admin)):
    d = await universities_col.find_one({"id": uid})
    if not d: raise HTTPException(404)
    d.pop("_id", None); return d


@router.patch("/{uid}")
async def update_one(uid: str, body: UniversityPatch, admin=Depends(_admin)):
    existing = await universities_col.find_one({"id": uid})
    if not existing: raise HTTPException(404)
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update: raise HTTPException(400, "Nothing to update")
    update["updated_at"] = datetime.utcnow()
    await universities_col.update_one({"id": uid}, {"$set": update})
    fresh = await universities_col.find_one({"id": uid})
    fresh.pop("_id", None)
    await audit_record(admin, "update", "university", uid,
        before={k: existing.get(k) for k in update}, after={k: fresh.get(k) for k in update},
        extra={"name": existing.get("name")})
    return fresh
