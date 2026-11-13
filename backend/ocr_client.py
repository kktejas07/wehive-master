"""OCR client — consumes the shared axiss-ocr service.

Do NOT install tesseract, paddleocr, rapidocr or any OCR dependency here.
Point WeHive at the internal service:
  OCR_URL=http://axiss-ocr:8000/ocr
  OCR_KEY=<service key>
  OCR_TEXT_LAYERS=auto   (default; digital PDFs cost nothing)
  OCR_TIMEOUT=60

The service answers open when no keys are configured; always set OCR_KEY in
production so /usage attributes calls per project and one bad caller can be
revoked.

Contract
--------
POST multipart `file`, optional `lang`, `profile`, `text_layers`, `max_pages`,
`engine`.  Auth via `X-OCR-Key` (or `Authorization: Bearer`).
Response: {engine, pages, lines, text, profile, fields, structured}

Rules encoded here
------------------
1. Always send `text_layers=auto` — a digital PDF or docx costs nothing.
2. A failure NEVER fails the upload: log, return ("", error_str).
3. Read text from `text`, not from a concatenated dump.
4. Enforce request timeout (default 60 s) and honour OCR_TIMEOUT env.
5. Callers cache by checksum_sha256 — never OCR the same bytes twice.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("wehive.ocr_client")

OCR_URL = os.environ.get("OCR_URL", "http://axiss-ocr:8000/ocr").rstrip("/")
OCR_KEY = os.environ.get("OCR_KEY", "")
OCR_TEXT_LAYERS = os.environ.get("OCR_TEXT_LAYERS", "auto")
OCR_TIMEOUT = float(os.environ.get("OCR_TIMEOUT", "60"))

MIN_TEXT_CHARS = int(os.environ.get("OCR_MIN_TEXT_CHARS", "50"))


def is_configured() -> bool:
    """Return True when the OCR service URL is set (non-default or explicitly provided)."""
    return bool(OCR_URL)


async def extract_text(
    content: bytes,
    filename: str,
    lang: str = "eng",
    profile: Optional[str] = None,
    max_pages: int = 20,
) -> tuple[str, Optional[str]]:
    """Call the shared OCR service. Returns (text, error_or_None).

    Never raises — a failure returns ("", error_message) so the caller
    can store the document as 'unfiled' and classify from the filename alone.
    """
    if not is_configured():
        return "", "OCR service not configured (OCR_URL unset)"

    try:
        import httpx
    except ImportError:
        return "", "httpx not installed"

    headers: dict[str, str] = {}
    if OCR_KEY:
        headers["X-OCR-Key"] = OCR_KEY

    data: dict[str, str] = {
        "text_layers": OCR_TEXT_LAYERS,
        "lang": lang,
        "max_pages": str(max_pages),
    }
    if profile:
        data["profile"] = profile

    try:
        async with httpx.AsyncClient(timeout=OCR_TIMEOUT) as client:
            resp = await client.post(
                OCR_URL,
                data=data,
                files={"file": (filename, content)},
                headers=headers,
            )
        resp.raise_for_status()
        body = resp.json()
        text = body.get("text", "")
        return text, None
    except httpx.TimeoutException:
        logger.warning("OCR service timed out for %s", filename)
        return "", f"timeout after {OCR_TIMEOUT}s"
    except httpx.HTTPStatusError as exc:
        logger.warning("OCR service HTTP %s for %s: %s", exc.response.status_code, filename, exc)
        return "", f"http_{exc.response.status_code}"
    except Exception as exc:
        logger.warning("OCR service error for %s: %s", filename, exc)
        return "", str(exc)
