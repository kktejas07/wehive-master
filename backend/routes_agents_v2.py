"""Agents V2 API — generic composable LLM agents.

Public (auth required):
  GET  /api/agents-v2                  list all agent definitions
  GET  /api/agents-v2/{id}             get a single agent spec
  POST /api/agents-v2/{id}/run         run an agent on a user input

Admin only:
  POST   /api/agents-v2                create or update an agent
  DELETE /api/agents-v2/{id}           delete an agent
  GET    /api/agents-v2/{id}/runs      list past runs (last 20)
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user
from admin_auth import get_current_admin_flex
from db import db
from agent_framework import (
    AgentSpec,
    AgentRegistry,
    get_agent_registry,
    run_agent,
)

logger = logging.getLogger("wehive.routes_agents_v2")

router = APIRouter(prefix="/agents-v2", tags=["agents-v2"])


class RunAgentRequest(BaseModel):
    input: str
    context: Optional[str] = None
    conversation_history: Optional[List[dict]] = None


def _registry() -> AgentRegistry:
    return get_agent_registry(db)


@router.get("")
async def list_agents(user=Depends(get_current_user)):
    """List all agent definitions (specs only, no secrets)."""
    reg = _registry()
    specs = await reg.list()
    return {"ok": True, "agents": [s.to_dict() for s in specs]}


@router.get("/{agent_id}")
async def get_agent(agent_id: str, user=Depends(get_current_user)):
    reg = _registry()
    s = await reg.get(agent_id)
    if not s:
        raise HTTPException(404, f"Agent not found: {agent_id}")
    return {"ok": True, "agent": s.to_dict()}


@router.post("")
async def upsert_agent(spec: AgentSpec, _=Depends(get_current_admin_flex)):
    reg = _registry()
    try:
        saved = await reg.upsert(spec)
    except Exception as e:
        logger.exception("Failed to save agent: %s", e)
        raise HTTPException(400, str(e))
    return {"ok": True, "agent": saved.to_dict()}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, _=Depends(get_current_admin_flex)):
    reg = _registry()
    ok = await reg.delete(agent_id)
    if not ok:
        raise HTTPException(404, f"Agent not found: {agent_id}")
    return {"ok": True}


@router.post("/{agent_id}/run")
async def run_agent_endpoint(agent_id: str, req: RunAgentRequest, user=Depends(get_current_user)):
    reg = _registry()
    spec = await reg.get(agent_id)
    if not spec:
        raise HTTPException(404, f"Agent not found: {agent_id}")
    user_id = user.get("_id", "") if isinstance(user, dict) else ""
    try:
        run = await run_agent(
            spec,
            req.input,
            user_id=user_id,
            context=req.context or "",
            conversation_history=req.conversation_history,
        )
    except Exception as e:
        logger.exception("Agent run failed: %s", e)
        # Capture the failure in the feed too — errors are the most
        # useful signal for self-learning.
        try:
            from feed_miner import record_feed
            await record_feed(
                agent_id=agent_id,
                user_id=user_id,
                user_input=req.input,
                answer="",
                tool_calls=[],
                steps=[],
                error=str(e),
            )
        except Exception:
            pass
        raise HTTPException(500, f"Agent run failed: {e}")
    doc = run.to_dict()
    try:
        await db["agent_runs"].insert_one({**doc, "_id": f"{agent_id}-{run.started_at}"})
    except Exception as e:
        logger.warning("Could not persist agent run: %s", e)
    # Best-effort: capture this run as a feed event for self-learning
    try:
        from feed_miner import record_feed
        tool_names = [s.get("tool_name") for s in (run.steps or []) if s.get("tool_name")]
        await record_feed(
            agent_id=agent_id,
            user_id=user_id,
            user_input=req.input,
            answer=run.final_answer or "",
            tool_calls=tool_names,
            steps=[s.to_dict() for s in (run.steps or [])],
            provider=run.provider,
            model=run.model,
            duration_ms=run.duration_ms,
            error=run.error,
        )
    except Exception as e:
        logger.debug("record_feed skipped: %s", e)
    return {"ok": True, "run": doc}


@router.get("/{agent_id}/runs")
async def list_agent_runs(agent_id: str, limit: int = 20, user=Depends(get_current_user)):
    try:
        cursor = (
            db["agent_runs"]
            .find({"agent_id": agent_id}, {"_id": 0})
            .sort("started_at", -1)
            .limit(max(1, min(limit, 100)))
        )
        out: list[dict] = []
        async for d in cursor:
            out.append(d)
        return {"ok": True, "runs": out}
    except Exception as e:
        logger.exception("List agent runs failed: %s", e)
        raise HTTPException(500, str(e))
