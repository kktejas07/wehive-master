"""Vector Store — ChromaDB wrapper for the We Hive RAG pipeline.

Persistent local vector store. Each "collection" is a Chroma collection.
Documents are upserted by a stable id; metadata is stored alongside vectors.

Backend automatically falls back to an in-memory store if chromadb is not
installed, so the rest of the system still runs (e.g. unit tests).
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, List, Optional

logger = logging.getLogger("wehive.vector_store")

CHROMA_PATH = os.environ.get("CHROMA_PATH", "./data/chroma")
DEFAULT_COLLECTION = os.environ.get("RAG_DEFAULT_COLLECTION", "wehive_rag")

_client = None
_client_lock = threading.Lock()
_in_memory: dict[str, dict[str, dict]] = {}
_USE_CHROMA = True

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except Exception as e:  # pragma: no cover
    chromadb = None  # type: ignore
    ChromaSettings = None  # type: ignore
    _USE_CHROMA = False
    logger.warning("chromadb not installed — using in-memory vector store. %s", e)


class _InMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self._docs: dict[str, dict[str, Any]] = {}

    def upsert(self, *, ids, documents, embeddings, metadatas):
        for i, doc_id in enumerate(ids):
            self._docs[doc_id] = {
                "id": doc_id,
                "document": documents[i] if i < len(documents) else "",
                "embedding": embeddings[i] if i < len(embeddings) else [],
                "metadata": metadatas[i] if i < len(metadatas) else {},
            }

    def query(self, *, query_embeddings, n_results, where=None):
        results = {"ids": [], "documents": [], "metadatas": [], "distances": []}
        if not query_embeddings:
            return results
        q = query_embeddings[0]
        scored: list[tuple[float, str]] = []
        for doc_id, doc in self._docs.items():
            if where:
                ok = True
                for k, v in where.items():
                    if doc["metadata"].get(k) != v:
                        ok = False
                        break
                if not ok:
                    continue
            v = doc["embedding"]
            if not v:
                continue
            d = _cosine_distance(q, v)
            scored.append((d, doc_id))
        scored.sort(key=lambda x: x[0])
        top = scored[:n_results]
        results["ids"] = [[doc_id for _, doc_id in top]]
        results["documents"] = [[self._docs[doc_id]["document"] for _, doc_id in top]]
        results["metadatas"] = [[self._docs[doc_id]["metadata"] for _, doc_id in top]]
        results["distances"] = [[d for d, _ in top]]
        return results

    def delete(self, *, ids=None, where=None):
        if ids:
            for doc_id in ids:
                self._docs.pop(doc_id, None)
        if where:
            for doc_id in list(self._docs.keys()):
                if all(self._docs[doc_id]["metadata"].get(k) == v for k, v in where.items()):
                    self._docs.pop(doc_id, None)

    def count(self) -> int:
        return len(self._docs)


def _cosine_distance(a: list[float], b: list[float]) -> float:
    import math
    if not a or not b:
        return 1.0
    n = min(len(a), len(b))
    dot = sum(a[i] * b[i] for i in range(n))
    na = math.sqrt(sum(a[i] * a[i] for i in range(n)))
    nb = math.sqrt(sum(b[i] * b[i] for i in range(n)))
    if na == 0 or nb == 0:
        return 1.0
    return 1.0 - (dot / (na * nb))


class _InMemoryClient:
    def __init__(self):
        self._collections: dict[str, _InMemoryCollection] = {}

    def get_or_create_collection(self, name: str):
        if name not in self._collections:
            self._collections[name] = _InMemoryCollection(name)
        return self._collections[name]

    def list_collections(self):
        return list(self._collections.values())

    def delete_collection(self, name: str):
        self._collections.pop(name, None)


def get_client():
    """Return a singleton vector-store client (Chroma if available, else in-memory)."""
    global _client
    if _client is not None:
        return _client
    with _client_lock:
        if _client is not None:
            return _client
        if _USE_CHROMA:
            try:
                os.makedirs(CHROMA_PATH, exist_ok=True)
                _client = chromadb.PersistentClient(
                    path=CHROMA_PATH,
                    settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
                )
                logger.info("ChromaDB persistent client ready @ %s", CHROMA_PATH)
                return _client
            except Exception as e:
                logger.warning("ChromaDB init failed, using in-memory: %s", e)
        _client = _InMemoryClient()
        return _client


def get_collection(name: str = DEFAULT_COLLECTION):
    """Return (and create if missing) a collection by name."""
    return get_client().get_or_create_collection(name)


def list_collections() -> list[str]:
    return [c.name for c in get_client().list_collections()]


def upsert_documents(
    collection: str,
    ids: List[str],
    documents: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[dict]] = None,
) -> int:
    """Upsert documents into a collection. Returns the number of items written."""
    if not ids:
        return 0
    if metadatas is None:
        metadatas = [{} for _ in ids]
    if len(documents) != len(ids) or len(embeddings) != len(ids) or len(metadatas) != len(ids):
        raise ValueError("ids, documents, embeddings, metadatas must have equal length")
    coll = get_collection(collection)
    coll.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    return len(ids)


def query_collection(
    collection: str,
    query_embedding: List[float],
    n_results: int = 5,
    where: Optional[dict] = None,
) -> List[dict]:
    """Query a collection with a single pre-computed embedding.

    Returns a list of {id, document, metadata, distance} dicts, ordered by
    ascending distance.
    """
    if not query_embedding:
        return []
    coll = get_collection(collection)
    res = coll.query(query_embeddings=[query_embedding], n_results=n_results, where=where)
    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    out: list[dict] = []
    for i, doc_id in enumerate(ids):
        out.append({
            "id": doc_id,
            "document": docs[i] if i < len(docs) else "",
            "metadata": metas[i] if i < len(metas) else {},
            "distance": dists[i] if i < len(dists) else None,
        })
    return out


def delete_documents(collection: str, ids: Optional[List[str]] = None, where: Optional[dict] = None) -> int:
    coll = get_collection(collection)
    if coll.count() == 0:
        return 0
    before = coll.count()
    coll.delete(ids=ids, where=where)
    after = coll.count()
    return before - after


def collection_count(collection: str) -> int:
    return get_collection(collection).count()


def reset_client() -> None:
    """For tests: drop the singleton and force re-init."""
    global _client
    _client = None
