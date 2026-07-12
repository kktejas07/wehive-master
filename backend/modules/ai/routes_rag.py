"""RAG API — vector store admin + retrieval endpoints.

Public (auth required):
  GET  /api/rag/collections                 list collections + counts
  GET  /api/rag/collections/{name}          get collection info
  POST /api/rag/query                       RAG-augmented Q&A (with LLM)
  POST /api/rag/retrieve                    retrieval only (no LLM call)

Admin only:
  POST /api/rag/ingest/countries            ingest countries_v2 into RAG
  POST /api/rag/ingest/universities         ingest universities_v2 into RAG
  POST /api/rag/ingest/text                 ingest raw {id, text, ...} items
  POST /api/rag/ingest/mongo                ingest a custom Mongo collection
  DELETE /api/rag/collections/{name}        wipe a collection
  DELETE /api/rag/documents                 delete docs by ids or where
  GET  /api/rag/status                      backend status (chroma, ollama)
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth_utils import get_current_user
from core.db import db
from core.admin_auth import get_current_admin_flex

logger = logging.getLogger("wehive.routes_rag")

router = APIRouter(prefix="/rag", tags=["rag"])


class QueryRequest(BaseModel):
    query: str
    collections: Optional[List[str]] = None
    k: int = 4
    provider_id: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    max_tokens: int = 512


class RetrieveRequest(BaseModel):
    query: str
    collections: Optional[List[str]] = None
    k: int = 4


class TextIngestRequest(BaseModel):
    collection: str
    items: List[dict]
    embed_model: Optional[str] = None
    chunk: bool = True
    namespace: Optional[str] = None


class MongoIngestRequest(BaseModel):
    collection: str
    mongo_collection: str
    text_fields: Optional[List[str]] = None
    id_field: str = "id"
    filter: Optional[dict] = None
    limit: Optional[int] = None
    embed_model: Optional[str] = None
    chunk: bool = True
    namespace: Optional[str] = None


class DeleteDocsRequest(BaseModel):
    collection: str
    ids: Optional[List[str]] = None
    where: Optional[dict] = None


@router.get("/status")
async def rag_status(user=Depends(get_current_admin_flex)):
    """Backend status — Chroma, Ollama, prompt store."""
    from shared.ollama_embeddings import is_available, OLLAMA_EMBED_MODEL
    from shared.vector_store import list_collections, _USE_CHROMA, CHROMA_PATH

    collections = list_collections()
    coll_counts: dict[str, int] = {}
    try:
        from shared.vector_store import collection_count

        for c in collections:
            coll_counts[c] = collection_count(c)
    except Exception:
        pass

    ollama_ok = await is_available()
    return {
        "ok": True,
        "vector_store": {
            "backend": "chromadb" if _USE_CHROMA else "in_memory",
            "path": CHROMA_PATH,
            "collections": collections,
            "counts": coll_counts,
        },
        "ollama": {
            "available": ollama_ok,
            "embed_model": OLLAMA_EMBED_MODEL,
            "host": os.environ.get("OLLAMA_HOST", "http://localhost:11434"),
        },
    }


@router.get("/collections")
async def list_rag_collections(user=Depends(get_current_admin_flex)):
    from shared.vector_store import list_collections, collection_count

    collections = list_collections()
    return {
        "collections": [{"name": c, "count": collection_count(c)} for c in collections],
    }


@router.get("/collections/{name}")
async def get_collection_info(name: str, user=Depends(get_current_admin_flex)):
    from shared.vector_store import collection_count

    return {"name": name, "count": collection_count(name)}


@router.post("/retrieve")
async def retrieve_only(req: RetrieveRequest, user=Depends(get_current_admin_flex)):
    """RAG retrieval only — no LLM call. Returns the matching chunks."""
    from shared.agent_framework import _retrieve_rag_context

    text = await _retrieve_rag_context(req.query, req.collections, k=req.k)
    if not text:
        return {"ok": True, "context": "", "chunks": []}
    return {"ok": True, "context": text, "chunks": text.split("\n\n")}


@router.post("/query")
async def rag_query(req: QueryRequest, user=Depends(get_current_admin_flex)):
    """RAG-augmented Q&A: retrieve chunks, then call the LLM with them as context."""
    from shared.agent_framework import _retrieve_rag_context, _llm_call

    user_id = user.get("_id", "") if isinstance(user, dict) else ""
    rag_text = await _retrieve_rag_context(req.query, req.collections, k=req.k)
    if rag_text:
        context_block = f"Retrieved context from our knowledge base:\n{rag_text}"
    else:
        context_block = "(no context retrieved from vector store)"

    sys_prompt = req.system_prompt or (
        "You are Hive, We Hive's helpful assistant. Answer using the retrieved "
        "context when relevant. Be concise (2-4 sentences). If the answer is "
        "not in the context, say you don't have that information and suggest "
        "where to find it. Use ₹ for INR and $ for USD."
    )
    if rag_text:
        sys_prompt += "\n\n" + context_block

    user_prompt = req.query
    try:
        reply, info = await _llm_call(
            user_id=user_id,
            system_prompt=sys_prompt,
            user_prompt=user_prompt,
            provider_id=req.provider_id or "",
            model=req.model or "",
            max_tokens=req.max_tokens,
        )
        return {
            "ok": True,
            "reply": reply,
            "context": rag_text,
            "provider": info,
        }
    except Exception as e:
        logger.exception("RAG query LLM call failed: %s", e)
        raise HTTPException(500, f"LLM call failed: {e}")


# ── Admin-only ingestion endpoints ──────────────────────────────────────────


@router.post("/ingest/countries")
async def ingest_countries(_=Depends(get_current_admin_flex)):
    """Ingest countries_v2 into the RAG vector store."""
    from shared.rag_ingest import ingest_mongo_collection

    res = await ingest_mongo_collection(
        collection="wehive_countries",
        mongo_collection=db["countries_v2"],
        text_fields=["name", "capital", "region", "subregion", "visa_types", "highlights"],
        id_field="id",
        extra_metadata={"type": "country"},
    )
    return res


@router.post("/ingest/universities")
async def ingest_universities(_=Depends(get_current_admin_flex), limit: Optional[int] = None):
    """Ingest universities_v2 into the RAG vector store."""
    from shared.rag_ingest import ingest_mongo_collection

    res = await ingest_mongo_collection(
        collection="wehive_universities",
        mongo_collection=db["universities_v2"],
        text_fields=[
            "name", "country", "city", "courses", "scholarships",
            "tuition_usd", "ielts_min", "qs_rank", "times_rank",
        ],
        id_field="id",
        extra_metadata={"type": "university"},
        limit=limit,
    )
    return res


@router.post("/ingest/text")
async def ingest_text(req: TextIngestRequest, _=Depends(get_current_admin_flex)):
    """Ingest raw {id, text, ...} items into a custom collection."""
    from shared.rag_ingest import ingest_text_documents

    res = await ingest_text_documents(
        collection=req.collection,
        items=req.items,
        text_field="text",
        id_field="id",
        extra_metadata={"namespace": req.namespace} if req.namespace else None,
        embed_model=req.embed_model,
        chunk=req.chunk,
    )
    return res


@router.post("/ingest/mongo")
async def ingest_mongo(req: MongoIngestRequest, _=Depends(get_current_admin_flex)):
    """Ingest documents from any MongoDB collection."""
    from shared.rag_ingest import ingest_mongo_collection

    coll = db[req.mongo_collection]
    res = await ingest_mongo_collection(
        collection=req.collection,
        mongo_collection=coll,
        text_fields=req.text_fields,
        id_field=req.id_field,
        filter_query=req.filter,
        extra_metadata={"namespace": req.namespace} if req.namespace else None,
        embed_model=req.embed_model,
        chunk=req.chunk,
        limit=req.limit,
    )
    return res


@router.delete("/collections/{name}")
async def delete_collection(name: str, _=Depends(get_current_admin_flex)):
    """Wipe a single collection."""
    from shared.vector_store import delete_documents

    removed = delete_documents(name)
    return {"ok": True, "collection": name, "deleted": removed}


@router.post("/documents/delete")
async def delete_documents_endpoint(req: DeleteDocsRequest, _=Depends(get_current_admin_flex)):
    """Delete documents by ids or metadata filter."""
    from shared.vector_store import delete_documents

    if not req.ids and not req.where:
        raise HTTPException(400, "Provide ids or where filter")
    removed = delete_documents(req.collection, ids=req.ids, where=req.where)
    return {"ok": True, "deleted": removed, "collection": req.collection}
