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
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth_utils import get_current_user, get_current_user_optional

router = APIRouter(prefix="/agentic", tags=["agentic-ai"])
logger = logging.getLogger("wehive.agentic")

STARK_ENABLED = os.environ.get("STARK_ENABLED", "1") == "1"
HIVE_MODEL = os.environ.get("HIVE_MODEL", "")


class HiveAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
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


INTENT_PATTERNS = {
    "visa_qa": [
        r"\b(visa|visa type|visa requirement|visa fee|visa document|embassy|consulate)\b",
        r"\b(ds.?160|i.?20|i.?129|i.?797|h.?1b|b.?[12]|f.?1|l.?1)\b",
        r"\b(appointment|slot|interview|biometrics|stamping)\b",
    ],
    "country_info": [
        r"\b(travel to|visit|go to|tourist|tourism in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"\b(about|tell me about|what is|info on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    ],
    "study_abroad": [
        r"\b(study|university|college|course|program|degree|master|bachelor|phd)\b",
        r"\b(scholarship|ielts|toefl|gre|gmat|sat|gpa|acceptance)\b",
    ],
    "open_source": [
        r"\b(open.?source|github|pypi|npm|package|library|framework)\b",
        r"\b(ollama|chromadb|langchain|llama|mistral)\b",
        r"\b(model|LLM|embedding|vector|RAG|agent)\b",
    ],
    "technical": [
        r"\b(how does|how do|explain|what is the difference)\b",
        r"\b(api|code|programming|python|javascript|database)\b",
    ],
}


def _detect_intents(question: str) -> list[dict]:
    q_lower = question.lower()
    detected = []
    for intent, patterns in INTENT_PATTERNS.items():
        score = 0
        for pat in patterns:
            matches = re.findall(pat, q_lower, re.IGNORECASE)
            score += len(matches) * 2
        if score > 0:
            detected.append({"intent": intent, "score": min(score, 10)})
    detected.sort(key=lambda x: x["score"], reverse=True)
    return detected[:3]


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
            user_id=user["id"] if isinstance(user, dict) else getattr(user, "id", "system"),
            system_prompt=system_prompt,
            user_prompt=req.question,
        )
        answer = response if isinstance(response, str) else str(response)

        return {
            "ok": True,
            "answer": answer,
            "intents_detected": intents,
            "stark_delegated": delegate_to_stark,
            "stark_context_used": bool(stark_context),
            "model": HIVE_MODEL or "default",
        }

    except Exception:
        from shared.local_llm import local_chat_with_info
        response = await local_chat_with_info(req.question, "")
        return {
            "ok": True,
            "answer": response.get("content", "") if isinstance(response, dict) else str(response),
            "intents_detected": intents,
            "stark_delegated": delegate_to_stark,
            "fallback": "local_llm",
        }


@router.post("/stark/search")
async def stark_search(req: StarkSearchRequest):
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
        raise HTTPException(status_code=502, detail=f"Stark search failed: {str(e)}")


@router.post("/stark/research")
async def stark_research_endpoint(req: StarkSearchRequest):
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
        raise HTTPException(status_code=502, detail=f"Stark research failed: {str(e)}")


@router.get("/stark/context")
async def get_stark_context(q: str):
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
        raise HTTPException(status_code=502, detail=f"Context generation failed: {str(e)}")


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
                    user_id=user["id"] if isinstance(user, dict) else getattr(user, "id", "system"),
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
                    user_id=user["id"] if isinstance(user, dict) else getattr(user, "id", "system"),
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
        raise HTTPException(status_code=502, detail=f"Workflow failed: {str(e)}")


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
            resp = await client.get("http://localhost:11434/api/tags")
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
