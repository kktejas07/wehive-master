"""Multi-language support for university data — translation storage and retrieval."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from db import db

router = APIRouter(prefix="/i18n", tags=["i18n"])

translations_col = db["translations"]

SUPPORTED_LOCALES = {"en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru", "tr"}


class TranslationSet(BaseModel):
    locale: str
    fields: dict[str, str]


@router.get("/universities/{university_id}")
async def get_university_translations(
    university_id: str,
    locale: Optional[str] = Query(None),
):
    if locale:
        if locale not in SUPPORTED_LOCALES:
            raise HTTPException(400, f"Unsupported locale. Supported: {', '.join(sorted(SUPPORTED_LOCALES))}")
        doc = await translations_col.find_one({"entity_type": "university", "entity_id": university_id})
        if not doc:
            return {"university_id": university_id, "locale": locale, "fields": {}}
        translations = doc.get("translations", {})
        return {"university_id": university_id, "locale": locale, "fields": translations.get(locale, {})}

    doc = await translations_col.find_one(
        {"entity_type": "university", "entity_id": university_id},
        {"_id": 0, "translations": 1},
    )
    return {"university_id": university_id, "translations": (doc or {}).get("translations", {})}


@router.put("/universities/{university_id}")
async def set_university_translations(
    university_id: str,
    body: TranslationSet,
    admin=Depends(get_current_admin_flex),
):
    locale = body.locale.lower()
    if locale not in SUPPORTED_LOCALES:
        raise HTTPException(400, f"Unsupported locale. Supported: {', '.join(sorted(SUPPORTED_LOCALES))}")

    await translations_col.update_one(
        {"entity_type": "university", "entity_id": university_id},
        {"$set": {f"translations.{locale}": body.fields, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True, "university_id": university_id, "locale": locale, "fields_count": len(body.fields)}


@router.get("/locales")
async def list_locales():
    return {"locales": sorted(SUPPORTED_LOCALES)}
