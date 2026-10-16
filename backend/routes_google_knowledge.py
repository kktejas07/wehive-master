"""Google Knowledge — Integration with Google Knowledge Graph API and
other Google open knowledge services.

Endpoints:
  GET  /api/knowledge/search          — Search Google Knowledge Graph
  GET  /api/knowledge/entity/{id}     — Get entity by Knowledge Graph ID
  GET  /api/knowledge/enrich          — Enrich a topic with Google Knowledge data
  GET  /api/knowledge/google-trends   — Get Google Trends data for a topic
  GET  /api/knowledge/wikidata        — Search Wikidata for entity info
  GET  /api/knowledge/status          — Check Knowledge API configuration
  GET  /api/knowledge/public/lookup   — Public, rate-limited single-entity lookup (site search)
"""

import logging
import os
import time
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query

import google_kg
from auth_utils import get_current_user
from rate_limit import RateLimit

router = APIRouter(prefix="/knowledge", tags=["google-knowledge"], dependencies=[Depends(get_current_user)])
public_router = APIRouter(prefix="/knowledge/public", tags=["google-knowledge"])
logger = logging.getLogger("wehive.google_knowledge")

SEARCH_ENGINE_ID = os.environ.get("GOOGLE_CX", "")
_NOT_CONFIGURED = "GOOGLE_API_KEY not configured"

_cache: dict[str, tuple[float, dict]] = {}


def _kcache(key: str, val: dict):
    _cache[key] = (time.time(), val)
    if len(_cache) > 200:
        oldest = min(_cache, key=lambda k: _cache[k][0])
        del _cache[oldest]


def _kget(key: str) -> Optional[dict]:
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < 3600:
            return val
        del _cache[key]
    return None


@router.get("/search")
async def knowledge_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=10),
    types: Optional[str] = None,
):
    if not google_kg.configured():
        return {"ok": True, "source": "none", "query": q, "entities": [], "note": _NOT_CONFIGURED}
    entities = await google_kg.search(q, limit=limit, types=types)
    return {"ok": True, "source": "google_knowledge_graph", "query": q, "entities": entities, "total": len(entities)}


@router.get("/entity/{entity_id:path}")
async def get_entity(entity_id: str):
    if not google_kg.configured():
        return {"ok": False, "detail": _NOT_CONFIGURED}
    entities = await google_kg.search(ids=entity_id if entity_id.startswith("/") else f"/{entity_id}", limit=1)
    if not entities:
        return {"ok": False, "detail": "Entity not found"}
    return {"ok": True, "source": "google_knowledge_graph", "entity": entities[0]}


@router.get("/enrich")
async def enrich_topic(q: str = Query(..., min_length=2)):
    """Enrich a topic using Google Knowledge Graph + Wikipedia/DuckDuckGo fallback."""
    entities = await google_kg.search(q, limit=3)
    sources = ["google_knowledge_graph"] if entities else []

    try:
        from agents.stark_agent import fetch_wikipedia, fetch_duckduckgo_instant
        wiki = await fetch_wikipedia(q)
        if wiki:
            sources.append("wikipedia")
            entities.append({
                "name": wiki.get("title", ""),
                "description": wiki.get("extract", "")[:500],
                "url": wiki.get("url", ""),
                "image": wiki.get("thumbnail", ""),
            })
        ddg = await fetch_duckduckgo_instant(q)
        if ddg and ddg.get("abstract"):
            sources.append("duckduckgo")
            entities.append({
                "name": ddg.get("heading", q),
                "description": ddg.get("abstract", ""),
                "url": ddg.get("abstract_url", ""),
            })
    except Exception:
        logger.warning("Enrichment fallback failed", exc_info=True)

    return {
        "ok": True,
        "topic": q,
        "sources": sources,
        "entities": entities,
        "enriched_at": datetime.utcnow().isoformat(),
    }


@router.get("/google-trends")
async def google_trends(
    q: str = Query(..., min_length=2),
    geo: str = "IN",
):
    """Search Google Custom Search for recent trends/web results."""
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    cx = SEARCH_ENGINE_ID

    if not api_key:
        return {"ok": False, "detail": _NOT_CONFIGURED}
    if not cx:
        return {
            "ok": True,
            "source": "stark_fallback",
            "query": q,
            "results": [],
            "note": "GOOGLE_CX (custom search engine ID) not configured. Results unavailable.",
        }

    ck = f"gs:{q}:{geo}"
    cached = _kget(ck)
    if cached:
        return {"ok": True, "source": "google_custom_search", "cached": True, **cached}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"q": q, "key": api_key, "cx": cx, "num": 5},
            )
        if resp.status_code != 200:
            return {"ok": False, "detail": f"Custom Search API error: {resp.status_code}"}

        results = [
            {
                "title": r.get("title", ""),
                "snippet": r.get("snippet", ""),
                "url": r.get("link", ""),
                "display_url": r.get("displayLink", ""),
            }
            for r in resp.json().get("items", [])
        ]
        result_dict = {"query": q, "geo": geo, "results": results, "total": len(results)}
        _kcache(ck, result_dict)
        return {"ok": True, "source": "google_custom_search", **result_dict}
    except Exception as e:
        # Type only: httpx messages include the request URL, which carries the API key.
        logger.warning("Custom Search call failed: %s", type(e).__name__)
        return {"ok": False, "detail": "Custom Search unavailable"}


@router.get("/wikidata")
async def wikidata_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=10),
):
    """Search Wikidata for entity information."""
    ck = f"wd:{q}:{limit}"
    cached = _kget(ck)
    if cached:
        return {"ok": True, "source": "wikidata", "cached": True, **cached}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            search_resp = await client.get(
                "https://www.wikidata.org/w/api.php",
                params={
                    "action": "wbsearchentities",
                    "search": q,
                    "language": "en",
                    "limit": limit,
                    "format": "json",
                },
            )
        if search_resp.status_code != 200:
            return {"ok": False, "detail": "Wikidata API error"}

        entities = [
            {
                "id": e.get("id", ""),
                "label": e.get("label", ""),
                "description": e.get("description", ""),
                "url": e.get("concepturi", ""),
            }
            for e in search_resp.json().get("search", [])
        ]
        result_dict = {"query": q, "entities": entities, "total": len(entities)}
        _kcache(ck, result_dict)
        return {"ok": True, "source": "wikidata", **result_dict}
    except Exception:
        logger.warning("Wikidata call failed", exc_info=True)
        return {"ok": False, "detail": "Wikidata unavailable"}


@router.get("/status")
async def knowledge_status():
    configured = google_kg.configured()
    return {
        "ok": True,
        "google_knowledge_graph": {
            "configured": configured,
            "connected": configured and bool(await google_kg.search("Google", limit=1)),
        },
        "google_custom_search": {
            "configured": bool(configured and SEARCH_ENGINE_ID),
        },
        "wikidata": {"available": True, "free": True},
        "checked_at": datetime.utcnow().isoformat(),
    }


# Anonymous visitors can trigger this from the home search box, so it is cached and rate-limited.
_public_limiter = RateLimit(max_calls=30, window_seconds=300)


@public_router.get("/lookup")
async def public_lookup(q: str = Query(..., min_length=3, max_length=80), _=Depends(_public_limiter)):
    """The best-matching Knowledge Graph entity for a search query, trimmed for display."""
    e = await google_kg.lookup(q.strip())
    if not e:
        return {"entity": None}
    return {"entity": {
        "name": e["name"],
        "description": e["description"],
        "detail": e["detail"][:300],
        "url": e["detail_url"] or e["url"],
        "image": e["image"],
        "types": e["types"],
    }}
