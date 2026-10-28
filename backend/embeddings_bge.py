"""BGE-M3 embeddings + BM25-style sparse vectors for Qdrant hybrid search."""
from __future__ import annotations
import hashlib, re, logging
from ollama_embeddings import embed_texts, embed_query as _embed_query

logger = logging.getLogger("wehive.embeddings_bge")

BGE_MODEL = "bge-m3"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def _token_to_idx(token: str) -> int:
    return int(hashlib.md5(token.encode()).hexdigest()[:4], 16)  # 0-65535


def _sparse_vec(text: str) -> dict[int, float]:
    tokens = _tokenize(text)
    if not tokens:
        return {}
    tf: dict[int, int] = {}
    for t in tokens:
        idx = _token_to_idx(t)
        tf[idx] = tf.get(idx, 0) + 1
    total = len(tokens)
    return {idx: count / total for idx, count in tf.items()}


async def embed_documents(texts: list[str]) -> list[list[float]]:
    return await embed_texts(texts, model=BGE_MODEL)


async def embed_query(text: str) -> list[float]:
    return await _embed_query(text, model=BGE_MODEL)


def get_sparse_vectors(texts: list[str]) -> list[dict[int, float]]:
    return [_sparse_vec(t) for t in texts]
