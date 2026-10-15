"""Agentic AI Routes — Hive+Stark dual-agent orchestration system.

Architecture:
  Hive (orchestrator) — Routes intents, manages conversation, delegates tasks
  Stark (sub-agent)    — Fetches external open-source data (Wikipedia, KG, arXiv, GitHub)

Endpoints:
  POST /api/agentic/hive/ask          — Ask Hive a question (orchestrates Stark if needed)
  POST /api/agentic/stark/search      — Direct Stark external data search
  POST /api/agentic/stark/research    — Deep Stark research across multiple sources
  GET  /api/agentic/stark/context     — Get Stark context for RAG injection
  POST /api/agentic/workflow          — Run a Hive+Stark multi-step workflow
  GET  /api/agentic/status            — Hive+Stark system status
"""

import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from agents.orchestrator import score_intents
from auth_utils import get_current_user, get_current_user_optional
from ollama_embeddings import OLLAMA_HOST
from rate_limit import RateLimit

router = APIRouter(prefix="/agentic", tags=["agentic-ai"])
logger = logging.getLogger("wehive.agentic")
_hive_limiter = RateLimit(max_calls=30, window_seconds=60)

STARK_ENABLED = os.environ.get("STARK_ENABLED", "1") == "1"
HIVE_MODEL = os.environ.get("HIVE_MODEL", "")


def _user_id(user) -> str:
    """Mongo user docs use `_id`; tolerate `id`, objects, and anonymous callers."""
    if isinstance(user, dict):
        return str(user.get("id") or user.get("_id") or "system")
    return str(getattr(user, "id", None) or "system")


class HiveAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=8000)
    use_stark: bool = Field(True, description="Auto-delegate to Stark for external data")
    max_stark_sources: int = Field(3, ge=1, le=6)
    session_id: Optional[str] = None


class StarkSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    sources: Optional[list[str]] = None
    max_sources: int = Field(3, ge=1, le=10)


class WorkflowRequest(BaseModel):
    task: str = Field(..., min_length=5, max_length=2000)
    steps: Optional[list[str]] = None
    use_stark: bool = True


AI_UNAVAILABLE_MSG = (
    "Hive's AI assistant is unavailable right now, so I can't give a reliable answer. "
    "Please try again in a few minutes, or contact the We Hive team for help."
)


def _detect_intents(question: str) -> list[dict]:
    return score_intents(question)[:3]


def _should_delegate_to_stark(question: str, intents: list[dict]) -> bool:
    stark_intents = {"country_info", "open_source", "technical"}
    if not intents:
        return True
    top_intent = intents[0]["intent"]
    if top_intent in stark_intents:
        return True
    if top_intent == "visa_qa":
        if any(w in question.lower() for w in ["latest", "news", "change", "update", "recent", "trend"]):
            return True
    return False


@router.post("/hive/ask")
async def hive_ask(
    req: HiveAskRequest,
    user=Depends(get_current_user_optional),
    _rl=Depends(_hive_limiter),
):
    """Hive answers questions. Auto-delegates external research to Stark when needed."""

    intents = _detect_intents(req.question)
    delegate_to_stark = req.use_stark and _should_delegate_to_stark(req.question, intents)
    stark_context = ""

    if delegate_to_stark and STARK_ENABLED:
        try:
            from agents.stark_agent import stark_context_for_rag, stark_research
            stark_result = await stark_research(req.question)
            stark_context = stark_context_for_rag(stark_result)
        except Exception as e:
            logger.warning("Stark delegation failed: %s", e)

    try:
        from ai_marketplace import marketplace
        system_prompt = (
            "You are Hive, the intelligent visa and travel assistant for We Hive Immigration Services. "
            "You are an orchestrator agent: you coordinate with Stark (your external research sub-agent) "
            "to bring accurate, up-to-date information to users.\n\n"
        )

        if stark_context:
            system_prompt += (
                f"Stark has fetched the following external context for you:\n\n"
                f"{stark_context}\n\n"
                f"Use this context to provide an accurate answer. Cite the sources."
            )
        else:
            system_prompt += (
                "Answer the user's question using your knowledge. Be concise (2-4 sentences). "
                "For visa questions, always mention specific requirements and fees where available."
            )

        response = await marketplace.chat(
            user_id=_user_id(user),
            system_prompt=system_prompt,
            user_prompt=req.question,
        )
        answer = response[0] if isinstance(response, tuple) else response
        answer = answer if isinstance(answer, str) else str(answer)

        return {
            "ok": True,
            "answer": answer,
            "intents_detected": intents,
            "stark_delegated": delegate_to_stark,
            "stark_context_used": bool(stark_context),
            "model": HIVE_MODEL or "default",
        }

    except Exception as e:
        # marketplace.chat already tried BYOK -> free pool -> local engine.
        logger.warning("Hive chat unavailable: %s", e)
        answer = AI_UNAVAILABLE_MSG
        if stark_context:
            answer += "\n\nHere is what I found in public sources:\n\n" + stark_context[:1500]
        return {
            "ok": False,
            "answer": answer,
            "intents_detected": intents,
            "stark_delegated": delegate_to_stark,
            "stark_context_used": bool(stark_context),
            "fallback": "unavailable",
        }


@router.post("/stark/search")
async def stark_search(req: StarkSearchRequest, user=Depends(get_current_user)):
    """Direct call to Stark for external open-source data search."""

    if not STARK_ENABLED:
        raise HTTPException(status_code=503, detail="Stark agent is disabled (STARK_ENABLED=0)")

    try:
        from agents.stark_agent import stark_search as _stark_search
        result = await _stark_search(req.query)
        return {
            "ok": True,
            **result,
        }
    except Exception as e:
        logger.exception("Stark search failed")
        raise HTTPException(status_code=502, detail="Stark search failed")


@router.post("/stark/research")
async def stark_research_endpoint(req: StarkSearchRequest, user=Depends(get_current_user)):
    """Deep research: enriches search with Wikipedia summaries and Knowledge Graph."""

    if not STARK_ENABLED:
        raise HTTPException(status_code=503, detail="Stark agent is disabled")

    try:
        from agents.stark_agent import stark_research, stark_context_for_rag
        result = await stark_research(req.query)
        rag_context = stark_context_for_rag(result)

        return {
            "ok": True,
            **result,
            "rag_context": rag_context,
        }
    except Exception as e:
        logger.exception("Stark research failed")
        raise HTTPException(status_code=502, detail="Stark research failed")


@router.get("/stark/context")
async def get_stark_context(q: str, user=Depends(get_current_user)):
    """Get Stark-generated context suitable for RAG injection."""

    if not STARK_ENABLED:
        raise HTTPException(status_code=503, detail="Stark agent is disabled")

    try:
        from agents.stark_agent import stark_research, stark_context_for_rag
        result = await stark_research(q)
        context = stark_context_for_rag(result)
        return {
            "ok": True,
            "context": context,
            "query": q,
        }
    except Exception as e:
        logger.exception("Context generation failed")
        raise HTTPException(status_code=502, detail="Context generation failed")


@router.post("/workflow")
async def run_workflow(
    req: WorkflowRequest,
    user=Depends(get_current_user),
):
    """Multi-step Hive+Stark workflow: research → analyze → answer."""

    steps = req.steps or ["research", "analyze", "answer"]
    results = []

    try:
        from agents.stark_agent import stark_research, stark_context_for_rag

        for step in steps:
            if step == "research" and req.use_stark:
                stark_result = await stark_research(req.task)
                context = stark_context_for_rag(stark_result)
                results.append({"step": "research", "source": "stark", "context": context})

            elif step == "analyze":
                from ai_marketplace import marketplace
                context = results[-1].get("context", "") if results else ""
                analysis_prompt = (
                    f"You are Hive. Analyze the following task and external research context:\n\n"
                    f"Task: {req.task}\n\n"
                    f"Research Context: {context or 'No external data available.'}\n\n"
                    f"Provide a detailed analysis covering key facts, considerations, and actionable insights."
                )
                resp = await marketplace.chat(
                    user_id=_user_id(user),
                    system_prompt="You are an analytical AI agent. Be thorough and structured.",
                    user_prompt=analysis_prompt,
                )
                analysis = resp if isinstance(resp, str) else str(resp)
                results.append({"step": "analyze", "analysis": analysis})

            elif step == "answer":
                context = ""
                analysis = ""
                for r in results:
                    if "context" in r:
                        context = r["context"]
                    if "analysis" in r:
                        analysis = r["analysis"]

                from ai_marketplace import marketplace
                answer_prompt = (
                    f"Task: {req.task}\n\n"
                    f"Research: {context}\n\n"
                    f"Analysis: {analysis}\n\n"
                    f"Provide a concise, helpful final answer to the user."
                )
                resp = await marketplace.chat(
                    user_id=_user_id(user),
                    system_prompt="You are Hive, a helpful visa and travel assistant. Be concise.",
                    user_prompt=answer_prompt,
                )
                answer = resp if isinstance(resp, str) else str(resp)
                results.append({"step": "answer", "answer": answer})

        return {
            "ok": True,
            "task": req.task,
            "steps_completed": len(results),
            "results": results,
            "final_answer": next((r.get("answer") for r in reversed(results) if "answer" in r), ""),
        }

    except Exception as e:
        logger.exception("Workflow failed")
        raise HTTPException(status_code=502, detail="Workflow failed")


@router.get("/status")
async def agentic_status():
    from agents.stark_agent import stark_sources_status

    marketplace_available = False
    try:
        from ai_marketplace import marketplace
        marketplace_available = marketplace is not None
    except Exception:
        pass

    ollama_available = False
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
            ollama_available = resp.status_code == 200
    except Exception:
        pass

    return {
        "ok": True,
        "hive": {
            "orchestrator": "active",
            "model": HIVE_MODEL or "default",
            "marketplace_available": marketplace_available,
            "ollama_available": ollama_available,
        },
        "stark": {
            "enabled": STARK_ENABLED,
            "sources": stark_sources_status(),
        },
        "checked_at": datetime.utcnow().isoformat(),
    }
