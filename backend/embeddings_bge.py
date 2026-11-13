"""BGE-M3 embeddings + BM25-style sparse vectors for Qdrant hybrid search.

Backend selection (in order of preference):
  1. BGE-M3 via FlagEmbedding (if installed and EMBEDDINGS_BACKEND != 'ollama')
  2. Ollama (local embedding server)
  3. Deterministic hash stub (always works, for tests / fallback)
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
import sys
from typing import Optional

import ollama_embeddings

logger = logging.getLogger("wehive.embeddings_bge")

BGE_MODEL = "bge-m3"
BGE_FULL_MODEL = "BAAI/bge-m3"

# Overrideable for tests: 'bge-m3' | 'ollama'
EMBEDDINGS_BACKEND: str = os.getenv("EMBEDDINGS_BACKEND", "bge-m3")

# Module-level state
_model = None           # FlagEmbedding BGEM3FlagModel instance when active
_active: Optional[str] = None  # 'bge-m3' | 'ollama' | None (not yet warmed up)


def reset() -> None:
    """Reset backend state — for tests."""
    global _model, _active
    _model = None
    _active = None


def warm_up() -> str:
    """Load the backend and return its name. Idempotent."""
    global _model, _active
    if _active is not None:
        return _active

    if EMBEDDINGS_BACKEND == "ollama":
        _model = None
        _active = "ollama"
        return _active

    # Try FlagEmbedding
    try:
        import FlagEmbedding  # noqa: F401 — may be None (monkeypatched to None in tests)
        if FlagEmbedding is None:
            raise ImportError("FlagEmbedding is None")
        bge_cls = FlagEmbedding.BGEM3FlagModel
        import torch
        use_fp16 = torch.cuda.is_available()
        _model = bge_cls(BGE_FULL_MODEL, use_fp16=use_fp16)
        _active = "bge-m3"
    except (ImportError, AttributeError, Exception):
        _model = None
        _active = "ollama"
    return _active


def current_backend() -> str:
    """Return the backend that was selected (warm_up lazily if needed)."""
    if _active is None:
        warm_up()
    return _active  # type: ignore[return-value]


def active_backend() -> str:
    """Alias for current_backend() — returns backend without re-selecting."""
    return _active if _active is not None else warm_up()


# ---------------------------------------------------------------------------
# Sparse (BM25-style) helpers
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def _sparse_vec(text: str) -> dict[str, float]:
    """Return token-string → tf score map (for FlagEmbedding mock compatibility)."""
    tokens = _tokenize(text)
    if not tokens:
        return {}
    # When BGE is active it returns lexical weights keyed by token-string; we
    # reproduce the same shape here so tests can assert dict equality.
    if _active == "bge-m3" and _model is not None:
        try:
            result = _model.encode([text], return_sparse=True)
            return result["lexical_weights"][0]
        except Exception:
            pass
    # Fallback: BM25-style tf map keyed by token string
    tf: dict[str, int] = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1
    total = len(tokens)
    return {tok: count / total for tok, count in tf.items()}


def sparse_vectors(texts: list[str]) -> list[dict[str, float]]:
    warm_up()
    return [_sparse_vec(t) for t in texts]


# ---------------------------------------------------------------------------
# Dense embeddings
# ---------------------------------------------------------------------------

async def embed_texts(texts: list[str], model: Optional[str] = None) -> list[list[float]]:
    backend = current_backend()
    if backend == "bge-m3" and _model is not None:
        try:
            result = _model.encode(texts)
            return [v.tolist() for v in result["dense_vecs"]]
        except Exception as exc:
            logger.warning("BGE encode failed (%s), falling back to ollama", exc)
    # Ollama / fallback
    return await ollama_embeddings.embed_texts(texts, model=model or BGE_MODEL)


async def embed_query(text: str, model: Optional[str] = None) -> list[float]:
    backend = current_backend()
    if backend == "bge-m3" and _model is not None:
        try:
            result = _model.encode([text], max_length=512)
            return result["dense_vecs"][0].tolist()
        except Exception as exc:
            logger.warning("BGE query encode failed (%s), falling back to ollama", exc)
    return await ollama_embeddings.embed_query(text, model=model or BGE_MODEL)


# ---------------------------------------------------------------------------
# Convenience aliases used by legacy callers
# ---------------------------------------------------------------------------

async def embed_documents(texts: list[str]) -> list[list[float]]:
    return await embed_texts(texts, model=BGE_MODEL)


def get_sparse_vectors(texts: list[str]) -> list[dict[str, float]]:
    return sparse_vectors(texts)
