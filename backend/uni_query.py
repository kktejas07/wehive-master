"""Turn what students type into university filters, and relax filters instead of returning nothing.

Universities are stored with lowercase country codes ("us", "uk", "de"...; the UK is "uk",
not ISO "gb") and broad course categories ("stem", "business", "engineering", "medicine",
"arts", "social", "law"). Students type "United Kingdom", "GB", "computer science"...
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Optional

_UK = {"gb", "uk", "united kingdom", "great britain", "britain", "england", "scotland", "wales"}
_EXTRA = {"usa": "us", "america": "us", "united states of america": "us", "u.s.": "us", "u.s.a.": "us"}

CATEGORY_KEYWORDS = {
    "medicine": ("medic", "mbbs", "nurs", "pharma", "dental", "dentist", "health", "biomed", "clinical", "public health"),
    "law": ("law", "legal", "llb", "llm"),
    "business": ("business", "mba", "management", "finance", "account", "market", "commerce", "econom", "hotel", "hospitality"),
    "engineering": ("engineer", "mechanical", "civil", "electrical", "electronic", "aerospace", "chemical eng", "automotive"),
    "stem": ("stem", "computer", "software", "data", "science", "math", "physics", "chemistry", "biology", "ai", "artificial",
             "machine learning", "cyber", "information tech", " it", "statistics"),
    "arts": ("art", "design", "music", "film", "media", "architecture", "fashion", "literature", "history", "philosophy"),
    "social": ("social", "psycholog", "sociolog", "politic", "international relations", "education", "anthropolog"),
}


@lru_cache(maxsize=1)
def _country_names() -> dict[str, str]:
    names: dict[str, str] = {}
    try:
        for r in json.loads((Path(__file__).resolve().parent / ".countries_cache.json").read_text()):
            code = (r.get("cca2") or "").lower()
            for n in ((r.get("name") or {}).get("common"), (r.get("name") or {}).get("official")):
                if n and code:
                    names[n.lower()] = code
    except Exception:
        pass
    return names


def country_code(text: Optional[str]) -> Optional[str]:
    """'United Kingdom' / 'GB' / 'uk' -> 'uk'; 'Germany' / 'de' -> 'de'; unknown -> the text lowercased."""
    t = (text or "").strip().lower()
    if not t:
        return None
    if t in _UK:
        return "uk"
    if t in _EXTRA:
        return _EXTRA[t]
    if len(t) == 2:
        return t
    code = _country_names().get(t)
    return ("uk" if code == "gb" else code) if code else t


def course_category(text: Optional[str]) -> Optional[str]:
    """'Computer Science' -> 'stem'; 'MBA' -> 'business'; unknown -> the text lowercased."""
    t = (text or "").strip().lower()
    if not t:
        return None
    if t in CATEGORY_KEYWORDS:
        return t
    padded = f" {t}"
    for cat, words in CATEGORY_KEYWORDS.items():
        if any(w in padded for w in words):
            return cat
    return t


RELAX_LABELS = {"courses": "subject", "ielts_min": "IELTS score", "tuition_usd": "budget", "country": "country",
                "gre_required": "GRE", "gmat_required": "GMAT", "scholarships": "scholarships only"}


async def find_relaxed(col, flt: dict, relax_order: list[str], limit: int = 100) -> tuple[list[dict], list[str]]:
    """Query with all filters; if nothing matches, drop filters in `relax_order` one at a time.
    Returns (documents, labels of the filters that were dropped)."""
    flt = dict(flt)
    dropped: list[str] = []
    while True:
        docs = await col.find(flt, {"_id": 0}).sort("rank", 1).to_list(length=limit)
        if docs:
            return docs, dropped
        key = next((k for k in relax_order if k in flt), None)
        if key is None:
            return [], dropped
        flt.pop(key)
        dropped.append(RELAX_LABELS.get(key, key))


def relaxed_note(dropped: list[str]) -> Optional[str]:
    if not dropped:
        return None
    return f"No exact matches, so these ignore your {', '.join(dropped)} filter{'s' if len(dropped) > 1 else ''}."


def words(text: str) -> list[str]:
    return re.findall(r"[a-z]+", (text or "").lower())
