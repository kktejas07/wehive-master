"""Admin API endpoints for university CSV seeding, enrichment, and Scorecard sync."""
from __future__ import annotations

import io
import json as _json
import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from audit import record as audit_record
from db import db
from seed_service import seed_from_csv_bytes, enrich_from_csv_bytes, enrich_scorecard
from seed_universities import seed as seed_universities

router = APIRouter(prefix="/admin/universities", tags=["admin-universities"])

universities_col = db["universities_v2"]

CN_FIELD_MAP = {'录取率': 'acceptance_rate', '就业率': 'employment_rate'}


def _normalize(doc: dict) -> dict:
    doc.pop('_id', None)
    for cn_key, en_key in CN_FIELD_MAP.items():
        if cn_key in doc and en_key not in doc:
            doc[en_key] = doc.pop(cn_key)
        elif cn_key in doc:
            doc.pop(cn_key)
    if ' scholarships' in doc:
        doc['scholarships'] = doc.pop(' scholarships')
    if ' intakes' in doc:
        doc['intakes'] = doc.pop(' intakes')
    return doc


async def _admin(user=Depends(get_current_admin_flex)):
    return user


class UniversityPatch(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    country: Optional[str] = None
    country_name: Optional[str] = None
    rank: Optional[int] = None
    qs_rank: Optional[int] = None
    times_rank: Optional[int] = None
    type: Optional[str] = None
    established: Optional[int] = None
    students: Optional[int] = None
    intl_students: Optional[int] = None
    tuition_usd: Optional[int] = None
    living_cost_usd: Optional[int] = None
    avg_salary_usd: Optional[int] = None
    scholarships: Optional[bool] = None
    gre_required: Optional[bool] = None
    gmat_required: Optional[bool] = None
    courses: Optional[list[str]] = None
    popular_courses: Optional[list[str]] = None
    intakes: Optional[list[str]] = None
    accreditation: Optional[list[str]] = None
    facilities: Optional[list[str]] = None
    ielts_min: Optional[float] = None
    toefl_min: Optional[int] = None
    acceptance_rate: Optional[str] = None
    employment_rate: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    image_url: Optional[str] = None


@router.get("/stats")
async def get_university_stats(_=Depends(_admin)):
    total = await universities_col.count_documents({})
    countries = await universities_col.distinct("country")
    return {"total": total, "countries": len(countries)}


@router.post("/seed-from-csv")
async def admin_seed_from_csv(
    file: UploadFile = File(...),
    dry_run: bool = Form(False),
    admin=Depends(_admin),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Upload must be a CSV file")

    csv_data = await file.read()
    result = await seed_from_csv_bytes(csv_data, file.filename, dry_run=dry_run)

    if "error" in result:
        raise HTTPException(400, result["error"])

    await audit_record(
        admin, "seed_from_csv" if not dry_run else "seed_from_csv_dryrun",
        "universities", file.filename,
        extra={"rows": result["rows"], "valid_docs": result["valid_docs"],
               "dry_run": dry_run, "inserted": result.get("inserted", 0),
               "updated": result.get("updated", 0)},
    )
    return result


@router.post("/enrich-from-csv")
async def admin_enrich_from_csv(
    file: UploadFile = File(...),
    threshold: int = Form(88),
    insert_missing: bool = Form(False),
    dry_run: bool = Form(False),
    column_overrides: Optional[str] = Form(None),
    admin=Depends(_admin),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Upload must be a CSV file")

    overrides: dict[str, str] = {}
    if column_overrides:
        import json as _json
        try:
            overrides = _json.loads(column_overrides)
        except (ValueError, TypeError):
            raise HTTPException(400, "column_overrides must be a JSON object, e.g. {\"rank\": \"My Rank\"}")

    csv_data = await file.read()
    result = await enrich_from_csv_bytes(
        csv_data, file.filename,
        threshold=threshold, insert_missing=insert_missing,
        dry_run=dry_run, column_overrides=overrides,
    )

    if "error" in result:
        raise HTTPException(400, result["error"])

    await audit_record(
        admin, "enrich_from_csv" if not dry_run else "enrich_from_csv_dryrun",
        "universities", file.filename,
        extra={"rows": result["rows"], "enrich_fields": result.get("enrich_fields", []),
               "dry_run": dry_run, "threshold": threshold,
               "insert_missing": insert_missing,
               "updated": result.get("updated", 0),
               "inserted": result.get("inserted", 0)},
    )
    return result


@router.post("/enrich-scorecard")
async def admin_enrich_scorecard(
    threshold: int = Form(88),
    insert_missing: bool = Form(False),
    dry_run: bool = Form(False),
    admin=Depends(_admin),
):
    api_key = os.environ.get("SCORECARD_API_KEY", "DEMO_KEY")
    result = await enrich_scorecard(
        api_key, threshold=threshold,
        insert_missing=insert_missing, dry_run=dry_run,
    )

    if "error" in result:
        raise HTTPException(400, result["error"])

    await audit_record(
        admin, "enrich_scorecard" if not dry_run else "enrich_scorecard_dryrun",
        "universities", "college_scorecard_api",
        extra={"dry_run": dry_run, "threshold": threshold,
               "insert_missing": insert_missing,
               "fetched": result.get("fetched", 0),
               "updated": result.get("updated", 0),
               "inserted": result.get("inserted", 0)},
    )
    return result


@router.post("/re-seed")
async def admin_re_seed_universities(admin=Depends(_admin)):
    try:
        result = await seed_universities()
        await audit_record(
            admin, "re_seed", "universities", "static_data + hipolabs",
            extra={"static": result.get("static", 0), "api": result.get("api", 0),
                   "total": result.get("total", 0)},
        )
        return {"ok": True, "result": result}
    except Exception as e:
        raise HTTPException(500, f"Re-seed failed: {e}")


# ---------- admin list / search / individual editor ----------

@router.get("")
async def admin_list_universities(
    q: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    _=Depends(_admin),
):
    flt: dict = {}
    if q:
        rx = {"$regex": q, "$options": "i"}
        flt["$or"] = [{"name": rx}, {"short_name": rx}, {"country_name": rx}, {"id": rx}]
    if country:
        flt["country"] = {"$in": [c.strip() for c in country.lower().split(",") if c.strip()]}
    total = await universities_col.count_documents(flt)
    cursor = universities_col.find(flt).sort("name", 1).skip(skip).limit(limit)
    items = [_normalize(dict(doc)) async for doc in cursor]
    return {"total": total, "items": items, "limit": limit, "skip": skip}


@router.get("/{university_id}")
async def admin_get_university(university_id: str, _=Depends(_admin)):
    doc = await universities_col.find_one({"id": university_id})
    if not doc:
        raise HTTPException(404, "University not found")
    return _normalize(dict(doc))


@router.patch("/{university_id}")
async def admin_update_university(
    university_id: str,
    patch: UniversityPatch,
    admin=Depends(_admin),
):
    existing = await universities_col.find_one({"id": university_id})
    if not existing:
        raise HTTPException(404, "University not found")
    update = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["updated_at"] = datetime.utcnow()
    await universities_col.update_one({"id": university_id}, {"$set": update})
    fresh = await universities_col.find_one({"id": university_id})
    await audit_record(
        admin, "update", "university", university_id,
        before={k: existing.get(k) for k in update.keys() if k != "updated_at"},
        after={k: fresh.get(k) for k in update.keys() if k != "updated_at"},
        extra={"name": existing.get("name")},
    )
    return _normalize(dict(fresh))
