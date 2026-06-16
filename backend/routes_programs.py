"""Programs (courses) offered by universities — per-program tuition, duration, requirements."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
<<<<<<< Updated upstream
from auth_utils import get_current_user
from db import db
from routes_admin_universities import _admin as admin_dep
=======
from db import db
>>>>>>> Stashed changes

router = APIRouter(prefix="/programs", tags=["programs"])
admin_router = APIRouter(prefix="/admin/programs", tags=["admin-programs"])

programs_col = db["programs"]


<<<<<<< Updated upstream
class ProgramCreate(BaseModel):
    university_id: str
    name: str
    degree_type: str = "bachelor"  # bachelor, master, phd, diploma
=======
async def _admin(user=Depends(get_current_admin_flex)):
    return user


class ProgramCreate(BaseModel):
    university_id: str
    name: str
    degree_type: str = "bachelor"
>>>>>>> Stashed changes
    duration_years: float = 4.0
    tuition_usd: int = 0
    application_fee_usd: int = 0
    ielts_min: Optional[float] = None
    toefl_min: Optional[int] = None
    gre_required: bool = False
    gmat_required: bool = False
    intake_months: list[str] = ["Sep", "Jan"]
    entry_requirements: str = ""
    description: str = ""
    language: str = "English"
    campus: str = ""
    url: str = ""
<<<<<<< Updated upstream
=======
    total_enrolled: int = 0
    intl_enrolled: int = 0
    avg_class_size: int = 0
    acceptance_rate_program: str = ""
>>>>>>> Stashed changes


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    degree_type: Optional[str] = None
    duration_years: Optional[float] = None
    tuition_usd: Optional[int] = None
    application_fee_usd: Optional[int] = None
    ielts_min: Optional[float] = None
    toefl_min: Optional[int] = None
    gre_required: Optional[bool] = None
    gmat_required: Optional[bool] = None
    intake_months: Optional[list[str]] = None
    entry_requirements: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    campus: Optional[str] = None
    url: Optional[str] = None
<<<<<<< Updated upstream


# ── Public endpoints ──

=======
    total_enrolled: Optional[int] = None
    intl_enrolled: Optional[int] = None
    avg_class_size: Optional[int] = None
    acceptance_rate_program: Optional[str] = None


>>>>>>> Stashed changes
@router.get("/{university_id}")
async def list_programs(university_id: str):
    cursor = programs_col.find({"university_id": university_id}, {"_id": 0}).sort("tuition_usd", 1)
    return [doc async for doc in cursor]


@router.get("/{university_id}/{program_id}")
async def get_program(university_id: str, program_id: str):
    doc = await programs_col.find_one({"id": program_id, "university_id": university_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Program not found")
    return doc


<<<<<<< Updated upstream
# ── Admin endpoints ──

=======
>>>>>>> Stashed changes
@admin_router.get("")
async def admin_list_programs(
    university_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
<<<<<<< Updated upstream
    _=Depends(admin_dep),
=======
    _=Depends(_admin),
>>>>>>> Stashed changes
):
    flt = {}
    if university_id:
        flt["university_id"] = university_id
    total = await programs_col.count_documents(flt)
    cursor = programs_col.find(flt, {"_id": 0}).sort("university_id", 1).skip(skip).limit(limit)
    return {"total": total, "items": [doc async for doc in cursor]}


@admin_router.post("")
<<<<<<< Updated upstream
async def admin_create_program(body: ProgramCreate, admin=Depends(admin_dep)):
=======
async def admin_create_program(body: ProgramCreate, admin=Depends(_admin)):
>>>>>>> Stashed changes
    from audit import record as audit_record
    doc = body.model_dump()
    doc["id"] = f"{body.university_id}-{uuid.uuid4().hex[:8]}"
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = doc["created_at"]
    await programs_col.insert_one(doc)
    await audit_record(admin, "create", "program", doc["id"],
                       extra={"university_id": body.university_id, "name": body.name})
    return {k: v for k, v in doc.items() if k != "_id"}


@admin_router.patch("/{program_id}")
<<<<<<< Updated upstream
async def admin_update_program(program_id: str, body: ProgramUpdate, admin=Depends(admin_dep)):
=======
async def admin_update_program(program_id: str, body: ProgramUpdate, admin=Depends(_admin)):
>>>>>>> Stashed changes
    from audit import record as audit_record
    existing = await programs_col.find_one({"id": program_id})
    if not existing:
        raise HTTPException(404, "Program not found")
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["updated_at"] = datetime.utcnow()
    await programs_col.update_one({"id": program_id}, {"$set": update})
    fresh = await programs_col.find_one({"id": program_id}, {"_id": 0})
    await audit_record(admin, "update", "program", program_id,
                       extra={"name": existing.get("name")})
    return fresh


@admin_router.delete("/{program_id}")
<<<<<<< Updated upstream
async def admin_delete_program(program_id: str, admin=Depends(admin_dep)):
=======
async def admin_delete_program(program_id: str, admin=Depends(_admin)):
>>>>>>> Stashed changes
    from audit import record as audit_record
    existing = await programs_col.find_one({"id": program_id})
    if not existing:
        raise HTTPException(404, "Program not found")
    await programs_col.delete_one({"id": program_id})
    await audit_record(admin, "delete", "program", program_id,
                       extra={"name": existing.get("name"), "university_id": existing.get("university_id")})
    return {"ok": True}
