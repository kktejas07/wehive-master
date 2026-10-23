"""Official UK visa processing times for applications made outside the UK, from
GOV.UK "Visa processing times: applications outside the UK", read through the
public GOV.UK Content API (no key). These are Home Office service standards
("3 weeks", "12 weeks"), the same for every country.
"""
from __future__ import annotations

import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

PAGE_PATH = "/guidance/visa-processing-times-applications-outside-the-uk"
PAGE_URL = "https://www.gov.uk" + PAGE_PATH
API_URL = "https://www.gov.uk/api/content" + PAGE_PATH
SOURCE_NAME = "UK Home Office (GOV.UK)"

# our corridor visa id -> route name as written on the page
ROUTES = {"visitor_uk": "Standard Visitor", "student_uk": "Student", "work_uk": "Skilled Worker"}
_TIME = r"(?P<t>\d+\s+(?:working\s+)?(?:days?|weeks?|months?))"


def _route_time(soup: BeautifulSoup, text: str, route: str) -> Optional[str]:
    # 1. A table row whose first cell is exactly the route name.
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
        if len(cells) >= 2 and cells[0].strip().lower() == route.lower():
            m = re.search(_TIME, " ".join(cells[1:]), re.I)
            if m:
                return m.group("t")
    # 2. Prose / list: the route name, then a time shortly after it.
    #    "Student" must not match "Child Student".
    m = re.search(r"(?<!Child )\b" + re.escape(route) + r"\b[^0-9]{0,120}?" + _TIME, text, re.I)
    return m.group("t") if m else None


def parse(content: dict) -> dict:
    """GOV.UK Content API item -> {"updated": "2026-..", "visa": {"visitor_uk": "3 weeks", ...}}"""
    details = content.get("details") or {}
    body = details.get("body") or ""
    if isinstance(body, list):  # some formats send [{content_type, content}]
        body = next((b.get("content", "") for b in body if b.get("content_type") == "text/html"), "")
    soup = BeautifulSoup(body, "html.parser")
    text = soup.get_text("\n")
    visa = {}
    for ours, route in ROUTES.items():
        value = _route_time(soup, text, route)
        if value:
            visa[ours] = re.sub(r"\s+", " ", value).strip()
    updated = (content.get("public_updated_at") or "")[:10] or None
    return {"updated": updated, "visa": visa}


async def fetch() -> dict:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True,
                                 headers={"User-Agent": "WeHive/1.0 (+https://wehive.co.in)"}) as client:
        resp = await client.get(API_URL)
        resp.raise_for_status()
    return parse(resp.json())
