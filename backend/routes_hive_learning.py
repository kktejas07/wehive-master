"""Hive self-learning API.

Admin-only. Lets the operator:

  GET  /api/hive/learning/stats          — counts, top agents, top tools
  GET  /api/hive/learning/feeds          — recent raw feed events
  GET  /api/hive/learning/proposals       — history of saved proposals
  POST /api/hive/learning/mine           — cluster intents + spot gaps
  POST /api/hive/learning/propose/prompts — propose edits to one agent's prompt
  POST /api/hive/learning/propose/cards   — propose new prompt-kit cards
  POST /api/hive/learning/propose/tools   — propose new tool definitions
  POST /api/hive/learning/apply           — save a proposed prompt as a new version
  POST /api/hive/learning/auto-apply     — end-to-end: mine + auto-apply all 4 agents

The boot-time runner (`seed_self_learn`, only when HIVE_SELF_LEARN=1) never
applies prompts — it stores proposals as pending for approval via /apply.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from db import db
from feed_miner import (
    feed_stats,
    recent_feeds,
    mine_patterns,
    propose_prompt_edits,
    propose_new_prompts,
    propose_new_tools,
    apply_prompt_edit,
    auto_apply_recent,
    save_proposal,
    HIVE_AGENT_IDS,
)

logger = logging.getLogger("wehive.routes_hive_learning")

router = APIRouter(prefix="/hive/learning", tags=["hive-learning"])


# ── Request bodies ────────────────────────────────────────────────────────

class MineBody(BaseModel):
    days: int = 7
    max_feeds: int = 250


class ProposePromptsBody(BaseModel):
    agent_id: str
    days: int = 7


class ProposeCardsBody(BaseModel):
    days: int = 7
    top_n: int = 3


class ProposeToolsBody(BaseModel):
    days: int = 7


class ApplyPromptBody(BaseModel):
    agent_id: str
    new_system: str
    proposed_version: Optional[int] = None
    changes: Optional[list[dict]] = None


class AutoApplyBody(BaseModel):
    days: int = 7
    min_delta: float = 0.12
    min_feeds: int = 8
    force: bool = False
    agent_ids: Optional[list[str]] = None


# ── Read endpoints ─────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(days: int = Query(7, ge=1, le=90), _=Depends(get_current_admin_flex)):
    return await feed_stats(days=days)


@router.get("/feeds")
async def get_feeds(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(100, ge=1, le=500),
    agent_id: Optional[str] = Query(None),
    _=Depends(get_current_admin_flex),
):
    feeds = await recent_feeds(days=days, limit=limit, agent_id=agent_id)
    return {"ok": True, "count": len(feeds), "items": feeds}


@router.get("/proposals")
async def get_proposals(
    kind: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _=Depends(get_current_admin_flex),
):
    q: dict[str, Any] = {}
    if kind:
        q["kind"] = kind
    cur = (
        db["hive_proposals"]
        .find(q)
        .sort("ts", -1)
        .limit(max(1, min(limit, 200)))
    )
    items = []
    async for d in cur:
        d["id"] = str(d.pop("_id"))
        # Older apply logs were saved as "proposed"; they are already live.
        if (d.get("payload") or {}).get("applied") and d.get("status") == "proposed":
            d["status"] = "applied"
        items.append(d)
    return {"ok": True, "count": len(items), "items": items}


def _proposal_oid(proposal_id: str) -> ObjectId:
    try:
        return ObjectId(proposal_id)
    except (InvalidId, TypeError):
        raise HTTPException(404, "Proposal not found")


@router.post("/proposals/{proposal_id}/approve")
async def approve_proposal(proposal_id: str, admin=Depends(get_current_admin_flex)):
    """Apply a saved prompt-edit proposal. Each proposal can be decided once."""
    coll = db["hive_proposals"]
    oid = _proposal_oid(proposal_id)
    doc = await coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Proposal not found")
    if doc.get("kind") != "prompt_edit":
        raise HTTPException(400, "Only prompt edits can be applied from here.")
    # Claim it first so two admins can't apply the same proposal.
    claimed = await coll.update_one(
        {"_id": oid, "status": "proposed", "payload.applied": {"$ne": True}}, {"$set": {"status": "applying"}})
    if not claimed.modified_count:
        raise HTTPException(409, "This proposal has already been decided.")
    p = doc.get("payload") or {}
    res = await apply_prompt_edit(
        agent_id=p.get("agent_id"),
        new_system=p.get("new_system") or "",
        proposed_version=p.get("proposed_version"),
        changes=p.get("changes"),
    )
    if not res.get("ok"):
        await coll.update_one({"_id": oid}, {"$set": {"status": "proposed"}})
        raise HTTPException(400, res.get("note") or "apply failed")
    await coll.update_one({"_id": oid}, {"$set": {
        "status": "applied", "payload.applied": True,
        "decided_at": datetime.utcnow().isoformat() + "Z", "decided_by": admin.get("email"),
    }})
    return res


@router.post("/proposals/{proposal_id}/reject")
async def reject_proposal(proposal_id: str, admin=Depends(get_current_admin_flex)):
    res = await db["hive_proposals"].update_one(
        {"_id": _proposal_oid(proposal_id), "status": "proposed", "payload.applied": {"$ne": True}},
        {"$set": {"status": "rejected", "decided_at": datetime.utcnow().isoformat() + "Z",
                  "decided_by": admin.get("email")}},
    )
    if not res.matched_count:
        raise HTTPException(409, "This proposal was not found or has already been decided.")
    return {"ok": True, "status": "rejected"}


# ── Mine + propose ────────────────────────────────────────────────────────

@router.post("/mine")
async def mine(body: MineBody, _=Depends(get_current_admin_flex)):
    return await mine_patterns(days=body.days, max_feeds=body.max_feeds)


@router.post("/propose/prompts")
async def propose_prompts(body: ProposePromptsBody, _=Depends(get_current_admin_flex)):
    res = await propose_prompt_edits(agent_id=body.agent_id, days=body.days)
    # Persist as a non-applied proposal so the UI can show it in history
    if res.get("ok"):
        await save_proposal("prompt_edit", {
            "agent_id": body.agent_id,
            "prompt_id": res.get("prompt_id"),
            "current_version": res.get("current_version"),
            "proposed_version": res.get("proposed_version"),
            "new_system": res.get("new_system"),
            "changes": res.get("changes"),
            "applied": False,
        })
    return res


@router.post("/propose/cards")
async def propose_cards(body: ProposeCardsBody, _=Depends(get_current_admin_flex)):
    res = await propose_new_prompts(days=body.days, top_n=body.top_n)
    if res.get("ok") and res.get("prompts"):
        await save_proposal("new_prompt", {"prompts": res["prompts"], "days": body.days})
    return res


@router.post("/propose/tools")
async def propose_tools(body: ProposeToolsBody, _=Depends(get_current_admin_flex)):
    res = await propose_new_tools(days=body.days)
    if res.get("ok") and res.get("tools"):
        await save_proposal("new_tool", {"tools": res["tools"], "days": body.days})
    return res


# ── Apply ─────────────────────────────────────────────────────────────────

@router.post("/apply")
async def apply_prompt(body: ApplyPromptBody, admin=Depends(get_current_admin_flex)):
    res = await apply_prompt_edit(
        agent_id=body.agent_id,
        new_system=body.new_system,
        proposed_version=body.proposed_version,
        changes=body.changes,
    )
    if not res.get("ok"):
        raise HTTPException(400, res.get("note") or "apply failed")
    if body.proposed_version is not None:
        # Close the matching saved proposal so it can't be applied twice from history.
        await db["hive_proposals"].update_many(
            {"kind": "prompt_edit", "status": "proposed",
             "payload.agent_id": body.agent_id, "payload.proposed_version": body.proposed_version},
            {"$set": {"status": "applied", "payload.applied": True,
                      "decided_at": datetime.utcnow().isoformat() + "Z", "decided_by": admin.get("email")}},
        )
    return res


@router.post("/auto-apply")
async def auto_apply(body: AutoApplyBody, _=Depends(get_current_admin_flex)):
    """End-to-end: mine feeds, propose improved prompts, save new versions."""
    res = await auto_apply_recent(
        days=body.days,
        min_delta=body.min_delta,
        min_feeds=body.min_feeds,
        force=body.force,
        agent_ids=body.agent_ids or list(HIVE_AGENT_IDS),
        apply=True,
    )
    return res


@router.get("/config")
async def get_config(_=Depends(get_current_admin_flex)):
    """Surface the env-driven knobs so the admin UI can show them."""
    import os
    from feed_miner import (
        self_learn_enabled,
        self_learn_days,
        self_learn_min_feeds,
        self_learn_min_delta,
    )
    return {
        "enabled": self_learn_enabled(),
        "days": self_learn_days(),
        "min_feeds": self_learn_min_feeds(),
        "min_delta": self_learn_min_delta(),
        "force": os.environ.get("HIVE_SELF_LEARN_FORCE", "0") == "1",
        "agent_ids": list(HIVE_AGENT_IDS),
    }
