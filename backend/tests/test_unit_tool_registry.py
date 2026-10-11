"""Every tool registered for the ReAct agents must import and run.

Handlers are called through agent_framework.call_tool_by_name with a minimal
valid input (each schema's required params) against an in-memory fake DB —
no Mongo, no network, no LLM.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, patch

import pytest

MINIMAL_ARGS = {
    "country_id": "us",
    "query": "student visa",
    "university_id": "mit",
    "passport": "IN",
    "destination": "US",
    "namespace": "visa_guides",
}


class _Cursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def limit(self, n):
        return _Cursor(self._docs[:n])

    def __aiter__(self):
        self._it = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _Collection:
    def __init__(self, docs):
        self._docs = docs

    async def find_one(self, query, projection=None):
        return next((d for d in self._docs if all(d.get(k) == v for k, v in query.items())), None)

    def find(self, query=None, projection=None):
        return _Cursor(self._docs)


class _FakeDB(dict):
    def __missing__(self, name):
        return _Collection([])


FAKE_DB = _FakeDB(universities_v2=_Collection([{"id": "mit", "name": "MIT", "country": "us"}]))


def _registered_tools():
    import tool_registry
    tool_registry._tools.clear()
    tool_registry.register_all()
    return tool_registry.list_tools()


def test_registry_has_no_unbacked_tools():
    names = {t.name for t in _registered_tools()}
    assert {"visa_lookup", "rag_search", "lookup_country", "search_universities"} <= names
    assert not names & {"document_extract", "trip_plan", "loan_referral"}


@pytest.mark.asyncio
@pytest.mark.parametrize("tool_name", [t.name for t in _registered_tools()])
async def test_every_registered_tool_runs(tool_name):
    from agent_framework import call_tool_by_name
    import tool_registry

    tool = tool_registry.get_tool(tool_name) or {t.name: t for t in _registered_tools()}[tool_name]
    required = tool.parameters.get("required", [])
    args = {k: MINIMAL_ARGS[k] for k in required}

    with patch("eva_tools.db", FAKE_DB), \
         patch("ollama_embeddings.embed_query", new=AsyncMock(return_value=[0.1] * 8)), \
         patch("vector_store.query_collection", return_value=[{"id": "c1", "document": "doc", "metadata": {}, "distance": 0.1}]):
        result, error = await call_tool_by_name(tool_name, args)

    assert error is None, f"{tool_name} raised: {error}"
    if isinstance(result, dict):
        assert "error" not in result, f"{tool_name} returned error: {result['error']}"


@pytest.mark.asyncio
async def test_visa_lookup_falls_back_to_local_data_without_visahq_key():
    from tool_registry import _visa_lookup_impl
    with patch("adapters.visahq_adapter.VISA_HQ_API_KEY", ""):
        res = await _visa_lookup_impl("IN", "US", "study")
    assert res["provider"] == "wehive_data"
    assert res["requirements"]["name"] == "United States" or res["requirements"].get("country") == "United States"
    assert res["checked_at"]
