"""BGE-M3 embeddings — self-hosted, no API cost (BAAI/bge-m3: 1024-dim dense + sparse).

Same async interface as ollama_embeddings (embed_texts / embed_query), so RAG
callers import from here instead.

The model loads once per process, lazily or via warm_up() at startup: it is a
~2.2 GB download and needs FlagEmbedding + torch (requirements-ml.txt). If those
are missing or loading fails, the process uses Ollama for its whole lifetime.
The choice is never made per call, because BGE-M3 (1024) and Ollama (768, or the
384-dim offline stub) vectors cannot share a collection; vector_store keeps
BGE-M3 vectors in their own Chroma directory.
"""

from __future__ import annotations

import asyncio
import logging
import os
import threading
from typing import List, Optional

import ollama_embeddings

logger = logging.getLogger("wehive.embeddings")

EMBEDDINGS_BACKEND = os.environ.get("EMBEDDINGS_BACKEND", "bge-m3")  # "bge-m3" or "ollama"
BGE_MODEL = os.environ.get("BGE_MODEL", "BAAI/bge-m3")
BGE_MAX_LENGTH = int(os.environ.get("BGE_MAX_LENGTH", "512"))
BGE_BATCH_SIZE = int(os.environ.get("BGE_BATCH_SIZE", "12"))

_model = None
_backend: Optional[str] = None
_load_lock = threading.Lock()
_encode_lock = threading.Lock()  # one encode at a time: torch already uses every core


def active_backend() -> str:
    """'bge-m3' or 'ollama' for this process. Loads the model on first call (blocking)."""
    global _model, _backend
    if _backend:
        return _backend
    with _load_lock:
        if _backend:
            return _backend
        if EMBEDDINGS_BACKEND == "bge-m3":
            try:
                import torch
                from FlagEmbedding import BGEM3FlagModel

                # fp16 only pays off on a GPU; on CPU it is slower or unsupported.
                _model = BGEM3FlagModel(BGE_MODEL, use_fp16=torch.cuda.is_available())
                _backend = "bge-m3"
                logger.info("BGE-M3 embeddings ready (%s)", BGE_MODEL)
            except Exception as e:
                logger.warning("BGE-M3 unavailable, using Ollama embeddings: %s", e)
        _backend = _backend or "ollama"
        return _backend


def current_backend() -> Optional[str]:
    """The backend if already chosen, without loading anything (for status endpoints)."""
    return _backend


def _encode(texts: List[str], *, query: bool = False, sparse: bool = False) -> dict:
    fn = _model.encode_queries if query else _model.encode
    with _encode_lock:
        return fn(texts, batch_size=BGE_BATCH_SIZE, max_length=BGE_MAX_LENGTH,
                  return_dense=not sparse, return_sparse=sparse)


async def embed_texts(texts: List[str], model: Optional[str] = None) -> List[List[float]]:
    """Embed passages for storage. `model` is only used by the Ollama fallback."""
    if not texts:
        return []
    if await asyncio.to_thread(active_backend) != "bge-m3":
        return await ollama_embeddings.embed_texts(texts, model=model)
    out = await asyncio.to_thread(_encode, list(texts))
    return out["dense_vecs"].tolist()


async def embed_query(text: str, model: Optional[str] = None) -> List[float]:
    """Embed a search query."""
    if await asyncio.to_thread(active_backend) != "bge-m3":
        return await ollama_embeddings.embed_query(text, model=model)
    out = await asyncio.to_thread(_encode, [text], query=True)
    return out["dense_vecs"][0].tolist()


def sparse_vectors(texts: List[str]) -> List[dict]:
    """BGE-M3 lexical weights ({token_id: weight}) for hybrid search; empty dicts without BGE-M3."""
    if not texts or active_backend() != "bge-m3":
        return [{} for _ in texts]
    out = _encode(list(texts), sparse=True)
    return [{str(k): float(v) for k, v in w.items()} for w in out["lexical_weights"]]


def warm_up() -> str:
    """Load the model and run one tiny encode so the first real request is fast."""
    backend = active_backend()
    if backend == "bge-m3":
        _encode(["warm up"], query=True)
    return backend


def reset() -> None:
    """For tests: forget the chosen backend and model."""
    global _model, _backend
    _model = None
    _backend = None
