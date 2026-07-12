"""Knowledge Graph Services — KG enrichment, entity cache, KG-to-RAG bridge,
and entity disambiguation.

Endpoints:
  GET  /api/kg/search                hyra_kg_search — search KG entities
  POST /api/kg/enrich                hyra_kg_enrich — enrich text with KG data
  GET  /api/kg/disambiguate          hyra_kg_disambiguate — resolve entity ambiguity
  GET  /api/kg/cache/stats           KG cache statistics
  POST /api/kg/cache/clear           Clear KG cache
  GET  /api/kg/rag/index             Trigger KG→RAG indexing
  GET  /api/kg/rag/status            KG→RAG bridge status
"""

import hashlib
import logging
import os
import time
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from core.auth_utils import get_current_user, get_current_user_optional
from core.db import db

router = APIRouter(prefix="/kg", tags=["knowledge-graph-services"])
logger = logging.getLogger("wehive.kg_services")

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
KG_CACHE_TTL = int(os.environ.get("KG_CACHE_TTL", "604800"))

_kg_cache: dict[str, tuple[float, dict]] = {}


def _kg_cache_key(query: str, prefix: str = "kg") -> str:
    return f"{prefix}:{hashlib.md5(query.encode()).hexdigest()[:12]}"


def _kg_cache_get(key: str) -> Optional[dict]:
    if key in _kg_cache:
        ts, val = _kg_cache[key]
        if time.time() - ts < KG_CACHE_TTL:
            return val
        del _kg_cache[key]
    return None


def _kg_cache_set(key: str, val: dict):
    _kg_cache[key] = (time.time(), val)
    if len(_kg_cache) > 1000:
        oldest = min(_kg_cache, key=lambda k: _kg_cache[k][0])
        del _kg_cache[oldest]


async def _call_kg_api(query: str, limit: int = 5, types: Optional[str] = None) -> Optional[dict]:
    if not GOOGLE_API_KEY:
        return None
    params = {"query": query, "key": GOOGLE_API_KEY, "limit": limit, "languages": "en"}
    if types:
        params["types"] = types
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://kgsearch.googleapis.com/v1/entities:search",
                params=params,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.debug("KG API error: %s", e)
    return None


def _parse_kg_response(data: dict) -> list[dict]:
    entities = []
    for item in data.get("itemListElement", []):
        result = item.get("result", {})
        entities.append({
            "kg_id": result.get("@id", ""),
            "name": result.get("name", ""),
            "description": result.get("description", ""),
            "detail": (result.get("detailedDescription", {}) or {}).get("articleBody", ""),
            "detail_url": (result.get("detailedDescription", {}) or {}).get("url", ""),
            "url": result.get("url", ""),
            "image": (result.get("image", {}) or {}).get("contentUrl", ""),
            "types": result.get("@type", []),
            "score": item.get("resultScore", 0),
        })
    return entities


@router.get("/search")
async def kg_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=10),
    types: Optional[str] = None,
):
    ck = _kg_cache_key(f"{q}:{types or ''}:{limit}")
    cached = _kg_cache_get(ck)
    if cached:
        return {"ok": True, "source": "kg_cache", "cached": True, **cached}

    data = await _call_kg_api(q, limit, types)
    if not data:
        return {"ok": True, "source": "none", "query": q, "entities": [], "note": "KG API unavailable — no key configured"}

    entities = _parse_kg_response(data)
    result = {"query": q, "entities": entities, "total": len(entities)}
    _kg_cache_set(ck, result)
    await _store_in_mongo(q, entities)

    return {"ok": True, "source": "google_kg", **result}


@router.post("/enrich")
async def kg_enrich(
    q: str = Query(..., min_length=2),
    user=Depends(get_current_user_optional),
):
    """Enrich text with KG entity data. Uses KG first, falls back to Wikipedia."""

    sources = []

    data = await _call_kg_api(q, limit=3)
    entities = []
    if data:
        sources.append("google_kg")
        entities = _parse_kg_response(data)

    wiki_data = None
    if not entities or len(entities) < 2:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(
                    f"https://en.wikipedia.org/api/rest_v1/page/summary/{q.replace(' ', '_')}"
                )
                if resp.status_code == 200:
                    wiki_data = resp.json()
                    sources.append("wikipedia")
                    entities.append({
                        "kg_id": f"wiki:{wiki_data.get('pageid', '')}",
                        "name": wiki_data.get("title", q),
                        "description": wiki_data.get("extract", "")[:600],
                        "url": wiki_data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                        "image": (wiki_data.get("thumbnail", {}) or {}).get("source", ""),
                        "types": [],
                        "score": 0.8,
                    })
        except Exception:
            pass

    result = {
        "topic": q,
        "sources": sources,
        "entities": entities,
        "enriched_at": datetime.utcnow().isoformat(),
    }
    await _store_enrichment(q, result)

    return {"ok": True, **result}


@router.get("/disambiguate")
async def kg_disambiguate(
    q: str = Query(..., min_length=2),
    context: Optional[str] = None,
):
    """Disambiguate an entity name using KG + context hints."""

    candidates = []
    data = await _call_kg_api(q, limit=10)
    if data:
        candidates = _parse_kg_response(data)

    if context and GOOGLE_API_KEY:
        data2 = await _call_kg_api(f"{q} {context}", limit=5)
        if data2:
            extra = _parse_kg_response(data2)
            candidates = extra + [c for c in candidates if c["kg_id"] not in {e["kg_id"] for e in extra}]

    resolved = candidates[0] if candidates else None

    return {
        "ok": True,
        "query": q,
        "context": context,
        "candidates": candidates[:5],
        "resolved": resolved,
        "disambiguated_at": datetime.utcnow().isoformat(),
    }


@router.get("/cache/stats")
async def kg_cache_stats(user=Depends(get_current_user)):
    mongo_count = await db["kg_entity_cache"].count_documents({})
    return {
        "ok": True,
        "in_memory_entries": len(_kg_cache),
        "mongo_entries": mongo_count,
        "cache_ttl_seconds": KG_CACHE_TTL,
    }


@router.post("/cache/clear")
async def kg_cache_clear(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    _kg_cache.clear()
    deleted = await db["kg_entity_cache"].delete_many({})
    return {"ok": True, "memory_cleared": True, "mongo_deleted": deleted.deleted_count}


@router.get("/rag/index")
async def kg_rag_index(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    entities = await db["kg_entity_cache"].find().to_list(1000)
    if not entities:
        return {"ok": True, "indexed": 0, "note": "No KG entities in cache"}

    try:
        from shared.rag_ingest import ingest_texts

        texts = []
        for e in entities:
            parts = [
                e.get("name", ""),
                e.get("description", ""),
                e.get("detail", ""),
            ]
            texts.append({
                "id": e.get("kg_id", str(e.get("_id", ""))),
                "text": " ".join(p for p in parts if p)[:800],
            })

        await ingest_texts(
            "kg_entities",
            texts,
            metadata={"source": "google_knowledge_graph", "indexed_at": datetime.utcnow().isoformat()},
        )
        return {"ok": True, "indexed": len(texts), "collection": "kg_entities"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"KG→RAG indexing failed: {str(e)}")


@router.get("/rag/status")
async def kg_rag_status():
    entity_count = await db["kg_entity_cache"].count_documents({})

    chroma_ok = False
    try:
        from shared.vector_store import _client
        if _client:
            try:
                collections = _client.list_collections()
                chroma_ok = any(c.name == "kg_entities" for c in collections)
            except Exception:
                pass
    except Exception:
        pass

    return {
        "ok": True,
        "kg_cache_entities": entity_count,
        "rag_collection_exists": chroma_ok,
        "kg_api_configured": bool(GOOGLE_API_KEY),
        "checked_at": datetime.utcnow().isoformat(),
    }


async def _store_in_mongo(query: str, entities: list[dict]):
    try:
        for e in entities:
            await db["kg_entity_cache"].update_one(
                {"kg_id": e["kg_id"]},
                {"$set": {
                    "kg_id": e["kg_id"],
                    "name": e["name"],
                    "description": e["description"],
                    "detail": e.get("detail", ""),
                    "url": e["url"],
                    "image": e["image"],
                    "types": e.get("types", []),
                    "score": e["score"],
                    "query": query,
                    "cached_at": datetime.utcnow(),
                }},
                upsert=True,
            )
    except Exception:
        pass


async def _store_enrichment(topic: str, result: dict):
    try:
        await db["kg_insight_runs"].insert_one({
            "topic": topic,
            "sources": result.get("sources", []),
            "entity_count": len(result.get("entities", [])),
            "run_at": datetime.utcnow(),
        })
    except Exception:
        pass
