"""Document auto-filing routes.

Endpoints
---------
POST   /api/documents/upload          — upload + auto-classify + file
PATCH  /api/documents/{id}/label      — staff correction (remembered forever)
POST   /api/documents/{id}/reclassify — re-run classifier on one doc (idempotent)
POST   /api/documents/reclassify-backfill — walk full catalogue (dry-run default)
GET    /api/documents                 — list documents for the caller's scope
GET    /api/documents/{id}            — single document
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from auth_utils import get_current_user
from db import db
from storage import is_configured as storage_configured, upload_bytes, signed_download_url

logger = logging.getLogger("wehive.routes_doc_filing")
router = APIRouter(prefix="/api/documents", tags=["documents"])

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
_ALLOWED_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/heic",
    "image/heif",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_storage() -> None:
    if not storage_configured():
        raise HTTPException(503, "Cloud storage is not configured")


def _user_scope(user: dict) -> tuple[str, str, str]:
    """Return (owner_type, owner_id, owner_email) for the current user."""
    return "user", str(user["_id"]), user.get("email", "")


# ---------------------------------------------------------------------------
# Upload + auto-file
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_and_file(
    file: UploadFile = File(...),
    owner_type: str = Form("user"),
    owner_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Upload a document and auto-classify + file it.

    The pipeline:
      sha256 → check dedupe → OCR (if not cached) → classify → folder → persist

    Failures in classification or folder creation NEVER fail the upload; the
    document is stored with status='unfiled' and classified from filename alone.
    """
    _require_storage()

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(400, "Empty file")
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large (max {_MAX_UPLOAD_BYTES // 1024 // 1024} MB)")

    mime = file.content_type or "application/octet-stream"
    if mime not in _ALLOWED_MIMES:
        raise HTTPException(415, f"Unsupported file type: {mime}")

    filename = file.filename or "upload"

    # Store bytes in R2 (synchronous boto3 call, run in threadpool)
    import asyncio
    checksum = hashlib.sha256(content).hexdigest()
    storage_key = f"documents/{owner_id or user['_id']}/{checksum[:8]}/{filename}"
    loop = asyncio.get_event_loop()
    r2_meta = await loop.run_in_executor(
        None, lambda: upload_bytes(storage_key, content, content_type=mime)
    )
    file_url = storage_key  # store the R2 key; generate signed URL on demand

    # Determine owner
    eff_owner_id = owner_id or str(user["_id"])
    eff_owner_email = user.get("email", "")

    from doc_filing import file_document
    doc = await file_document(
        content=content,
        filename=filename,
        file_url=file_url,
        mime=mime,
        owner_type=owner_type,
        owner_id=eff_owner_id,
        owner_email=eff_owner_email,
        uploaded_by=str(user["_id"]),
    )

    return JSONResponse(
        status_code=201 if not doc.get("_deduped") else 200,
        content=_serialise(doc),
    )


# ---------------------------------------------------------------------------
# Staff label correction
# ---------------------------------------------------------------------------

class LabelPatch(BaseModel):
    corrected_to: str    # target doc_type


@router.patch("/{document_id}/label")
async def correct_label(
    document_id: str,
    body: LabelPatch,
    admin: dict = Depends(get_current_admin_flex),
):
    """Record a staff correction for this document.

    The corrected doc_type is stored in label_corrections and wins over the
    rules on every future classification of a file with the same name in the
    same owner scope.
    """
    doc = await db["documents"].find_one({"_id": document_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    from doc_filing import record_correction
    owner_scope = f"{doc.get('owner_type', 'user')}:{doc.get('owner_id', '')}"
    await record_correction(
        owner_scope=owner_scope,
        file_name=doc.get("doc_name", ""),
        corrected_to=body.corrected_to,
        rule_said=doc.get("doc_type", "other"),
        corrected_by=str(admin["_id"]),
    )

    # Update the document itself to manual
    from datetime import datetime, timezone
    await db["documents"].update_one(
        {"_id": document_id},
        {"$set": {
            "doc_type": body.corrected_to,
            "classification_source": "manual",
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return {"ok": True, "doc_type": body.corrected_to, "classification_source": "manual"}


# ---------------------------------------------------------------------------
# Reclassify single document
# ---------------------------------------------------------------------------

@router.post("/{document_id}/reclassify")
async def reclassify_one(
    document_id: str,
    dry_run: bool = Query(True),
    admin: dict = Depends(get_current_admin_flex),
):
    """Re-run classifier on one document.

    - Idempotent: safe to run twice.
    - Never overwrites a human-verified label (classification_source='manual').
    - Dry-run by default; pass ?dry_run=false to apply.
    """
    from doc_filing import reclassify_one as _reclassify
    return await _reclassify(document_id, dry_run=dry_run)


# ---------------------------------------------------------------------------
# Backfill
# ---------------------------------------------------------------------------

@router.post("/reclassify-backfill")
async def reclassify_backfill(
    apply: bool = Query(False, description="Set true to actually apply changes"),
    owner_type: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin_flex),
):
    """Walk the catalogue and re-classify every document the rules would change.

    Dry-run by default.  Returns {examined, changed, skipped, diff}.
    Human-verified labels are never touched.
    """
    from doc_filing import reclassify_backfill as _backfill
    result = await _backfill(
        owner_type=owner_type,
        owner_id=owner_id,
        apply=apply,
    )
    return result


# ---------------------------------------------------------------------------
# List + detail
# ---------------------------------------------------------------------------

@router.get("")
async def list_documents(
    owner_id: Optional[str] = Query(None),
    doc_category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
):
    """List documents accessible to the current user (or admin-scoped by owner_id)."""
    query: dict = {"owner_id": owner_id or str(user["_id"])}
    if doc_category:
        query["doc_category"] = doc_category
    if status:
        query["status"] = status

    cursor = db["documents"].find(query).skip(skip).limit(limit).sort("created_at", -1)
    docs = [_serialise(d) async for d in cursor]
    return {"documents": docs, "count": len(docs)}


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    user: dict = Depends(get_current_user),
):
    doc = await db["documents"].find_one({"_id": document_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    # Basic ownership check — admins see all via admin routes
    if doc.get("owner_id") != str(user["_id"]):
        raise HTTPException(403, "Access denied")
    return _serialise(doc)


# ---------------------------------------------------------------------------
# Serialiser
# ---------------------------------------------------------------------------

def _serialise(doc: dict) -> dict:
    d = dict(doc)
    # Remove internal Mongo ObjectId if present
    if "_id" in d and not isinstance(d["_id"], str):
        d["_id"] = str(d["_id"])
    for k in ("created_at", "updated_at"):
        if k in d and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()
    return d
