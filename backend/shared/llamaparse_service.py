"""LlamaParse Service — Structured document parsing using LlamaParse API.

Converts PDFs, DOCX, images, and other documents into structured markdown
for RAG ingestion, resume parsing, and document analysis.

Free tier: 1,000 pages/day. Requires LLAMA_CLOUD_API_KEY env var.

Fallback: Falls through to PyPDF2 text extraction if LlamaParse unavailable.
"""

import io
import logging
import os
from base64 import b64encode

logger = logging.getLogger("wehive.llamaparse")

LLAMA_CLOUD_API_KEY = os.environ.get("LLAMA_CLOUD_API_KEY", "")


async def parse_document(file_bytes: bytes, filename: str, content_type: str = "application/pdf") -> dict:
    """Parse a document into structured markdown using LlamaParse."""

    if not LLAMA_CLOUD_API_KEY:
        return await _fallback_parse(file_bytes, filename, content_type)

    try:
        import httpx

        file_b64 = b64encode(file_bytes).decode("utf-8")

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.cloud.llamaindex.ai/api/parsing/upload",
                headers={
                    "Authorization": f"Bearer {LLAMA_CLOUD_API_KEY}",
                    "Accept": "application/json",
                },
                json={
                    "file": file_b64,
                    "filename": filename,
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "method": "llamaparse",
                    "markdown": data.get("markdown", ""),
                    "pages": data.get("pages", []),
                    "job_id": data.get("id", ""),
                    "filename": filename,
                }

            logger.warning("LlamaParse API returned %s: %s", resp.status_code, resp.text[:200])
            return await _fallback_parse(file_bytes, filename, content_type)

    except Exception as e:
        logger.debug("LlamaParse failed, using fallback: %s", e)
        return await _fallback_parse(file_bytes, filename, content_type)


async def _fallback_parse(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Fallback parser using PyPDF2 for PDFs, raw text for others."""

    text = ""
    method = "raw"

    if content_type == "application/pdf" or (filename and filename.endswith(".pdf")):
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    pages.append(extracted)
            text = "\n\n".join(pages)
            method = "pypdf2"
        except ImportError:
            text = file_bytes.decode("utf-8", errors="ignore")[:50000]
            method = "utf8_decode"
        except Exception:
            text = file_bytes.decode("utf-8", errors="ignore")[:50000]
            method = "utf8_decode_fallback"
    else:
        try:
            text = file_bytes.decode("utf-8", errors="ignore")[:50000]
        except Exception:
            text = ""

    return {
        "ok": True,
        "method": method,
        "markdown": text,
        "pages": [],
        "filename": filename,
        "note": "LlamaParse not available — set LLAMA_CLOUD_API_KEY for structured parsing",
    }


async def parse_and_structure(file_bytes: bytes, filename: str) -> dict:
    """Parse and then use LLM to restructure the content into a clean format."""

    parsed = await parse_document(file_bytes, filename)

    if parsed.get("markdown") and len(parsed["markdown"]) > 500:
        try:
            from ai_marketplace import marketplace

            response = await marketplace.chat(
                messages=[
                    {"role": "system", "content": (
                        "Clean and structure this document content. Remove noise, fix OCR errors, "
                        "and format it as clean markdown with proper headings, lists, and paragraphs. "
                        "Keep all factual information intact. Return only the cleaned markdown."
                    )},
                    {"role": "user", "content": parsed["markdown"][:8000]},
                ],
                max_tokens=4096,
            )
            cleaned = response.get("content", parsed["markdown"]) if isinstance(response, dict) else str(response)
            parsed["markdown_cleaned"] = cleaned
            parsed["method"] += "+llm_cleaned"
        except Exception as e:
            logger.debug("LLM cleaning failed: %s", e)
            parsed["markdown_cleaned"] = parsed["markdown"][:4000]

    return parsed


def llamaparse_status() -> dict:
    return {
        "available": bool(LLAMA_CLOUD_API_KEY),
        "free_tier": True,
        "daily_limit_pages": 1000,
        "fallback_available": True,
        "fallback_methods": ["pypdf2", "utf8_decode"],
    }
