"""Official Canada visa processing times for applicants in India, from IRCC's
"Check processing times" data (canada.ca), the same JSON the official tool loads.

Shape: {"visitor-outside-canada": {"IN": "29 days", ..., "lastupdated": "October 21, 2026"},
        "study": {...}, "work": {...}, ...}. Updated weekly by IRCC.
"""
from __future__ import annotations

import re
from typing import Optional

import httpx

DATA_URL = "https://www.canada.ca/content/dam/ircc/documents/json/data-ptime-en.json"
PAGE_URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/"
            "services/application/check-processing-times.html")
SOURCE_NAME = "IRCC, Government of Canada"

# our corridor visa id -> IRCC category
CATEGORIES = {"visitor_ca": "visitor-outside-canada", "student_ca": "study", "work_ca": "work"}


def _clean(value) -> Optional[str]:
    """'29 days' / '8 weeks' kept as published; 'Not enough data', 'N/A' -> None."""
    if not isinstance(value, str):
        return None
    v = re.sub(r"\s+", " ", value).strip()
    return v if re.match(r"^\d+(\.\d+)? (day|week|month)s?$", v, re.I) else None


def parse(data: dict, country: str = "IN") -> dict:
    """-> {"updated": "October 21, 2026" | None, "visa": {"visitor_ca": "29 days", ...}}"""
    out: dict = {"updated": None, "visa": {}}
    for ours, cat in CATEGORIES.items():
        block = data.get(cat)
        if not isinstance(block, dict):
            continue
        value = _clean(block.get(country))
        if value:
            out["visa"][ours] = value
            out["updated"] = out["updated"] or block.get("lastupdated") or data.get("lastupdated")
    return out


async def fetch(country: str = "IN") -> dict:
    # canada.ca answers 403 to clients that don't look like the official page's own request.
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; WeHive/1.0; +https://wehive.co.in)",
        "Accept": "application/json, text/plain, */*",
        "Referer": PAGE_URL,
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        resp = await client.get(DATA_URL)
        resp.raise_for_status()
    return parse(resp.json(), country)
