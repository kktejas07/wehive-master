"""Langfuse observability — Langfuse Python SDK v5.

Exports:
  observe              — @observe decorator (no-op stub when Langfuse is unconfigured)
  propagate_attrs      — context manager to attach user_id / session_id to a trace
  get_callback_handler — LangChain/LangGraph CallbackHandler (returns None when unconfigured)
  flush                — async flush for server shutdown
"""
from __future__ import annotations
import logging
import config

logger = logging.getLogger("wehive.observability")

_enabled = False

if config.LANGFUSE_PUBLIC_KEY and config.LANGFUSE_SECRET_KEY:
    try:
        import os
        os.environ.setdefault("LANGFUSE_PUBLIC_KEY", config.LANGFUSE_PUBLIC_KEY)
        os.environ.setdefault("LANGFUSE_SECRET_KEY", config.LANGFUSE_SECRET_KEY)
        os.environ.setdefault("LANGFUSE_HOST", config.LANGFUSE_HOST)
        from langfuse import get_client, observe, propagate_attributes
        get_client()  # initialise singleton; reads env vars set above
        _enabled = True
        logger.info("Langfuse observability enabled at %s", config.LANGFUSE_HOST)
    except ImportError:
        logger.warning("langfuse package not installed — observability disabled")
    except Exception as exc:
        logger.warning("Langfuse init failed: %s", exc)

if not _enabled:
    # Transparent no-op stubs so the rest of the codebase needs no try/except
    import functools

    def observe(name: str = None, as_type: str = None, capture_input: bool = True,
                capture_output: bool = True, **_kw):
        def decorator(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await func(*args, **kwargs)
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                return func(*args, **kwargs)
            import inspect
            return async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper
        return decorator

    class _NoOpCtx:
        def __enter__(self): return self
        def __exit__(self, *_): pass

    def propagate_attributes(**_kw):
        return _NoOpCtx()


def get_callback_handler(**kwargs) -> object | None:
    """Return a Langfuse LangChain/LangGraph CallbackHandler, or None when disabled."""
    if not _enabled:
        return None
    try:
        from langfuse.langchain import CallbackHandler
        return CallbackHandler(**kwargs)
    except Exception as exc:
        logger.debug("CallbackHandler unavailable: %s", exc)
        return None


async def flush() -> None:
    """Flush and shut down Langfuse background worker. Call once on server shutdown."""
    if not _enabled:
        return
    try:
        from langfuse import get_client
        get_client().flush()
    except Exception:
        pass
