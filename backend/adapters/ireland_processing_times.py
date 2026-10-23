"""Official Ireland visa processing times for applications made in India, from
the Embassy of Ireland, New Delhi ("Processing times and decisions", ireland.ie).

The page has one HTML table: Visa category | Sub-category | First instance | Appeal,
e.g. "Study | | 4-8 weeks | 6 calendar months" and "Visit (short stay) | | 6-8 weeks | N/A",
with an "Update: 17 September 2026" line. All Indian applications are decided in
New Delhi, whichever VFS centre they are lodged at.
"""
from __future__ import annotations

import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

PAGE_URL = "https://www.ireland.ie/en/india/newdelhi/services/visas/processing-times-and-decisions/"
ALT_URL = "https://api.ireland.ie/en/india/newdelhi/services/visas/processing-times-and-decisions/"
SOURCE_NAME = "Embassy of Ireland, New Delhi"

# our corridor visa id -> how the visa category cell starts
CATEGORIES = {"visitor_ie": "visit", "student_ie": "study"}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\xa0", " ")).strip()


def parse(html: str) -> dict:
    """-> {"updated": "17 September 2026" | None, "visa": {"student_ie": "4-8 weeks", ...}}"""
    soup = BeautifulSoup(html, "html.parser")
    m = re.search(r"Update[d]?:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})", soup.get_text(" "))
    out: dict = {"updated": m.group(1) if m else None, "visa": {}}
    for table in soup.find_all("table"):
        col = None
        for row in table.find_all("tr"):
            cells = [_norm(c.get_text(" ", strip=True)) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            if col is None:
                col = next((i for i, h in enumerate(cells) if "first instance" in h.lower()), None)
                continue
            if col >= len(cells):
                continue
            category = cells[0].lower()
            value = cells[col]
            if not re.search(r"\d", value):
                continue
            for ours, prefix in CATEGORIES.items():
                if category.startswith(prefix) and ours not in out["visa"]:
                    out["visa"][ours] = value
        if out["visa"]:
            break
    return out


async def fetch() -> dict:
    last_error: Optional[Exception] = None
    async with httpx.AsyncClient(timeout=30, follow_redirects=True,
                                 headers={"User-Agent": "WeHive/1.0 (+https://wehive.co.in)"}) as client:
        for url in (PAGE_URL, ALT_URL):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                data = parse(resp.text)
                if data["visa"]:
                    return data
            except Exception as e:  # try the other host
                last_error = e
    if last_error:
        raise last_error
    return {"updated": None, "visa": {}}
