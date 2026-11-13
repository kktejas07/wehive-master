"""Wise embeddings — thin wrapper that reuses the project's embeddings_bge backend.

Falls back to a deterministic hash stub so the RAG flow never crashes in test/CI.
"""
from __future__ import annotations

import hashlib
import logging
import os
from typing import List

logger = logging.getLogger("wehive.wise.embeddings")

EMBEDDING_DIM = int(os.getenv("WISE_EMBEDDING_DIM", "768"))
_backend: str | None = None


def _hash_embed(text: str) -> List[float]:
    """Deterministic stub — 768-dim unit vector from SHA-256."""
    seed = hashlib.sha256(text.encode()).digest()
    vec = []
    for i in range(0, min(len(seed), EMBEDDING_DIM), 1):
        vec.append((seed[i % len(seed)] / 127.5) - 1.0)
    while len(vec) < EMBEDDING_DIM:
        vec.append(0.0)
    norm = sum(x * x for x in vec) ** 0.5 or 1.0
    return [x / norm for x in vec[:EMBEDDING_DIM]]


async def embed(text: str) -> List[float]:
    """Return a dense embedding vector for *text*.

    Priority:
      1. embeddings_bge (BGE-M3 or Ollama) — if importable and warmed up
      2. sentence-transformers all-MiniLM-L6-v2 — if installed
      3. Hash stub (always works, used in CI)
    """
    global _backend

    # --- Try embeddings_bge (project's own backend) ---
    if _backend != "stub":
        try:
            import embeddings_bge as bge  # noqa: PLC0415
            backend = bge.warm_up()
            vec = bge.embed(text)
            if vec:
                _backend = backend
                return vec
        except Exception as exc:
            logger.debug("embeddings_bge unavailable: %s", exc)

    # --- Try sentence-transformers ---
    if _backend not in ("stub", "bge", "ollama"):
        try:
            from sentence_transformers import SentenceTransformer  # noqa: PLC0415
            _st_model = SentenceTransformer("all-MiniLM-L6-v2")
            vec = _st_model.encode(text, normalize_embeddings=True).tolist()
            _backend = "sentence-transformers"
            return vec
        except Exception as exc:
            logger.debug("sentence-transformers unavailable: %s", exc)

    # --- Hash stub ---
    _backend = "stub"
    return _hash_embed(text)
