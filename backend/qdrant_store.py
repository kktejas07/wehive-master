"""Qdrant vector store — hybrid dense+sparse search with RRF merging."""
from __future__ import annotations
import hashlib, logging, uuid
from typing import Optional
import config

logger = logging.getLogger("wehive.qdrant")

VECTOR_DIM = 1024  # BGE-M3 / mxbai-embed-large output

COLLECTIONS = [
    "wehive_kb",
    "wehive_countries",
    "wehive_universities",
    "kg_entities",
    "wehive_user_docs",
    "wehive_rejections",
    "wehive_student_memory",
]

_client = None


def get_client():
    global _client
    if _client is None:
        from qdrant_client import AsyncQdrantClient
        _client = AsyncQdrantClient(
            url=config.QDRANT_URL,
            api_key=config.QDRANT_API_KEY or None,
        )
    return _client


def doc_id_to_uuid(doc_id: str) -> str:
    return str(uuid.UUID(hashlib.md5(doc_id.encode()).hexdigest()))


async def init_qdrant_collections() -> None:
    from qdrant_client.models import (
        Distance, VectorParams, SparseVectorParams, PayloadSchemaType,
    )
    client = get_client()
    for name in COLLECTIONS:
        try:
            exists = await client.collection_exists(name)
            if not exists:
                await client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
                    sparse_vectors_config={"bge_sparse": SparseVectorParams()},
                )
                for field, schema in [
                    ("user_id", PayloadSchemaType.KEYWORD),
                    ("country_id", PayloadSchemaType.KEYWORD),
                    ("visa_type", PayloadSchemaType.KEYWORD),
                    ("source", PayloadSchemaType.KEYWORD),
                ]:
                    await client.create_payload_index(name, field, schema)
                logger.info("Created Qdrant collection: %s", name)
        except Exception as e:
            logger.warning("Qdrant init warning for %s: %s", name, e)


def rrf_merge(lists: list[list[dict]], k: int = 60) -> list[dict]:
    scores: dict[str, float] = {}
    docs: dict[str, dict] = {}
    for ranked in lists:
        for rank, doc in enumerate(ranked):
            did = doc["id"]
            scores[did] = scores.get(did, 0.0) + 1.0 / (k + rank + 1)
            docs[did] = doc
    return [docs[i] for i in sorted(scores, key=scores.__getitem__, reverse=True)]


async def upsert_documents(collection: str, documents: list[dict]) -> None:
    """documents: [{id, text, metadata: {country_id, visa_type, source, user_id, ...}}]"""
    if not documents:
        return
    from qdrant_client.models import PointStruct, SparseVector
    from embeddings_bge import embed_documents, get_sparse_vectors

    client = get_client()
    texts = [d["text"] for d in documents]
    dense_vecs = await embed_documents(texts)
    sparse_vecs = get_sparse_vectors(texts)

    points = []
    for doc, dense, sparse in zip(documents, dense_vecs, sparse_vecs):
        points.append(PointStruct(
            id=doc_id_to_uuid(doc["id"]),
            vector={
                "": dense,
                "bge_sparse": SparseVector(
                    indices=list(sparse.keys()),
                    values=list(sparse.values()),
                ),
            },
            payload={"text": doc["text"], **doc.get("metadata", {})},
        ))

    await client.upsert(collection_name=collection, points=points)


async def delete_document(collection: str, doc_id: str) -> None:
    """Delete a single point by its source doc_id. Best-effort; never raises."""
    try:
        from qdrant_client.models import PointIdsList
        uid = doc_id_to_uuid(doc_id)
        client = get_client()
        exists = await client.collection_exists(collection)
        if exists:
            await client.delete(collection_name=collection, points_selector=PointIdsList(points=[uid]))
    except Exception as exc:
        logger.debug("Qdrant delete_document skipped (%s/%s): %s", collection, doc_id, exc)


async def delete_by_user(user_id: str) -> None:
    """Delete all vectors owned by user_id across per-user collections (GDPR erasure)."""
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    client = get_client()
    f = Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))])
    for col in ("wehive_user_docs", "wehive_student_memory"):
        try:
            exists = await client.collection_exists(col)
            if exists:
                await client.delete(collection_name=col, points_selector=f)
        except Exception as exc:
            logger.debug("Qdrant delete_by_user skipped (%s/%s): %s", col, user_id, exc)


async def hybrid_search(
    collection: str,
    query: str,
    top_k: int = 50,
    filter_dict: Optional[dict] = None,
) -> list[dict]:
    from qdrant_client import models as qmodels
    from qdrant_client.models import SparseVector, Filter, FieldCondition, MatchValue
    from embeddings_bge import embed_query, get_sparse_vectors

    client = get_client()
    try:
        exists = await client.collection_exists(collection)
        if not exists:
            return []
    except Exception:
        return []

    qvec = await embed_query(query)
    sparse = get_sparse_vectors([query])[0]

    qdrant_filter = None
    if filter_dict:
        conditions = [FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filter_dict.items()]
        qdrant_filter = Filter(must=conditions)

    def to_dict(r) -> dict:
        return {"id": str(r.id), "score": r.score, "text": r.payload.get("text", ""), **r.payload}

    dense_list: list[dict] = []
    sparse_list: list[dict] = []

    try:
        dense_results = await client.search(
            collection_name=collection,
            query_vector=qvec,
            limit=top_k,
            query_filter=qdrant_filter,
            with_payload=True,
        )
        dense_list = [to_dict(r) for r in dense_results]
    except Exception as e:
        logger.warning("Dense search failed for %s: %s", collection, e)

    try:
        sparse_results = await client.search(
            collection_name=collection,
            query_vector=qmodels.NamedSparseVector(
                name="bge_sparse",
                vector=SparseVector(
                    indices=list(sparse.keys()),
                    values=list(sparse.values()),
                ),
            ),
            limit=top_k,
            query_filter=qdrant_filter,
            with_payload=True,
        )
        sparse_list = [to_dict(r) for r in sparse_results]
    except Exception as e:
        logger.warning("Sparse search failed for %s: %s", collection, e)

    if not dense_list and not sparse_list:
        return []

    return rrf_merge([dense_list, sparse_list])[:top_k]
