"""Extract text from user-uploaded documents and index into wehive_user_docs.

Supported formats:
  PDF  — pypdf text extraction
  JPEG/PNG/WEBP — OCR via pytesseract (if installed + tesseract binary present),
                  falling back to Ollama llava vision model, then skipped.

All operations are best-effort; this function never raises.
"""
from __future__ import annotations
import io
import logging

logger = logging.getLogger("wehive.user_doc_indexer")

_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}


def _ocr_with_tesseract(content: bytes) -> str:
    """Extract text from image bytes using pytesseract. Returns '' on any error."""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(content))
        return pytesseract.image_to_string(img).strip()
    except Exception as exc:
        logger.debug("pytesseract OCR failed: %s", exc)
        return ""


async def _ocr_with_ollama(content: bytes, filename: str) -> str:
    """Extract text from image using Ollama's llava vision model. Returns '' on any error."""
    try:
        import base64
        import httpx
        from config import OLLAMA_HOST
        b64 = base64.b64encode(content).decode()
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(f"{OLLAMA_HOST}/api/generate", json={
                "model": "llava",
                "prompt": (
                    "Extract all visible text from this document image. "
                    "Return only the raw text, no formatting, no commentary."
                ),
                "images": [b64],
                "stream": False,
            })
            r.raise_for_status()
            return r.json().get("response", "").strip()
    except Exception as exc:
        logger.debug("Ollama vision OCR failed: %s", exc)
        return ""


async def _extract_text(content: bytes, mime: str, filename: str) -> str:
    """Route to the right extractor based on MIME type."""
    if mime == "application/pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as exc:
            logger.debug("pypdf extraction failed: %s", exc)
            return ""

    if mime in _IMAGE_MIMES:
        text = _ocr_with_tesseract(content)
        if not text:
            text = await _ocr_with_ollama(content, filename)
        return text

    return ""


async def index_user_doc(
    *,
    doc_id: str,
    user_id: str,
    application_id: str,
    doc_type: str,
    filename: str,
    content: bytes,
    mime: str = "application/pdf",
) -> None:
    """Extract text and upsert into wehive_user_docs Qdrant collection. Best-effort; never raises."""
    try:
        text = await _extract_text(content, mime, filename)
        if not text:
            logger.debug("No text extracted from %s (%s) — skipping indexing", filename, mime)
            return
        from qdrant_store import upsert_documents
        await upsert_documents("wehive_user_docs", [{
            "id": doc_id,
            "text": text[:8000],
            "metadata": {
                "user_id": user_id,
                "application_id": application_id,
                "doc_type": doc_type,
                "filename": filename,
                "mime": mime,
                "source": "user_upload",
            },
        }])
        logger.debug("Indexed %s (%s) for user %s", filename, mime, user_id)
    except Exception as exc:
        logger.debug("User doc indexing skipped for %s: %s", doc_id, exc)
