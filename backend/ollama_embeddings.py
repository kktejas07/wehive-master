"""Ollama Embeddings — local embedding model client.

Calls a running Ollama server's /api/embeddings endpoint.
Falls back to a deterministic hash-based stub when Ollama is unavailable
so imports and unit tests do not require a live daemon.

Recommended models (run `ollama pull <model>` first):
  - nomic-embed-text   (768-dim, fast, English)
  - mxbai-embed-large  (1024-dim, multilingual)
  - all-minilm         (384-dim, very fast)
"""

from __future__ import annotations

import hashlib
import logging
import math
import os
from typing import List, Optional

import httpx

logger = logging.getLogger("wehive.ollama_embeddings")

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_EMBED_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "30"))

_DIM_CACHE: dict[str, int] = {}
_available: Optional[bool] = None


async def is_available() -> bool:
    """Lazy health check — does Ollama respond on /api/tags?"""
    global _available
    if _available is not None:
        return _available
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{OLLAMA_HOST}/api/tags")
            _available = r.status_code == 200
    except Exception:
        _available = False
    if _available:
        logger.info("Ollama embeddings ready @ %s model=%s", OLLAMA_HOST, OLLAMA_EMBED_MODEL)
    return _available


def _stub_vector(text: str, dim: int = 384) -> List[float]:
    """Deterministic hash-based pseudo-embedding for offline / test mode.

    Not a real semantic embedding. Same text → same vector. Used only when
    Ollama is unreachable so the rest of the stack keeps working.
    """
    h = hashlib.sha512(text.encode("utf-8")).digest()
    out: List[float] = []
    for i in range(dim):
        b = h[i % len(h)]
        v = ((b / 255.0) - 0.5) * 2.0
        out.append(v)
    n = math.sqrt(sum(x * x for x in out)) or 1.0
    return [x / n for x in out]


async def embed_texts(
    texts: List[str],
    model: Optional[str] = None,
    *,
    raise_on_offline: bool = False,
) -> List[List[float]]:
    """Embed a batch of texts via Ollama.

    Returns one vector per input text. If Ollama is offline and
    `raise_on_offline` is False, returns deterministic stub vectors so
    callers can still operate (RAG falls back to keyword retrieval).
    """
    if not texts:
        return []
    chosen = (model or OLLAMA_EMBED_MODEL).strip() or OLLAMA_EMBED_MODEL
    if not await is_available():
        if raise_on_offline:
            raise RuntimeError("Ollama is not available at " + OLLAMA_HOST)
        logger.debug("Ollama offline — using stub embeddings for %d texts", len(texts))
        return [_stub_vector(t) for t in texts]

    vectors: List[List[float]] = []
    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
        for t in texts:
            try:
                r = await client.post(
                    f"{OLLAMA_HOST}/api/embeddings",
                    json={"model": chosen, "prompt": t},
                )
                r.raise_for_status()
                data = r.json()
                vec = data.get("embedding") or []
                if not vec:
                    vec = _stub_vector(t)
                vectors.append(vec)
            except Exception as e:
                logger.warning("Ollama embed failed for text (%d chars): %s", len(t), e)
                vectors.append(_stub_vector(t))
    if vectors:
        _DIM_CACHE[chosen] = len(vectors[0])
    return vectors


async def embed_query(text: str, model: Optional[str] = None) -> List[float]:
    """Convenience: embed a single query string."""
    out = await embed_texts([text], model=model)
    return out[0] if out else []


def get_model_dim(model: Optional[str] = None) -> int:
    """Best-effort dimension for a model (from cache or env default)."""
    m = model or OLLAMA_EMBED_MODEL
    return _DIM_CACHE.get(m, 768)


def reset_availability_cache() -> None:
    """For tests: clear the health check so a re-probe happens."""
    global _available
    _available = None
