"""Index REJECTED application rejection reasons into the wehive_rejections Qdrant collection.

Called at server startup (best-effort). Skips if Qdrant or MongoDB unavailable.
Marks each processed document with rejection_qdrant_indexed=True so reruns are cheap.
"""
from __future__ import annotations
import logging

logger = logging.getLogger("wehive.rejections_indexer")


async def index_rejection_patterns() -> None:
    try:
        from db import db as _db
        from qdrant_store import upsert_documents, init_qdrant_collections
        await init_qdrant_collections()
        cursor = _db["applications"].find(
            {"status": "rejected", "rejection_qdrant_indexed": {"$ne": True}},
        ).limit(200)
        batch = []
        ids_seen = []
        async for app_doc in cursor:
            reason = app_doc.get("rejection_reason") or app_doc.get("admin_notes") or ""
            if not reason:
                continue
            country = app_doc.get("country_code") or app_doc.get("country") or ""
            visa_type = app_doc.get("visa_type") or ""
            text = f"Rejection reason for {country} {visa_type} application: {reason}"
            batch.append({
                "id": str(app_doc["_id"]),
                "text": text,
                "metadata": {
                    "country_code": country,
                    "visa_type": visa_type,
                    "source": "rejected_application",
                    "application_id": str(app_doc["_id"]),
                },
            })
            ids_seen.append(app_doc["_id"])
        if batch:
            await upsert_documents("wehive_rejections", batch)
            await _db["applications"].update_many(
                {"_id": {"$in": ids_seen}},
                {"$set": {"rejection_qdrant_indexed": True}},
            )
            logger.info("Indexed %d rejection patterns into Qdrant", len(batch))
    except Exception as exc:
        logger.debug("Rejections indexer skipped: %s", exc)
