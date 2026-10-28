"""Student memory — Mem0 persistent memory per user across chat sessions.
Falls back to a no-op when mem0ai is not installed.
"""
from __future__ import annotations
import logging
import config

logger = logging.getLogger("wehive.student_memory")


class _NoOpMemory:
    def add(self, *a, **kw): pass
    def search(self, *a, **kw): return {"results": []}
    def get_all(self, *a, **kw): return {"results": []}
    def delete_all(self, *a, **kw): pass


def _build_memory():
    try:
        from mem0 import Memory
        cfg = {
            "vector_store": {
                "provider": "qdrant",
                "config": {
                    "url": config.QDRANT_URL,
                    "api_key": config.QDRANT_API_KEY or None,
                    "collection_name": "wehive_student_memory",
                },
            },
            "llm": {
                "provider": "ollama",
                "config": {"model": "llama3.2", "ollama_base_url": "http://localhost:11434"},
            },
            "embedder": {
                "provider": "ollama",
                "config": {"model": "bge-m3", "ollama_base_url": "http://localhost:11434"},
            },
        }
        m = Memory.from_config(cfg)
        logger.info("Mem0 student memory enabled (Qdrant backend)")
        return m
    except ImportError:
        logger.info("mem0ai not installed — student memory disabled")
        return _NoOpMemory()
    except Exception as e:
        logger.warning("Mem0 init failed: %s — disabled", e)
        return _NoOpMemory()


_mem = _build_memory()


class StudentMemory:

    @staticmethod
    def add(user_id: str, message: str, role: str = "user") -> None:
        try:
            _mem.add(message, user_id=user_id, metadata={"role": role})
        except Exception as e:
            logger.debug("Memory add failed: %s", e)

    @staticmethod
    def search(user_id: str, query: str, limit: int = 5) -> list[dict]:
        try:
            results = _mem.search(query, user_id=user_id, limit=limit)
            return results.get("results", []) if isinstance(results, dict) else []
        except Exception as e:
            logger.debug("Memory search failed: %s", e)
            return []

    @staticmethod
    def get_profile_summary(user_id: str) -> str:
        try:
            all_mems = _mem.get_all(user_id=user_id)
            results = all_mems.get("results", []) if isinstance(all_mems, dict) else []
            if not results:
                return ""
            return "\n".join(f"- {m['memory']}" for m in results[:10])
        except Exception:
            return ""

    @staticmethod
    def forget(user_id: str) -> None:
        try:
            _mem.delete_all(user_id=user_id)
        except Exception as e:
            logger.warning("Memory forget failed for %s: %s", user_id, e)


student_memory = StudentMemory()
