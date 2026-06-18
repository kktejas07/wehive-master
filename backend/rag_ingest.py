"""RAG Ingestion — turn raw documents into vector-store entries.

Provides:
  - chunk_text(): split long text into overlapping chunks (token-aware)
  - chunk_dict(): serialize a dict to a single chunk
  - make_id(): stable, deterministic id from namespace + key
  - ingest_documents(): full pipeline: chunk → embed → upsert
  - ingest_mongo_collection(): pull from a Mongo collection and ingest
"""

from __future__ import annotations

import hashlib
import logging
import os
from typing import Any, Iterable, List, Optional

from ollama_embeddings import embed_texts
from vector_store import upsert_documents

logger = logging.getLogger("wehive.rag_ingest")

CHUNK_SIZE = int(os.environ.get("RAG_CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.environ.get("RAG_CHUNK_OVERLAP", "120"))


def _approx_tokens(s: str) -> int:
    return max(1, len(s) // 4)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Greedy sentence-aware chunking with overlap.

    Tries to keep sentences whole; falls back to a sliding window over
    character-based "tokens" (~4 chars each) when a single sentence is
    longer than `chunk_size`.
    """
    if not text:
        return []
    text = text.strip()
    if not text:
        return []
    if _approx_tokens(text) <= chunk_size:
        return [text]

    sentences: list[str] = []
    buf = ""
    for ch in text:
        buf += ch
        if ch in ".!?\n" and buf.strip():
            sentences.append(buf.strip())
            buf = ""
    if buf.strip():
        sentences.append(buf.strip())

    chunks: list[str] = []
    cur = ""
    cur_tokens = 0
    for sent in sentences:
        st = _approx_tokens(sent)
        if st > chunk_size:
            if cur:
                chunks.append(cur.strip())
                cur = ""
                cur_tokens = 0
            for i in range(0, len(sent), chunk_size * 4):
                pieces = sent[i : i + chunk_size * 4]
                chunks.append(pieces)
            continue
        if cur_tokens + st > chunk_size and cur:
            chunks.append(cur.strip())
            tail = cur[-overlap * 4 :] if overlap else ""
            cur = (tail + " " + sent).strip()
            cur_tokens = _approx_tokens(cur)
        else:
            cur = (cur + " " + sent).strip() if cur else sent
            cur_tokens += st
    if cur:
        chunks.append(cur.strip())
    return [c for c in chunks if c]


def dict_to_text(d: dict, fields: Optional[list[str]] = None) -> str:
    """Serialize a dict to readable text for embedding.

    Joins selected (or all) fields as "key: value" lines. Nested dicts /
    lists are JSON-encoded for stability.
    """
    import json

    if not d:
        return ""
    if fields is None:
        fields = [k for k in d.keys() if k != "_id"]
    parts: list[str] = []
    for k in fields:
        if k not in d:
            continue
        v = d[k]
        if v is None or v == "":
            continue
        if isinstance(v, (dict, list)):
            try:
                v = json.dumps(v, ensure_ascii=False, default=str)
            except Exception:
                v = str(v)
        if isinstance(v, str) and len(v) > 1500:
            v = v[:1500] + "…"
        parts.append(f"{k}: {v}")
    return "\n".join(parts)


def make_id(namespace: str, key: str) -> str:
    """Stable id derived from namespace + key (sha1, 16 hex chars)."""
    raw = f"{namespace}::{key}".encode("utf-8")
    return hashlib.sha1(raw).hexdigest()[:16]


def _ensure_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    return str(v)


async def ingest_documents(
    collection: str,
    docs: Iterable[dict],
    *,
    text_fields: Optional[list[str]] = None,
    id_field: str = "id",
    namespace: Optional[str] = None,
    extra_metadata: Optional[dict] = None,
    embed_model: Optional[str] = None,
    chunk: bool = True,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
    batch_size: int = 64,
) -> dict:
    """Ingest a stream of dicts into the vector store.

    Each doc → 1+ chunks → 1 embedding each → 1 upsert. Returns a summary.
    """
    ns = namespace or collection
    base_meta = extra_metadata or {}
    all_ids: list[str] = []
    all_docs: list[str] = []
    all_metas: list[dict] = []
    total = 0

    pending_texts: list[str] = []
    pending_ids: list[str] = []
    pending_metas: list[dict] = []

    async def _flush():
        nonlocal pending_texts, pending_ids, pending_metas
        if not pending_texts:
            return
        vecs = await embed_texts(pending_texts, model=embed_model)
        upsert_documents(collection, pending_ids, pending_texts, vecs, pending_metas)
        all_ids.extend(pending_ids)
        all_docs.extend(pending_texts)
        all_metas.extend(pending_metas)
        pending_texts = []
        pending_ids = []
        pending_metas = []

    for d in docs:
        if not isinstance(d, dict):
            continue
        raw_key = _ensure_str(d.get(id_field)) or str(d.get("_id") or total)
        text = dict_to_text(d, text_fields)
        if not text:
            continue
        pieces = chunk_text(text, chunk_size, chunk_overlap) if chunk else [text]
        for idx, piece in enumerate(pieces):
            doc_id = f"{make_id(ns, raw_key)}-{idx}" if len(pieces) > 1 else make_id(ns, raw_key)
            meta = {**base_meta, "source_key": raw_key, "chunk_index": idx, "chunks": len(pieces)}
            if idx == 0 and "id" in d:
                meta["id"] = d["id"]
            if "country" in d and d["country"]:
                meta["country"] = str(d["country"]).lower()
            if "name" in d and d["name"]:
                meta["name"] = str(d["name"])
            if "type" in d and d["type"]:
                meta["type"] = str(d["type"]).lower()
            pending_texts.append(piece)
            pending_ids.append(doc_id)
            pending_metas.append(meta)
            if len(pending_texts) >= batch_size:
                await _flush()
        total += 1
    await _flush()
    return {
        "ok": True,
        "documents": total,
        "chunks": len(all_ids),
        "collection": collection,
    }


async def ingest_mongo_collection(
    collection: str,
    mongo_collection,
    *,
    text_fields: Optional[list[str]] = None,
    id_field: str = "id",
    filter_query: Optional[dict] = None,
    projection: Optional[dict] = None,
    extra_metadata: Optional[dict] = None,
    embed_model: Optional[str] = None,
    chunk: bool = True,
    limit: Optional[int] = None,
) -> dict:
    """Pull docs from a Motor collection and ingest."""
    proj = projection or {"_id": 0}
    q = filter_query or {}
    cursor = mongo_collection.find(q, proj)
    if limit:
        cursor = cursor.limit(limit)
    docs: list[dict] = []
    async for d in cursor:
        docs.append(d)
    if not docs:
        return {"ok": True, "documents": 0, "chunks": 0, "collection": collection}
    return await ingest_documents(
        collection,
        docs,
        text_fields=text_fields,
        id_field=id_field,
        extra_metadata=extra_metadata,
        embed_model=embed_model,
        chunk=chunk,
    )


async def ingest_text_documents(
    collection: str,
    items: Iterable[dict],
    *,
    text_field: str = "text",
    id_field: str = "id",
    extra_metadata: Optional[dict] = None,
    embed_model: Optional[str] = None,
    chunk: bool = True,
) -> dict:
    """Ingest pre-formatted {id, text, ...} items (e.g. FAQ entries, doc snippets)."""
    docs: list[dict] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        if not it.get(id_field) or not it.get(text_field):
            continue
        docs.append(it)
    return await ingest_documents(
        collection,
        docs,
        text_fields=[text_field],
        id_field=id_field,
        extra_metadata=extra_metadata,
        embed_model=embed_model,
        chunk=chunk,
    )
