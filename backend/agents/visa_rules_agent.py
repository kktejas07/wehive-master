"""Visa Rules Agent: keeps each country's visa rules and decision times current.

Runs once a day from the hourly agent loop (and on demand from the admin
Countries tab). Each run:

1. Re-reads the visa requirements for Indian passport holders (Wikipedia's
   "Visa requirements for Indian citizens", which is updated as rules change)
   and classifies each country: visa-free, on arrival, eVisa, visa, restricted.
2. Compares with what the site shows now (visa_rules + earlier agent changes).
3. Applies the changes when the run looks healthy: at least MIN_ROWS countries
   understood and no more than MAX_AUTO_CHANGES changes at once. A run with more
   changes is held for an admin to apply, since that usually means the source
   page was edited heavily or our parser misread it.
4. Refreshes the official decision times (US, Canada, UK, Ireland).

Every change is logged (db.visa_rule_changes) with the source wording.
Codes in visa_rules.PINNED are decided in code and never changed by the agent.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx
from bs4 import BeautifulSoup

import visa_rules as vr

logger = logging.getLogger("wehive.agents.visa_rules")

SOURCE_URL = vr.REQUIREMENTS_SOURCE[1]
API_URL = "https://en.wikipedia.org/api/rest_v1/page/html/Visa_requirements_for_Indian_citizens"
RUN_EVERY_HOURS = 24
MIN_ROWS = 150
MAX_AUTO_CHANGES = 10

# Wikipedia row names that differ from REST Countries names.
ALIASES = {
    "australia and territories": "AU", "united kingdom and crown dependencies": "GB",
    "czech republic": "CZ", "côte d'ivoire": "CI", "cote d'ivoire": "CI", "ivory coast": "CI",
    "democratic republic of the congo": "CD", "republic of the congo": "CG", "cape verde": "CV",
    "timor-leste": "TL", "east timor": "TL", "eswatini": "SZ", "vatican city": "VA",
    "north korea": "KP", "south korea": "KR", "micronesia": "FM", "são tomé and príncipe": "ST",
    "the bahamas": "BS", "bahamas": "BS", "the gambia": "GM", "gambia": "GM", "myanmar": "MM",
    "russia": "RU", "turkey": "TR", "palestine": "PS", "state of palestine": "PS", "kosovo": "XK",
    "united states": "US", "united arab emirates": "AE", "north macedonia": "MK",
}


def _norm(text: str) -> str:
    text = re.sub(r"\[[^\]]*\]", "", text or "")  # footnotes [1], [note 2]
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def name_index() -> dict:
    """lowercase country name -> ISO-2, from the REST Countries cache shipped with the app."""
    idx = dict(ALIASES)
    cache = Path(__file__).resolve().parent.parent / ".countries_cache.json"
    try:
        for r in json.loads(cache.read_text()):
            iso = r.get("cca2")
            names = r.get("name") or {}
            for n in (names.get("common"), names.get("official")):
                if n and iso:
                    idx.setdefault(n.lower(), iso)
    except Exception as e:
        logger.warning("Country name cache unavailable: %s", e)
    return idx


def classify_text(text: str) -> Optional[str]:
    """Wikipedia wording -> visa_rules requirement code (None if unclear)."""
    t = _norm(text).lower()
    if not t:
        return None
    if any(w in t for w in ("admission restricted", "admission refused", "entry restricted", "banned")):
        return vr.R
    if t.startswith(("visa not required", "freedom of movement", "visa-free", "visa free", "visa waiver")):
        return vr.F
    online = bool(re.search(r"\be-?visa\b|online visa|electronic travel|\beta\b|e-voa|"
                            r"pre-arrival registration|electronic border", t))
    on_arrival = "on arrival" in t
    if online and on_arrival:
        return vr.EA
    if on_arrival or "entry permit" in t or "visitor's permit" in t:
        return vr.A
    if online:
        return vr.E
    if "visa required" in t:
        return vr.V
    return None


def parse(html: str, names: Optional[dict] = None) -> dict:
    """-> {"rows": n, "requirements": {iso2: (code, wording)}, "unmatched": [...]}"""
    names = names or name_index()
    soup = BeautifulSoup(html, "html.parser")
    out: dict = {"rows": 0, "requirements": {}, "unmatched": []}
    for table in soup.find_all("table"):
        header = [_norm(c.get_text(" ")).lower() for c in (table.find("tr") or soup.new_tag("tr")).find_all(["th", "td"])]
        if not header or "country" not in header[0] or not any("visa requirement" in h for h in header):
            continue
        col = next(i for i, h in enumerate(header) if "visa requirement" in h)
        for row in table.find_all("tr")[1:]:
            cells = row.find_all(["th", "td"])
            if len(cells) <= col:
                continue
            country = _norm(cells[0].get_text(" "))
            wording = _norm(cells[col].get_text(" "))
            code = classify_text(wording)
            iso = names.get(country.lower())
            if not iso:
                out["unmatched"].append(country)
                continue
            if code:
                out["rows"] += 1
                out["requirements"].setdefault(iso, (code, wording))
    return out


async def fetch() -> dict:
    async with httpx.AsyncClient(timeout=40, follow_redirects=True, headers={
        "User-Agent": "WeHiveVisaRulesAgent/1.0 (+https://wehive.co.in; info@wehive.co.in)",
    }) as client:
        resp = await client.get(API_URL)
        resp.raise_for_status()
    return parse(resp.text)


def diff(parsed: dict) -> list[dict]:
    """Changes between the source and what the site shows now."""
    changes = []
    for iso, (code, wording) in sorted(parsed["requirements"].items()):
        if iso in vr.PINNED or iso in vr.TERRITORIES or iso in vr.OWN_VISA_TERRITORIES:
            continue
        current = vr.current_requirement(iso)
        if current != code:
            changes.append({"iso2": iso, "old": current, "new": code, "wording": wording})
    return changes


async def run(force: bool = False, trigger: str = "scheduler") -> dict:
    from db import db
    meta_col, changes_col, overrides_col = db["visa_rules_agent"], db["visa_rule_changes"], db["visa_rule_overrides"]
    meta = await meta_col.find_one({"_id": "meta"}) or {}
    last = meta.get("last_run_at")
    if not force and last and datetime.utcnow() - last < timedelta(hours=RUN_EVERY_HOURS):
        return {"skipped": "ran recently"}

    await vr.refresh_overrides(force=True)
    result: dict = {"trigger": trigger, "started_at": datetime.utcnow()}
    try:
        parsed = await fetch()
    except Exception as e:
        logger.warning("Visa rules source unavailable: %s", e)
        result.update(status="source_error", error=str(e)[:200])
        await meta_col.update_one({"_id": "meta"}, {"$set": {"last_run_at": datetime.utcnow(), "last_result": result}}, upsert=True)
        return result

    changes = diff(parsed)
    healthy = parsed["rows"] >= MIN_ROWS
    auto = healthy and len(changes) <= MAX_AUTO_CHANGES
    now = datetime.utcnow()
    for c in changes:
        status = "applied" if auto else "held"
        await changes_col.insert_one({"_id": str(uuid.uuid4()), **c, "status": status, "detected_at": now,
                                      "source": SOURCE_URL})
        if auto:
            await overrides_col.update_one({"_id": c["iso2"]}, {"$set": {
                "requirement": c["new"], "wording": c["wording"], "updated_at": now, "by": "visa_rules_agent"}},
                upsert=True)
    if auto and changes:
        await vr.refresh_overrides(force=True)

    try:  # official decision times (US / Canada / UK / Ireland)
        import official_times
        from slot_monitor import refresh_official_wait_times
        result["official_times"] = await official_times.refresh_all()
        await refresh_official_wait_times()
    except Exception as e:
        logger.warning("Official times refresh failed: %s", e)

    result.update(status="ok" if healthy else "parse_suspect", rows=parsed["rows"],
                  unmatched=parsed["unmatched"][:20], changes=len(changes),
                  applied=len(changes) if auto else 0, held=0 if auto else len(changes))
    await meta_col.update_one({"_id": "meta"}, {"$set": {"last_run_at": now, "last_result": result}}, upsert=True)
    logger.info("Visa rules agent: %s", {k: result[k] for k in ("status", "rows", "changes", "applied", "held")})
    return result


async def apply_held(change_id: str) -> bool:
    """Admin approves a held change."""
    from db import db
    c = await db["visa_rule_changes"].find_one({"_id": change_id, "status": "held"})
    if not c:
        return False
    await db["visa_rule_overrides"].update_one({"_id": c["iso2"]}, {"$set": {
        "requirement": c["new"], "wording": c["wording"], "updated_at": datetime.utcnow(), "by": "admin"}}, upsert=True)
    await db["visa_rule_changes"].update_one({"_id": change_id}, {"$set": {"status": "applied"}})
    await vr.refresh_overrides(force=True)
    return True
