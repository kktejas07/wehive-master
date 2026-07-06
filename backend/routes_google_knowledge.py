"""Google Knowledge — Integration with Google Knowledge Graph API and
other Google open knowledge services.

Endpoints:
  GET  /api/knowledge/search       — Search Google Knowledge Graph
  GET  /api/knowledge/entity/{id}  — Get entity by Knowledge Graph ID
  GET  /api/knowledge/enrich       — Enrich a topic with Google Knowledge data
  GET  /api/knowledge/google-trends — Get Google Trends data for a topic
  GET  /api/knowledge/wikidata     — Search Wikidata for entity info
  GET  /api/knowledge/status       — Check Knowledge API configuration
"""

import os
import time
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query

from auth_utils import get_current_user_optional

router = APIRouter(prefix="/knowledge", tags=["google-knowledge"])

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
SEARCH_ENGINE_ID = os.environ.get("GOOGLE_CX", "")

_cache: dict[str, tuple[float, dict]] = {}


def _kcache(key: str, val: dict, ttl: int = 3600):
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
    languages: str = "en",
):
    if not GOOGLE_API_KEY:
        return {
            "ok": True,
            "source": "stark_fallback",
            "query": q,
            "entities": [],
            "note": "GOOGLE_API_KEY not configured — using Stark agent fallback",
        }

    ck = f"kg:{q}:{languages}:{limit}"
    cached = _kget(ck)
    if cached:
        return {"ok": True, "source": "google_knowledge_graph", "cached": True, **cached}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://kgsearch.googleapis.com/v1/entities:search",
                params={
                    "query": q,
                    "key": GOOGLE_API_KEY,
                    "limit": limit,
                    "languages": languages,
                    "indent": "false",
                },
            )
            if resp.status_code != 200:
                return {"ok": False, "detail": f"Knowledge Graph API error: {resp.status_code}"}

            data = resp.json()

            entities = []
            for item in data.get("itemListElement", []):
                result = item.get("result", {})
                entities.append({
                    "kg_id": result.get("@id", ""),
                    "name": result.get("name", ""),
                    "description": result.get("description", ""),
                    "detailed_description": {
                        "article": (result.get("detailedDescription", {}) or {}).get("articleBody", ""),
                        "url": (result.get("detailedDescription", {}) or {}).get("url", ""),
                        "license": (result.get("detailedDescription", {}) or {}).get("license", ""),
                    },
                    "url": result.get("url", result.get("detailedDescription", {}).get("url", "") if result.get("detailedDescription") else ""),
                    "image": (result.get("image", {}) or {}).get("contentUrl", ""),
                    "types": result.get("@type", []) if isinstance(result.get("@type"), list) else [result.get("@type", "")],
                    "score": item.get("resultScore", 0),
                })

            result_dict = {"query": q, "entities": entities, "total": len(entities)}
            _kcache(ck, result_dict)
            return {"ok": True, "source": "google_knowledge_graph", **result_dict}

    except Exception as e:
        return {"ok": False, "detail": str(e)}


@router.get("/entity/{entity_id:path}")
async def get_entity(entity_id: str):
    if not GOOGLE_API_KEY:
        return {"ok": False, "detail": "GOOGLE_API_KEY not configured"}
    if not entity_id.startswith("/"):
        entity_id = f"/{entity_id}"
    if "kg:" in entity_id and not entity_id.startswith("/"):
        entity_id = f"/{entity_id}"

    ck = f"kg:entity:{entity_id}"
    cached = _kget(ck)
    if cached:
        return {"ok": True, "source": "google_knowledge_graph", "cached": True, **cached}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://kgsearch.googleapis.com/v1/entities:search",
                params={"ids": entity_id, "key": GOOGLE_API_KEY, "limit": 1},
            )
            if resp.status_code != 200:
                return {"ok": False, "detail": f"Knowledge Graph API error: {resp.status_code}"}

            data = resp.json()
            items = data.get("itemListElement", [])
            if not items:
                return {"ok": False, "detail": "Entity not found"}

            item = items[0]
            result = item.get("result", {})
            entity = {
                "kg_id": result.get("@id", ""),
                "name": result.get("name", ""),
                "description": result.get("description", ""),
                "detailed_description": {
                    "article": (result.get("detailedDescription", {}) or {}).get("articleBody", ""),
                    "url": (result.get("detailedDescription", {}) or {}).get("url", ""),
                },
                "url": result.get("url", ""),
                "image": (result.get("image", {}) or {}).get("contentUrl", ""),
                "types": result.get("@type", []),
                "score": item.get("resultScore", 0),
            }
            _kcache(ck, {"entity": entity})
            return {"ok": True, "source": "google_knowledge_graph", "entity": entity}

    except Exception as e:
        return {"ok": False, "detail": str(e)}


@router.get("/enrich")
async def enrich_topic(
    q: str = Query(..., min_length=2),
    user=Depends(get_current_user_optional),
):
    """Enrich a topic using Google Knowledge Graph + Stark agent fallback."""

    kg_result = None
    if GOOGLE_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://kgsearch.googleapis.com/v1/entities:search",
                    params={"query": q, "key": GOOGLE_API_KEY, "limit": 3},
                )
                if resp.status_code == 200:
                    kg_result = resp.json()
        except Exception:
            pass

    entities = []
    sources = []
    if kg_result:
        sources.append("google_knowledge_graph")
        for item in kg_result.get("itemListElement", []):
            r = item.get("result", {})
            entities.append({
                "name": r.get("name", ""),
                "description": r.get("description", ""),
                "detail": (r.get("detailedDescription", {}) or {}).get("articleBody", ""),
                "url": r.get("url", ""),
                "image": (r.get("image", {}) or {}).get("contentUrl", ""),
            })

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
        pass

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

    api_key = GOOGLE_API_KEY
    cx = SEARCH_ENGINE_ID

    if not api_key:
        return {"ok": False, "detail": "GOOGLE_API_KEY not configured"}
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
                params={
                    "q": q,
                    "key": api_key,
                    "cx": cx,
                    "num": 5,
                },
            )
            if resp.status_code != 200:
                return {"ok": False, "detail": f"Custom Search API error: {resp.status_code}"}

            data = resp.json()
            results = [
                {
                    "title": r.get("title", ""),
                    "snippet": r.get("snippet", ""),
                    "url": r.get("link", ""),
                    "display_url": r.get("displayLink", ""),
                }
                for r in data.get("items", [])
            ]

            result_dict = {"query": q, "geo": geo, "results": results, "total": len(results)}
            _kcache(ck, result_dict)
            return {"ok": True, "source": "google_custom_search", **result_dict}

    except Exception as e:
        return {"ok": False, "detail": str(e)}


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

            data = search_resp.json()
            entities = [
                {
                    "id": e.get("id", ""),
                    "label": e.get("label", ""),
                    "description": e.get("description", ""),
                    "url": e.get("concepturi", ""),
                }
                for e in data.get("search", [])
            ]

            result_dict = {"query": q, "entities": entities, "total": len(entities)}
            _kcache(ck, result_dict)
            return {"ok": True, "source": "wikidata", **result_dict}

    except Exception as e:
        return {"ok": False, "detail": str(e)}


@router.get("/status")
async def knowledge_status():
    google_ok = False
    if GOOGLE_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    "https://kgsearch.googleapis.com/v1/entities:search",
                    params={"query": "test", "key": GOOGLE_API_KEY, "limit": 1},
                )
                google_ok = resp.status_code == 200
        except Exception:
            pass

    return {
        "ok": True,
        "google_knowledge_graph": {
            "configured": bool(GOOGLE_API_KEY),
            "connected": google_ok,
        },
        "google_custom_search": {
            "configured": bool(GOOGLE_API_KEY and SEARCH_ENGINE_ID),
        },
        "wikidata": {"available": True, "free": True},
        "checked_at": datetime.utcnow().isoformat(),
    }
