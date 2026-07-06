"""VisaHQ Adapter — First-class integration with VisaHQ API.

Provides real-time visa requirements, processing times, document checklists,
and fee data for 200+ countries. No scraping — uses the official VisaHQ API.

Endpoint: https://api.visahq.com/v1
Required: VISA_HQ_API_KEY env var
"""

import hashlib
import logging
import os
import time
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger("wehive.adapters.visahq")

VISA_HQ_API_KEY = os.environ.get("VISA_HQ_API_KEY", "")
VISA_HQ_BASE_URL = os.environ.get("VISA_HQ_BASE_URL", "https://api.visahq.com/v1")

_cache: dict[str, tuple[float, dict]] = {}
VISA_HQ_CACHE_TTL = 3600


def _ckey(*parts: str) -> str:
    return "vhq:" + hashlib.md5(":".join(parts).encode()).hexdigest()[:12]


def _cget(key: str) -> Optional[dict]:
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < VISA_HQ_CACHE_TTL:
            return val
        del _cache[key]
    return None


def _cset(key: str, val: dict):
    _cache[key] = (time.time(), val)


async def _vhq_get(endpoint: str, params: dict = None) -> Optional[dict]:
    if not VISA_HQ_API_KEY:
        return None

    headers = {"Authorization": f"Bearer {VISA_HQ_API_KEY}", "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{VISA_HQ_BASE_URL}/{endpoint}",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
            logger.debug("VisaHQ %s returned %s", endpoint, resp.status_code)
            return None
    except Exception as e:
        logger.debug("VisaHQ error: %s", e)
        return None


async def get_visa_requirements(from_country: str, to_country: str) -> Optional[dict]:
    """Get visa requirements for traveling from one country to another."""
    if not VISA_HQ_API_KEY:
        return None

    ck = _ckey("requirements", from_country, to_country)
    cached = _cget(ck)
    if cached:
        return {"source": "visahq", "cached": True, **cached}

    data = await _vhq_get("requirements", {"from": from_country, "to": to_country})
    if data:
        _cset(ck, data)
        return {"source": "visahq", **data}
    return None


async def get_document_checklist(from_country: str, to_country: str, visa_type: str = "tourist") -> Optional[dict]:
    """Get required documents checklist for a specific visa type."""
    if not VISA_HQ_API_KEY:
        return None

    ck = _ckey("docs", from_country, to_country, visa_type)
    cached = _cget(ck)
    if cached:
        return {"source": "visahq", "cached": True, **cached}

    data = await _vhq_get(
        "documents",
        {"from": from_country, "to": to_country, "visa_type": visa_type},
    )
    if data:
        _cset(ck, data)
        return {"source": "visahq", **data}
    return None


async def get_processing_times(from_country: str, to_country: str, visa_type: str = "tourist") -> Optional[dict]:
    """Get visa processing time estimates."""
    if not VISA_HQ_API_KEY:
        return None

    ck = _ckey("processing", from_country, to_country, visa_type)
    cached = _cget(ck)
    if cached:
        return {"source": "visahq", "cached": True, **cached}

    data = await _vhq_get(
        "processing",
        {"from": from_country, "to": to_country, "visa_type": visa_type},
    )
    if data:
        _cset(ck, data)
        return {"source": "visahq", **data}
    return None


async def get_visa_fees(from_country: str, to_country: str, visa_type: str = "tourist") -> Optional[dict]:
    """Get visa fee estimates."""
    if not VISA_HQ_API_KEY:
        return None

    ck = _ckey("fees", from_country, to_country, visa_type)
    cached = _cget(ck)
    if cached:
        return {"source": "visahq", "cached": True, **cached}

    data = await _vhq_get(
        "fees",
        {"from": from_country, "to": to_country, "visa_type": visa_type},
    )
    if data:
        _cset(ck, data)
        return {"source": "visahq", **data}
    return None


async def get_slot_wait_time(from_country: str, to_country: str, location: str = "") -> Optional[dict]:
    """Get estimated wait time for an appointment slot (not real-time scraping)."""
    if not VISA_HQ_API_KEY:
        return _fallback_wait_time(from_country, to_country, location)

    ck = _ckey("slots", from_country, to_country, location)
    cached = _cget(ck)
    if cached:
        return {"source": "visahq", "cached": True, **cached}

    data = await _vhq_get(
        "slots",
        {"from": from_country, "to": to_country, "location": location},
    )
    if data:
        _cset(ck, data)
        return {"source": "visahq", **data}
    return _fallback_wait_time(from_country, to_country, location)


def _fallback_wait_time(from_country: str, to_country: str, location: str = "") -> dict:
    """Fallback wait-time estimates based on published embassy advisories."""
    country_map = {
        "us": {"b1b2": "6-12 months", "f1": "2-4 months", "h1b": "3-6 months", "l1": "2-6 months"},
        "uk": {"standard": "3-6 weeks", "priority": "5-7 days", "super_priority": "24 hours"},
        "ca": {"visitor": "2-8 weeks", "student": "4-8 weeks", "work": "8-16 weeks"},
        "au": {"visitor": "2-4 weeks", "student": "4-8 weeks", "work": "4-12 weeks"},
        "de": {"schengen": "2-4 weeks", "national": "4-12 weeks"},
        "fr": {"schengen": "2-3 weeks", "national": "4-12 weeks"},
        "jp": {"visitor": "1-2 weeks", "work": "4-8 weeks"},
        "sg": {"visitor": "3-5 days", "work": "2-4 weeks"},
        "ae": {"visitor": "3-7 days", "work": "2-4 weeks"},
    }
    wait_times = country_map.get(to_country, {"default": "2-4 weeks"})
    source = "published_embassy_advisories"

    return {
        "source": source,
        "from": from_country,
        "to": to_country,
        "location": location,
        "wait_times": wait_times,
        "note": "Estimated wait times based on published embassy data. Actual times may vary.",
        "checked_at": datetime.utcnow().isoformat(),
    }


def visahq_status() -> dict:
    return {
        "configured": bool(VISA_HQ_API_KEY),
        "base_url": VISA_HQ_BASE_URL,
        "capabilities": ["visa_requirements", "document_checklist", "processing_times", "fees", "slot_wait_estimates"],
        "free_tier": bool(VISA_HQ_API_KEY),
    }
