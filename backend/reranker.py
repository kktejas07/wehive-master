"""FlashRank cross-encoder reranker (MIT license, ~90MB model)."""
from __future__ import annotations
import logging

logger = logging.getLogger("wehive.reranker")


class _LazyReranker:
    def __init__(self):
        self._ranker = None

    def _load(self):
        if self._ranker is None:
            try:
                from flashrank import Ranker
                self._ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp/flashrank")
                logger.info("FlashRank reranker loaded")
            except ImportError:
                logger.warning("flashrank not installed — reranker disabled")
                self._ranker = False
        return self._ranker

    def rerank(self, query: str, documents: list[dict], top_n: int = 5) -> list[dict]:
        ranker = self._load()
        if not ranker:
            return documents[:top_n]
        try:
            from flashrank import RerankRequest
            passages = [{"id": i, "text": d.get("text", "")} for i, d in enumerate(documents)]
            request = RerankRequest(query=query, passages=passages)
            results = ranker.rerank(request)
            reranked = sorted(results, key=lambda x: x["score"], reverse=True)[:top_n]
            return [documents[r["id"]] for r in reranked]
        except Exception as e:
            logger.warning("Rerank failed: %s", e)
            return documents[:top_n]


reranker = _LazyReranker()
