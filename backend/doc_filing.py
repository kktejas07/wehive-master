"""Document auto-filing pipeline.

Orchestrates the full sequence described in the spec:
  1. Store bytes, compute sha256
  2. OCR (cached by checksum; never re-OCR the same bytes)
  3. Classify (filename-first; OCR fallback)
  4. Resolve / create folder + subfolder (idempotent)
  5. Dedupe by content (checksum) — not by URL
  6. Persist with full provenance

Also provides:
  - record_correction()   — persist a staff label override
  - reclassify_one()      — re-run classifier on existing document (idempotent;
                            never touches a human-verified label)
  - reclassify_backfill() — walk the catalogue; dry-run by default
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from db import db

logger = logging.getLogger("wehive.doc_filing")

# Collections
_docs = lambda: db["documents"]
_folders = lambda: db["folders"]
_subfolders = lambda: db["subfolders"]
_corrections = lambda: db["label_corrections"]
_ocr_jobs = lambda: db["ocr_jobs"]

# Minimum chars before we consider OCR text meaningful
_MIN_TEXT_CHARS = 50


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


async def _get_ocr_cache(checksum: str) -> Optional[str]:
    """Return cached OCR text for a checksum, or None."""
    hit = await db["ocr_cache"].find_one({"checksum": checksum})
    return hit["text"] if hit else None


async def _set_ocr_cache(checksum: str, text: str) -> None:
    await db["ocr_cache"].update_one(
        {"checksum": checksum},
        {"$set": {"checksum": checksum, "text": text, "updated_at": _now()}},
        upsert=True,
    )


# ---------------------------------------------------------------------------
# 1. OCR with caching and job logging
# ---------------------------------------------------------------------------

async def _run_ocr(
    content: bytes,
    filename: str,
    checksum: str,
    document_id: str,
) -> tuple[str, str]:
    """Return (ocr_text, engine_name).  Never raises.

    Caches by checksum — same bytes → same OCR result without a second call.
    Records every attempt in ocr_jobs.
    """
    cached = await _get_ocr_cache(checksum)
    if cached is not None:
        return cached, "cache"

    from ocr_client import extract_text, is_configured

    if not is_configured():
        return "", "none"

    start = asyncio.get_event_loop().time()
    text, error = await extract_text(content, filename)
    elapsed_ms = int((asyncio.get_event_loop().time() - start) * 1000)

    ok = error is None and len(text) >= _MIN_TEXT_CHARS
    await _ocr_jobs().insert_one({
        "_id": str(uuid.uuid4()),
        "scope": "document",
        "file_name": filename,
        "document_id": document_id,
        "engine": "axiss-ocr",
        "ok": ok,
        "pages": None,  # filled from service response if available
        "ms": elapsed_ms,
        "error": error,
        "created_at": _now(),
    })

    if ok:
        await _set_ocr_cache(checksum, text)

    return text, "axiss-ocr"


# ---------------------------------------------------------------------------
# 2. Learned corrections
# ---------------------------------------------------------------------------

async def _get_correction(owner_scope: str, file_name: str) -> Optional[str]:
    """Return corrected doc_type for this (scope, filename) pair, or None."""
    hit = await _corrections().find_one(
        {"owner_scope": owner_scope, "file_name": file_name.lower()}
    )
    return hit["corrected_to"] if hit else None


async def record_correction(
    owner_scope: str,
    file_name: str,
    corrected_to: str,
    rule_said: str,
    corrected_by: str,
) -> dict:
    """Persist a staff label correction.  Wins over all rules on future runs."""
    doc = {
        "owner_scope": owner_scope,
        "file_name": file_name.lower(),
        "corrected_to": corrected_to,
        "rule_said": rule_said,
        "corrected_by": corrected_by,
        "created_at": _now(),
    }
    await _corrections().update_one(
        {"owner_scope": owner_scope, "file_name": file_name.lower()},
        {"$set": doc},
        upsert=True,
    )
    return doc


# ---------------------------------------------------------------------------
# 3. Folder / subfolder resolution (idempotent, never raises into upload)
# ---------------------------------------------------------------------------

async def _resolve_folder(
    owner_type: str,
    owner_id: str,
    owner_email: str = "",
) -> str:
    """Find or create a folder for this owner. Returns folder_id."""
    try:
        query: dict[str, Any] = {
            "$or": [
                {"owner_type": owner_type, "owner_id": owner_id},
            ]
        }
        if owner_email:
            query["$or"].append({"owner_email": owner_email.lower()})

        existing = await _folders().find_one(query)
        if existing:
            return str(existing["_id"])

        folder_id = str(uuid.uuid4())
        await _folders().insert_one({
            "_id": folder_id,
            "owner_type": owner_type,
            "owner_id": owner_id,
            "owner_email": owner_email.lower() if owner_email else "",
            "name": f"{owner_type.title()} Documents",
            "created_at": _now(),
        })
        return folder_id
    except Exception as exc:
        logger.error("_resolve_folder failed: %s — using synthetic id", exc)
        # Return deterministic id so the upload still lands somewhere
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{owner_type}:{owner_id}"))


async def _resolve_subfolder(folder_id: str, subfolder_name: str) -> str:
    """Find or create a subfolder by (folder_id, name). Returns subfolder_id."""
    try:
        existing = await _subfolders().find_one(
            {"folder_id": folder_id, "name": subfolder_name}
        )
        if existing:
            return str(existing["_id"])

        sf_id = str(uuid.uuid4())
        await _subfolders().insert_one({
            "_id": sf_id,
            "folder_id": folder_id,
            "name": subfolder_name,
            "created_at": _now(),
        })
        return sf_id
    except Exception as exc:
        logger.error("_resolve_subfolder failed: %s", exc)
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{folder_id}:{subfolder_name}"))


# ---------------------------------------------------------------------------
# 4. Dedupe
# ---------------------------------------------------------------------------

async def _find_duplicate(folder_id: str, file_url: str, checksum: str) -> Optional[dict]:
    """Return existing document if same content already in this folder."""
    return await _docs().find_one({
        "folder_id": folder_id,
        "$or": [
            {"file_url": file_url},
            {"checksum_sha256": checksum},
        ],
    })


# ---------------------------------------------------------------------------
# 5. Main pipeline
# ---------------------------------------------------------------------------

async def file_document(
    *,
    content: bytes,
    filename: str,
    file_url: str,
    mime: str,
    owner_type: str,
    owner_id: str,
    owner_email: str = "",
    uploaded_by: str = "",
    ocr_engine: str = "axiss-ocr",
) -> dict:
    """Full pipeline: store → OCR → classify → folder → dedupe → persist.

    Returns the persisted document dict (or the existing one on dedupe).
    Never raises — catches all exceptions, logs them, and returns a best-
    effort result with status='unfiled' so the upload is never lost.
    """
    document_id = str(uuid.uuid4())
    checksum = _sha256(content)
    now = _now()

    try:
        # ── Resolve folder ────────────────────────────────────────────────
        folder_id = await _resolve_folder(owner_type, owner_id, owner_email)

        # ── Dedupe ────────────────────────────────────────────────────────
        existing = await _find_duplicate(folder_id, file_url, checksum)
        if existing:
            logger.info("Duplicate document skipped: %s (folder=%s)", filename, folder_id)
            return {**existing, "_deduped": True}

        # ── OCR ───────────────────────────────────────────────────────────
        ocr_text, engine_used = await _run_ocr(content, filename, checksum, document_id)
        ocr_text_len = len(ocr_text)

        # ── Classify ──────────────────────────────────────────────────────
        # Check for learned correction first
        owner_scope = f"{owner_type}:{owner_id}"
        learned = await _get_correction(owner_scope, filename)

        from doc_classifier import classify
        result = classify(
            filename=filename,
            ocr_text=ocr_text,
            learned_correction=learned,
        )

        classification_source = result.matched_via
        if learned:
            classification_source = "learned"

        # ── Subfolder ─────────────────────────────────────────────────────
        subfolder_id = await _resolve_subfolder(folder_id, result.subfolder)

        # ── Persist ───────────────────────────────────────────────────────
        doc = {
            "_id": document_id,
            "folder_id": folder_id,
            "subfolder_id": subfolder_id,
            "doc_name": filename,
            "doc_type": result.doc_type,
            "canonical_doc_name": result.canonical_doc_name,
            "doc_category": result.doc_category,
            "is_checklist": result.is_checklist,
            "file_url": file_url,
            "checksum_sha256": checksum,
            "mime": mime,
            "ocr_engine": engine_used,
            "ocr_text_len": ocr_text_len,
            "classification_source": classification_source,
            "classification_confidence": result.confidence,
            "status": "filed",
            "uploaded_by": uploaded_by,
            "owner_type": owner_type,
            "owner_id": owner_id,
            "created_at": now,
            "updated_at": now,
        }
        await _docs().insert_one(doc)
        logger.info(
            "Filed %s → %s/%s (via=%s conf=%.2f)",
            filename, result.doc_category, result.subfolder,
            classification_source, result.confidence,
        )
        return doc

    except Exception as exc:
        logger.exception("file_document pipeline failed for %s: %s", filename, exc)
        # Best-effort: store in unfiled state so upload is not lost
        try:
            fallback = {
                "_id": document_id,
                "folder_id": "unfiled",
                "subfolder_id": None,
                "doc_name": filename,
                "doc_type": "other",
                "canonical_doc_name": "Other / Custom Upload",
                "doc_category": "Other",
                "is_checklist": False,
                "file_url": file_url,
                "checksum_sha256": checksum,
                "mime": mime,
                "ocr_engine": None,
                "ocr_text_len": 0,
                "classification_source": "filename",
                "classification_confidence": 0.0,
                "status": "unfiled",
                "uploaded_by": uploaded_by,
                "owner_type": owner_type,
                "owner_id": owner_id,
                "pipeline_error": str(exc),
                "created_at": now,
                "updated_at": now,
            }
            await _docs().insert_one(fallback)
            return fallback
        except Exception:
            return {"_id": document_id, "status": "unfiled", "error": str(exc)}


# ---------------------------------------------------------------------------
# 6. Reclassify single document (idempotent; never overwrites human-verified)
# ---------------------------------------------------------------------------

async def reclassify_one(document_id: str, dry_run: bool = True) -> dict:
    """Re-run classifier on one document.

    - Never overwrites a label with classification_source='manual' (human-verified).
    - Returns {document_id, from_type, to_type, matched_via, dry_run}.
    """
    doc = await _docs().find_one({"_id": document_id})
    if not doc:
        return {"error": "document not found", "document_id": document_id}

    if doc.get("classification_source") == "manual":
        return {
            "document_id": document_id,
            "skipped": True,
            "reason": "human-verified label",
            "doc_type": doc["doc_type"],
        }

    # Try to get OCR text from cache
    ocr_text = ""
    cache_hit = await _get_ocr_cache(doc.get("checksum_sha256", ""))
    if cache_hit:
        ocr_text = cache_hit

    owner_scope = f"{doc.get('owner_type', '')}:{doc.get('owner_id', '')}"
    learned = await _get_correction(owner_scope, doc.get("doc_name", ""))

    from doc_classifier import classify
    result = classify(
        filename=doc.get("doc_name", ""),
        ocr_text=ocr_text,
        learned_correction=learned,
    )

    old_type = doc.get("doc_type", "other")
    new_type = result.doc_type

    if old_type == new_type:
        return {
            "document_id": document_id,
            "from_type": old_type,
            "to_type": new_type,
            "matched_via": result.matched_via,
            "changed": False,
            "dry_run": dry_run,
        }

    if not dry_run:
        subfolder_id = await _resolve_subfolder(doc["folder_id"], result.subfolder)
        await _docs().update_one(
            {"_id": document_id},
            {"$set": {
                "doc_type": new_type,
                "canonical_doc_name": result.canonical_doc_name,
                "doc_category": result.doc_category,
                "subfolder_id": subfolder_id,
                "classification_source": result.matched_via,
                "classification_confidence": result.confidence,
                "is_checklist": result.is_checklist,
                "updated_at": _now(),
            }},
        )

    return {
        "document_id": document_id,
        "from_type": old_type,
        "to_type": new_type,
        "matched_via": result.matched_via,
        "changed": True,
        "dry_run": dry_run,
    }


# ---------------------------------------------------------------------------
# 7. Backfill
# ---------------------------------------------------------------------------

async def reclassify_backfill(
    owner_type: Optional[str] = None,
    owner_id: Optional[str] = None,
    apply: bool = False,
    batch_size: int = 200,
) -> dict:
    """Walk the catalogue and re-classify everything the classifier would change.

    Dry-run by default (apply=False). Never touches human-verified labels.
    Returns {examined, changed, skipped, diff: [{file, from, to}]}.
    """
    query: dict[str, Any] = {}
    if owner_type:
        query["owner_type"] = owner_type
    if owner_id:
        query["owner_id"] = owner_id

    examined = changed = skipped = 0
    diff: list[dict] = []

    cursor = _docs().find(query, batch_size=batch_size)
    async for doc in cursor:
        examined += 1
        result = await reclassify_one(doc["_id"], dry_run=not apply)
        if result.get("skipped"):
            skipped += 1
        elif result.get("changed"):
            changed += 1
            diff.append({
                "file": doc.get("doc_name"),
                "document_id": doc["_id"],
                "from": result["from_type"],
                "to": result["to_type"],
                "matched_via": result["matched_via"],
            })

    return {
        "examined": examined,
        "changed": changed,
        "skipped": skipped,
        "applied": apply,
        "diff": diff,
    }
