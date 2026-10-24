"""Semantic chunking for RAG ingest (Chonkie SemanticChunker).

Splits a long document where the topic shifts instead of every N tokens.
Boundaries are decided with a small static model2vec embedding (no torch, a
few MB); the stored vectors still come from embeddings_bge. Loads lazily; if
chonkie is not installed (requirements-ml.txt), semantic_chunks() returns None
and rag_ingest falls back to its sentence-window chunker.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import List, Optional

logger = logging.getLogger("wehive.chunker")

CHUNK_EMBED_MODEL = os.environ.get("CHUNK_EMBED_MODEL", "minishlab/potion-base-8M")
SEMANTIC_CHUNK_SIZE = int(os.environ.get("SEMANTIC_CHUNK_SIZE", "512"))  # tokens; BGE-M3 reads 512
SEMANTIC_THRESHOLD = float(os.environ.get("SEMANTIC_THRESHOLD", "0.5"))  # split below this similarity

_chunker = None
_unavailable = False
_lock = threading.Lock()


def _get_chunker():
    global _chunker, _unavailable
    if _chunker is not None or _unavailable:
        return _chunker
    with _lock:
        if _chunker is None and not _unavailable:
            try:
                from chonkie import SemanticChunker

                _chunker = SemanticChunker(
                    embedding_model=CHUNK_EMBED_MODEL,
                    chunk_size=SEMANTIC_CHUNK_SIZE,
                    threshold=SEMANTIC_THRESHOLD,
                    min_sentences_per_chunk=2,
                )
            except Exception as e:
                _unavailable = True
                logger.warning("Semantic chunker unavailable, using fixed-size chunks: %s", e)
    return _chunker


def semantic_chunks(text: str) -> Optional[List[str]]:
    """Topic-aware chunks of `text`, or None when the semantic chunker is unavailable."""
    chunker = _get_chunker()
    if chunker is None:
        return None
    return [c.text.strip() for c in chunker.chunk(text) if c.text.strip()]
