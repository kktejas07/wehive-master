"""Regression tests for the AI agent / LLM path fixes (chatbot context,
tool registration, model-router failover, marketplace signatures, concierge,
Hive self-learning, intent routing, Stark HTTP client). No network, no LLM."""

import copy
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, patch

import pytest


def _country(code):
    from data import get_country
    return copy.deepcopy(get_country(code))


# ── 1. chatbot context: categories is a dict ────────────────────────────────

@pytest.mark.asyncio
async def test_chatbot_gather_context_with_country_code():
    import routes_chatbot as rc
    with patch.object(rc, "lookup_country", new=AsyncMock(side_effect=lambda c: _country(c))), \
         patch.object(rc, "get_application_fee", new=AsyncMock(return_value={"fee_inr": 20000})), \
         patch.object(rc, "search_universities", new=AsyncMock(return_value=[])):
        ctx = await rc._gather_context("What is the visa fee for us?")
    assert "United States" in ctx
    assert "B1/B2 Visitor" in ctx


# ── 2. tools registered for ReAct agents ───────────────────────────────────

def test_register_all_gives_hive_agents_tools():
    import tool_registry
    from agent_framework import get_tool_descriptions
    tool_registry.register_all()
    tool_registry.register_all()  # idempotent
    desc = get_tool_descriptions(["visa_lookup", "rag_search", "lookup_country", "get_application_fee"])
    assert "(no tools available)" not in desc
    for name in ("visa_lookup", "rag_search", "lookup_country", "get_application_fee"):
        assert f"- {name}(" in desc


# ── 3. model router: no fallback cycle recursion ────────────────────────────

@pytest.mark.asyncio
async def test_model_router_fallback_cycle_circuit_open_returns_503():
    import model_router as mr
    with patch.object(mr._orchestrator_breaker, "allow", return_value=False):
        res = await mr.chat_with_profile("fast_cheap", [{"role": "user", "content": "hi"}])
    assert res.get("status") == 503
    assert "error" in res


@pytest.mark.asyncio
async def test_model_router_fallback_cycle_provider_errors_returns_503():
    import model_router as mr
    route = AsyncMock(return_value=(None, 500))
    with patch.object(mr._orchestrator_breaker, "allow", return_value=True), \
         patch.object(mr._orchestrator_breaker, "record_failure", new=AsyncMock()), \
         patch.object(mr._orchestrator_vault, "get_account", new=AsyncMock(return_value=None)), \
         patch.object(mr, "_route_provider", new=route):
        res = await mr.chat_with_profile("google_gemini_flash", [{"role": "user", "content": "hi"}])
    assert res.get("status") == 503
    assert route.await_count == 2  # google_gemini_flash -> fast_cheap, then stop


def test_model_router_has_no_duplicate_circuit_breaker():
    import model_router as mr
    from orchestrator.failover import CircuitBreaker
    assert mr.CircuitBreaker is CircuitBreaker
    assert not hasattr(mr, "_circuit_breaker")
    assert not hasattr(mr, "_orchestrator_failover")


# ── 4. ai operations use marketplace.chat(user_id, system, prompt) ──────────

@pytest.mark.asyncio
async def test_ai_operations_marketplace_signature():
    import routes_ai_operations as ops
    from ai_marketplace import marketplace
    chat = AsyncMock(return_value='```json\n{"results": [], "total": 0}\n```')
    with patch.object(marketplace, "chat", new=chat):
        res = await ops.smart_search(ops.SmartSearchRequest(query="visa"), user={"_id": "u1"})
        brief = await ops.ai_briefing(ops.BriefingRequest(topic="UK visas"), user={"_id": "u1"})
    assert res["ok"] is True and res["total"] == 0
    assert brief["ok"] is True
    args, kwargs = chat.await_args_list[0]
    assert args[0] == "u1" and "Search for: visa" in args[2]
    assert kwargs == {"max_tokens": 1024}


# ── 5. concierge with real (dict) categories ────────────────────────────────

@pytest.mark.asyncio
async def test_concierge_start_with_dict_categories():
    import agents.concierge as c
    with patch.object(c, "lookup_country", new=AsyncMock(return_value=_country("uk"))), \
         patch.object(c, "get_application_fee", new=AsyncMock(return_value={"fee_inr": 20000})):
        res = await c.start_concierge("u-fix", "uk", "student")
    assert res["requirements"]["visa_type"] == "student"
    assert res["requirements"]["documents"]


# ── 6. Hive self-learning: off by default, pending-only ─────────────────────

def test_self_learn_disabled_by_default(monkeypatch):
    import feed_miner
    monkeypatch.delenv("HIVE_SELF_LEARN", raising=False)
    assert feed_miner.self_learn_enabled() is False
    monkeypatch.setenv("HIVE_SELF_LEARN", "1")
    assert feed_miner.self_learn_enabled() is True


@pytest.mark.asyncio
async def test_auto_apply_recent_stores_pending_not_applied():
    import feed_miner as fm
    proposal = {
        "ok": True, "prompt_id": "system.hive_visa", "current_version": 1, "proposed_version": 2,
        "current_system": "alpha beta gamma", "new_system": "totally different words here", "changes": [],
    }
    coll = AsyncMock()
    coll.count_documents = AsyncMock(return_value=50)
    with patch.object(fm, "db", {fm.FEED_COLL: coll}), \
         patch.object(fm, "propose_prompt_edits", new=AsyncMock(return_value=proposal)), \
         patch.object(fm, "save_proposal", new=AsyncMock()) as save, \
         patch.object(fm, "apply_prompt_edit", new=AsyncMock()) as apply_edit:
        res = await fm.auto_apply_recent(agent_ids=["hive_visa"])
    apply_edit.assert_not_awaited()
    save.assert_awaited_once()
    assert res["pending"] and not res["applied"]
    # learning corpus excludes anonymous feeds
    query = coll.count_documents.await_args.args[0]
    assert query["user_id"] == {"$nin": ["", None]}


def test_agents_v2_run_requires_auth():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    import routes_agents_v2
    app = FastAPI()
    app.include_router(routes_agents_v2.router)
    r = TestClient(app).post("/agents-v2/hive_visa/run", json={"input": "hi"})
    assert r.status_code == 401


# ── 7. readiness / proactive: no discarded LLM calls ────────────────────────

def test_rule_based_agents_have_no_llm_summary():
    import agents.document_readiness as dr
    import agents.proactive_support as ps
    assert not hasattr(dr, "llm_document_assessment")
    assert not hasattr(ps, "llm_behavior_insight")


# ── 8/9. shared intent classifier + local templates + Stark client ──────────

def test_score_intents_document_question_beats_visa():
    from agents.orchestrator import score_intents
    assert score_intents("What documents do I need for a UK student visa?")[0]["intent"] == "documents"
    assert score_intents("hello")[0]["intent"] == "greeting"
    assert score_intents("visa fee for canada")[0]["intent"] == "fees"
    assert score_intents("") == []


@pytest.mark.asyncio
async def test_local_template_answers_document_question():
    import local_llm
    with patch.object(local_llm, "_check_ollama", new=AsyncMock(return_value=False)), \
         patch.object(local_llm, "_semantic_classify", return_value=""), \
         patch.object(local_llm, "lookup_country", new=AsyncMock(side_effect=lambda c: _country(c))):
        reply = await local_llm.local_chat("What documents do I need for a uk student visa?")
        fees = await local_llm.local_chat("visa fee for us")
    assert "University admit letter" in reply
    assert "B1/B2 Visitor" in fees


def test_stark_client_sends_user_agent_and_follows_redirects():
    from agents import stark_agent
    client = stark_agent._client()
    assert client.follow_redirects is True
    assert "WeHiveStark" in client.headers["User-Agent"]
