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

import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

import google_kg
from admin_auth import get_current_admin_flex
from auth_utils import get_current_user, get_current_user_optional
from db import db

router = APIRouter(prefix="/kg", tags=["knowledge-graph-services"], dependencies=[Depends(get_current_user)])
logger = logging.getLogger("wehive.kg_services")

@router.get("/search")
async def kg_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=10),
    types: Optional[str] = None,
):
    if not google_kg.configured():
        return {"ok": True, "source": "none", "query": q, "entities": [], "note": "KG API unavailable — no key configured"}

    entities = await google_kg.search(q, limit, types)
    result = {"query": q, "entities": entities, "total": len(entities)}
    await _store_in_mongo(q, entities)

    return {"ok": True, "source": "google_kg", **result}


@router.post("/enrich")
async def kg_enrich(
    q: str = Query(..., min_length=2),
    user=Depends(get_current_user_optional),
):
    """Enrich text with KG entity data. Uses KG first, falls back to Wikipedia."""

    sources = []

    entities = await google_kg.search(q, limit=3)
    if entities:
        sources.append("google_kg")

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

    candidates = await google_kg.search(q, limit=10)

    if context:
        extra = await google_kg.search(f"{q} {context}", limit=5)
        if extra:
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
async def kg_cache_stats(user=Depends(get_current_admin_flex)):
    mongo_count = await db["kg_entity_cache"].count_documents({})
    return {
        "ok": True,
        "in_memory_entries": len(google_kg._cache),
        "mongo_entries": mongo_count,
        "cache_ttl_seconds": google_kg.CACHE_TTL,
    }


@router.post("/cache/clear")
async def kg_cache_clear(user=Depends(get_current_admin_flex)):
    google_kg._cache.clear()
    deleted = await db["kg_entity_cache"].delete_many({})
    return {"ok": True, "memory_cleared": True, "mongo_deleted": deleted.deleted_count}


@router.get("/rag/index")
async def kg_rag_index(user=Depends(get_current_admin_flex)):

    entities = await db["kg_entity_cache"].find().to_list(1000)
    if not entities:
        return {"ok": True, "indexed": 0, "note": "No KG entities in cache"}

    try:
        from rag_ingest import ingest_text_documents

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

        await ingest_text_documents(
            "kg_entities",
            texts,
            extra_metadata={"source": "google_knowledge_graph", "indexed_at": datetime.utcnow().isoformat()},
        )
        return {"ok": True, "indexed": len(texts), "collection": "kg_entities"}
    except Exception as e:
        logger.exception("KG→RAG indexing failed")
        raise HTTPException(status_code=502, detail="KG→RAG indexing failed")


@router.get("/rag/status")
async def kg_rag_status():
    entity_count = await db["kg_entity_cache"].count_documents({})

    chroma_ok = False
    try:
        from vector_store import _client
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
        "kg_api_configured": google_kg.configured(),
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
