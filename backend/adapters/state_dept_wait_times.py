"""Official US visa appointment wait times for Indian posts, from the US State
Department's Global Visa Wait Times page (travel.state.gov, updated monthly).

The page is one HTML table: "City/Post" then columns such as
"Interview Required (B1/B2) Next available appointment",
"Interview Required (F,M,J) Next available appointment" and
"Interview Required Petition-Base (H,L,O,P,Q) Next available appointment".
Columns are found by their header words, not position, so a reordered or added
column doesn't break the parse. Values are kept as published ("10.5 Months",
"< 0.5 Month", "NA") and also converted to days for comparisons.

This is wait time to the next available appointment, not live slot openings.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("wehive.adapters.state_dept")

OFFICIAL_URL = ("https://travel.state.gov/content/travel/en/us-visas/"
                "visa-information-resources/global-visa-wait-times.html")
SOURCE_LABEL = "US State Department"

# our consulate id -> how the post's row starts on the page ("Mumbai (Bombay)", "Chennai (Madras)")
POSTS = {"mumbai": "mumbai", "delhi": "new delhi", "chennai": "chennai",
         "kolkata": "kolkata", "hyderabad": "hyderabad"}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\xa0", " ")).strip().lower()


def _visa_types_for(header: str) -> list[str]:
    """Which of our visa types a column feeds. Only 'next available' columns are used."""
    h = _norm(header).replace(" ", "")
    if "nextavailable" not in h:
        return []
    if "(b1/b2)" in h:
        return ["b1b2"]
    if "(f,m,j)" in h:
        return ["f1", "j1"]
    if "(h,l,o,p,q)" in h:
        return ["h1b", "h4", "l1"]
    return []


def wait_days(value: Optional[str]) -> Optional[int]:
    """'10.5 Months' -> 315, '< 0.5 Month' -> 15, '12 Days' -> 12, 'NA' -> None."""
    v = _norm(value or "")
    if not v or v in ("na", "n/a", "-", "—"):
        return None
    if "same day" in v:
        return 0
    m = re.search(r"(\d+(?:\.\d+)?)\s*(month|day|week)", v)
    if not m:
        return None
    n, unit = float(m.group(1)), m.group(2)
    return round(n * {"month": 30, "week": 7, "day": 1}[unit])


def parse(html: str) -> dict:
    """-> {"updated": "21-OCT-2026" | None, "posts": {consulate_id: {visa_type: "1 Month"}}}"""
    soup = BeautifulSoup(html, "html.parser")
    m = re.search(r"Last updated:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})", soup.get_text(" "))
    out: dict = {"updated": m.group(1).upper() if m else None, "posts": {}}

    for table in soup.find_all("table"):
        columns: dict[int, list[str]] = {}
        for row in table.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            if not columns and "city/post" in _norm(cells[0]):
                columns = {i: vt for i, h in enumerate(cells) if (vt := _visa_types_for(h))}
                continue
            if not columns:
                continue
            city = _norm(cells[0])
            cid = next((k for k, name in POSTS.items() if city.startswith(name)), None)
            if not cid:
                continue
            values = {}
            for i, vts in columns.items():
                if i < len(cells) and wait_days(cells[i]) is not None:
                    for vt in vts:
                        values[vt] = re.sub(r"\s+", " ", cells[i]).strip()
            if values:
                out["posts"][cid] = values
        if out["posts"]:
            break
    return out


async def fetch() -> dict:
    """Download and parse the official page. Raises on HTTP errors."""
    async with httpx.AsyncClient(timeout=30, follow_redirects=True,
                                 headers={"User-Agent": "WeHive/1.0 (+https://wehive.co.in)"}) as client:
        resp = await client.get(OFFICIAL_URL)
        resp.raise_for_status()
    data = parse(resp.text)
    if not data["posts"]:
        logger.warning("State Dept wait-times page parsed with no Indian posts; layout may have changed")
    return data
