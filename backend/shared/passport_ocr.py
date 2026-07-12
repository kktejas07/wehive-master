"""Passport OCR — Offline MRZ extraction using PassportEye.

Zero API cost, no internet required. Extracts fields from machine-readable
zone (MRZ) of passports and ID documents.

Fields extracted: surname, given_names, country, nationality, date_of_birth,
sex, document_type, document_number, expiration_date, personal_number, mrz_raw.

Graceful degradation: falls back to LLM-based extraction via ai_marketplace
if PassportEye is not installed or fails.
"""

import base64
import io
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("wehive.passport_ocr")

PASSPORTEYE_AVAILABLE = False
try:
    from passporteye import read_mrz
    PASSPORTEYE_AVAILABLE = True
except ImportError:
    logger.info("PassportEye not installed — offline MRZ extraction unavailable. pip install passporteye")


def extract_mrz_from_image(image_bytes: bytes) -> Optional[dict]:
    """Extract MRZ data from passport/travel-document image using PassportEye."""
    if not PASSPORTEYE_AVAILABLE:
        return None

    try:
        img = io.BytesIO(image_bytes)
        mrz = read_mrz(img, save_roi=False)

        if not mrz:
            return None

        return {
            "surname": mrz.surname or "",
            "given_names": mrz.names or "",
            "full_name": f"{mrz.names or ''} {mrz.surname or ''}".strip(),
            "country": mrz.country or "",
            "nationality": mrz.nationality or "",
            "date_of_birth": mrz.date_of_birth or "",
            "sex": mrz.sex or "",
            "document_type": mrz.document_type or "",
            "document_number": mrz.number or "",
            "expiration_date": mrz.expiration_date or "",
            "personal_number": mrz.personal_number or "",
            "mrz_raw": str(mrz) if hasattr(mrz, '__str__') else "",
            "valid_score": getattr(mrz, 'valid_score', 0) if mrz else 0,
            "method": "passporteye",
        }

    except Exception as e:
        logger.debug("PassportEye extraction failed: %s", e)
        return None


def extract_mrz_from_b64(image_b64: str) -> Optional[dict]:
    """Extract MRZ from base64-encoded image."""
    try:
        image_bytes = base64.b64decode(image_b64)
        return extract_mrz_from_image(image_bytes)
    except Exception as e:
        logger.debug("Base64 decode failed: %s", e)
        return None


async def extract_with_llm_fallback(image_b64: str) -> dict:
    """Extract passport fields using PassportEye first, then LLM fallback."""

    result = extract_mrz_from_b64(image_b64)
    if result:
        return result

    logger.info("PassportEye failed or unavailable — falling back to LLM extraction")
    try:
        from ai_marketplace import marketplace

        response = await marketplace.chat_with_image(
            system_prompt=(
                "You are a passport OCR system. Extract all visible fields from this passport image. "
                "Return JSON with: surname, given_names, full_name, country, nationality, "
                "date_of_birth, sex, document_type, document_number, expiration_date, mrz_raw. "
                "Only return JSON, no other text. Use null for fields you cannot read. "
                "MRZ is the machine-readable zone at the bottom — extract line 1 and line 2."
            ),
            user_prompt="Extract passport fields from this image.",
            image_b64=image_b64,
            mime="image/png",
            max_tokens=800,
        )

        content = response.get("content", "{}") if isinstance(response, dict) else "{}"
        try:
            import json
            parsed = json.loads(content)
            parsed["method"] = "llm"
            return parsed
        except Exception:
            return {"method": "llm", "raw_response": content[:500]}

    except Exception as e:
        logger.error("LLM passport extraction failed: %s", e)
        return {"method": "none", "error": str(e)}


async def validate_passport_fields(fields: dict) -> dict:
    """Validate extracted passport fields and flag issues."""
    issues = []

    if not fields.get("surname") and not fields.get("given_names"):
        issues.append("Name not extracted")
    if not fields.get("document_number"):
        issues.append("Document number not extracted")
    if not fields.get("date_of_birth"):
        issues.append("Date of birth not extracted")
    if not fields.get("expiration_date"):
        issues.append("Expiration date not extracted")

    exp_date = fields.get("expiration_date", "")
    is_expiring_soon = False
    is_expired = False
    if exp_date and len(exp_date) >= 6:
        try:
            exp = datetime.strptime(exp_date[:6], "%y%m%d")
            now = datetime.utcnow()
            is_expired = exp < now
            is_expiring_soon = not is_expired and (exp - now).days < 180
        except Exception:
            pass

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "is_expired": is_expired,
        "is_expiring_soon": is_expiring_soon,
        "fields_extracted": sum(1 for v in fields.values() if v),
        "checked_at": datetime.utcnow().isoformat(),
    }
