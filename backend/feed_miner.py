"""Hive self-learning: capture feeds, mine patterns, propose improvements.

The Hive assistant logs every (agent, user_input, answer, tools) triple
to a `hive_feeds` collection. On demand, an LLM call:
  1. Greps the recent feeds and clusters the user's intents.
  2. Spots the recurring phrasings and any intents where the assistant
     deflected, gave a weak answer, or called the wrong tool.
  3. Proposes:
       a) edits to the 4 existing Hive system prompts,
       b) a new prompt id (for the Prompt Kit) if a recurring intent is
          not covered,
       c) new tool definitions (as JSON Schema) that would close gaps.

Only admin users can call these endpoints. The LLM is invoked via the
AI Marketplace (or local Ollama fallback) — no extra provider wiring.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Optional

from db import db

logger = logging.getLogger("wehive.feed_miner")

FEED_COLL = "hive_feeds"
PROPOSALS_COLL = "hive_proposals"

# Cap the amount of text we hand the LLM so a 10k-feed dump doesn't blow
# the context window. Each feed is truncated aggressively.
FEED_TEXT_LIMIT = 220
MAX_FEEDS_FOR_MINING = 250
MAX_FEEDS_FOR_PROPOSAL = 80


# ─────────────────────────────────────────────────────────────────────────
# Capture
# ─────────────────────────────────────────────────────────────────────────

async def record_feed(
    *,
    agent_id: str,
    user_id: str = "",
    user_input: str = "",
    answer: str = "",
    tool_calls: Optional[list[str]] = None,
    steps: Optional[list[dict]] = None,
    provider: str = "",
    model: str = "",
    duration_ms: int = 0,
    error: Optional[str] = None,
) -> dict:
    """Best-effort: persist one feed event. Never raises."""
    try:
        coll = db[FEED_COLL]
        doc = {
            "agent_id": agent_id,
            "user_id": user_id or "",
            "user_input": (user_input or "")[:1000],
            "answer": (answer or "")[:2000],
            "tool_calls": list(tool_calls or []),
            "step_count": len(steps or []),
            "provider": provider,
            "model": model,
            "duration_ms": int(duration_ms or 0),
            "error": error or None,
            "ts": datetime.utcnow().isoformat() + "Z",
        }
        await coll.insert_one(doc)
        try:
            await coll.create_index([("agent_id", 1), ("ts", -1)])
            await coll.create_index([("ts", -1)])
        except Exception:
            pass
        return doc
    except Exception as e:
        logger.warning("record_feed failed: %s", e)
        return {}


# ─────────────────────────────────────────────────────────────────────────
# Read
# ─────────────────────────────────────────────────────────────────────────

def _truncate(text: str, n: int = FEED_TEXT_LIMIT) -> str:
    if not text:
        return ""
    s = str(text).strip().replace("\n", " ")
    return s[:n] + ("…" if len(s) > n else "")


async def recent_feeds(*, days: int = 7, limit: int = 200, agent_id: Optional[str] = None) -> list[dict]:
    coll = db[FEED_COLL]
    q: dict[str, Any] = {}
    if days and days > 0:
        since = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
        q["ts"] = {"$gte": since}
    if agent_id:
        q["agent_id"] = agent_id
    cur = coll.find(q, {"_id": 0}).sort("ts", -1).limit(max(1, min(limit, 1000)))
    return [d async for d in cur]


async def feed_stats(*, days: int = 7) -> dict:
    coll = db[FEED_COLL]
    since = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z" if days else None

    match: dict[str, Any] = {}
    if since:
        match["ts"] = {"$gte": since}

    total = await coll.count_documents(match)

    pipeline = [
        {"$match": match} if match else {"$match": {}},
        {"$group": {
            "_id": "$agent_id",
            "count": {"$sum": 1},
            "errors": {"$sum": {"$cond": [{"$ifNull": ["$error", False]}, 1, 0]}},
            "avg_ms": {"$avg": "$duration_ms"},
        }},
        {"$sort": {"count": -1}},
    ]
    by_agent: list[dict] = []
    async for d in coll.aggregate(pipeline):
        by_agent.append({
            "agent_id": d["_id"],
            "count": d["count"],
            "errors": d.get("errors", 0),
            "avg_ms": int(d.get("avg_ms") or 0),
        })

    # Tool usage frequency
    tool_pipeline = [
        {"$match": match} if match else {"$match": {}},
        {"$unwind": {"path": "$tool_calls", "preserveNullAndEmptyArrays": False}},
        {"$group": {"_id": "$tool_calls", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 12},
    ]
    by_tool: list[dict] = []
    try:
        async for d in coll.aggregate(tool_pipeline):
            by_tool.append({"tool": d["_id"], "count": d["count"]})
    except Exception:
        pass

    return {
        "total": total,
        "window_days": days,
        "by_agent": by_agent,
        "by_tool": by_tool,
    }


# ─────────────────────────────────────────────────────────────────────────
# LLM plumbing
# ─────────────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> Optional[Any]:
    """Find the first JSON object or array in a model response."""
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except Exception:
            pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except Exception:
            pass
    return None


async def _llm_chat(system: str, user: str, *, max_tokens: int = 1400) -> str:
    """Call the AI marketplace (any provider incl. Ollama)."""
    try:
        from ai_marketplace import marketplace
        return await marketplace.chat("admin", system, user, max_tokens=max_tokens)
    except Exception as e:
        logger.warning("Marketplace chat failed: %s", e)
        try:
            from local_llm import local_chat_with_info
            reply, _ = await local_chat_with_info(user, context=system)
            return reply
        except Exception as e2:
            logger.warning("Local LLM fallback also failed: %s", e2)
            return ""


def _feeds_to_corpus(feeds: list[dict], max_n: int = MAX_FEEDS_FOR_PROPOSAL) -> str:
    lines: list[str] = []
    for i, f in enumerate(feeds[:max_n], start=1):
        agent = f.get("agent_id", "?")
        u = _truncate(f.get("user_input", ""), 180)
        a = _truncate(f.get("answer", ""), 180)
        tools = ",".join(f.get("tool_calls") or []) or "-"
        err = " ERROR" if f.get("error") else ""
        lines.append(f"{i:3}. [{agent}]{err} tools=[{tools}]  U: {u}  A: {a}")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────
# Mining + proposals
# ─────────────────────────────────────────────────────────────────────────

async def mine_patterns(*, days: int = 7, max_feeds: int = MAX_FEEDS_FOR_MINING) -> dict:
    """Grep the recent feeds and return intent clusters + gap analysis."""
    feeds = await recent_feeds(days=days, limit=max_feeds)
    if not feeds:
        return {
            "ok": True,
            "feeds_count": 0,
            "intents": [],
            "gaps": [],
            "tool_gaps": [],
            "note": "No feeds captured yet. Have a few conversations with Hive first.",
        }

    corpus = _feeds_to_corpus(feeds, max_n=min(len(feeds), 120))

    system_prompt = (
        "You are a senior product analyst. You are given a numbered list of recent "
        "Hive assistant conversations. Each line shows: [agent_id] tools=[...] "
        "U: <user question>  A: <assistant answer>.\n\n"
        "Return ONLY a single JSON object with exactly these keys:\n"
        '  "intents": array of {label, count_estimate, phrasings: [string, ...], agents: [string, ...]}\n'
        '  "gaps": array of {label, evidence, why_weak} — intents where the assistant gave a vague, deflecting, or wrong answer\n'
        '  "tool_gaps": array of {label, description, suggested_tool} — what NEW tool would close the gap\n\n'
        "Cluster intents broadly (max 8 intents). Use short labels. Cite the line numbers as evidence (e.g. \"lines 4, 11, 27\"). "
        "Only output the JSON object, no commentary."
    )
    user_prompt = (
        f"Window: last {days} day(s). Feeds in corpus: {len(feeds)} (showing up to 120).\n\n"
        f"--- CORPUS ---\n{corpus}\n--- END ---"
    )
    raw = await _llm_chat(system_prompt, user_prompt, max_tokens=1600)
    parsed = _extract_json(raw) or {}

    return {
        "ok": True,
        "feeds_count": len(feeds),
        "intents": parsed.get("intents", []) if isinstance(parsed, dict) else [],
        "gaps": parsed.get("gaps", []) if isinstance(parsed, dict) else [],
        "tool_gaps": parsed.get("tool_gaps", []) if isinstance(parsed, dict) else [],
        "raw_excerpt": (raw or "")[:600],
    }


async def propose_prompt_edits(*, agent_id: str, days: int = 7) -> dict:
    """Read the feeds for one agent, propose a revised system prompt.

    Returns the new `system` text + a list of focused change-rationales.
    """
    from agent_framework import get_agent_registry
    from prompts_lib import get_store

    feeds = await recent_feeds(days=days, limit=200, agent_id=agent_id)
    if not feeds:
        return {
            "ok": False,
            "agent_id": agent_id,
            "note": f"No feeds in the last {days} day(s) for agent '{agent_id}'.",
        }

    reg = get_agent_registry(db)
    spec = await reg.get(agent_id)
    if not spec:
        return {"ok": False, "agent_id": agent_id, "note": f"Agent not found: {agent_id}"}

    store = get_store(db)
    current_prompt = store.get(spec.prompt_id)
    if not current_prompt:
        return {
            "ok": False,
            "agent_id": agent_id,
            "note": f"Prompt not found: {spec.prompt_id}",
        }
    current_system = current_prompt.system

    corpus = _feeds_to_corpus(feeds, max_n=min(len(feeds), MAX_FEEDS_FOR_PROPOSAL))
    system_prompt = (
        "You are a prompt engineer. You are given:\n"
        "  1) The CURRENT system prompt of a Hive assistant agent.\n"
        "  2) A corpus of recent real conversations (U: <user>, A: <assistant>).\n\n"
        "Your job: rewrite the system prompt so it does a better job on the recurring "
        "intents in the corpus — especially the ones where the assistant was weak, "
        "deflected, or used the wrong tool. Keep the same role, the same date-stamp "
        "and safety rules, and the same variable placeholders. Be precise; do not "
        "add filler.\n\n"
        "Return ONLY a JSON object with these keys:\n"
        '  "new_system": <the rewritten system prompt as a single string with \\n for newlines>,\n'
        '  "changes": array of {intent, before, after} — short bullet-style change notes,\n'
        '  "promote_to_version": integer >= current+1 (suggested next version)\n'
    )
    user_prompt = (
        f"Agent: {agent_id}  |  Prompt id: {spec.prompt_id}  |  Current version: {current_prompt.version}\n\n"
        f"--- CURRENT SYSTEM PROMPT ---\n{current_system}\n--- END CURRENT ---\n\n"
        f"--- CORPUS ({len(feeds)} feeds, showing up to {MAX_FEEDS_FOR_PROPOSAL}) ---\n{corpus}\n--- END CORPUS ---"
    )
    raw = await _llm_chat(system_prompt, user_prompt, max_tokens=1800)
    parsed = _extract_json(raw) or {}

    new_system = parsed.get("new_system") if isinstance(parsed, dict) else None
    if not isinstance(new_system, str) or not new_system.strip():
        return {
            "ok": False,
            "agent_id": agent_id,
            "prompt_id": spec.prompt_id,
            "current_version": current_prompt.version,
            "current_system": current_system,
            "note": "Model did not return a new_system field.",
            "raw_excerpt": (raw or "")[:600],
        }

    return {
        "ok": True,
        "agent_id": agent_id,
        "prompt_id": spec.prompt_id,
        "current_version": current_prompt.version,
        "proposed_version": int(parsed.get("promote_to_version") or (current_prompt.version + 1)),
        "current_system": current_system,
        "new_system": new_system,
        "changes": parsed.get("changes", []) if isinstance(parsed, dict) else [],
    }


async def propose_new_prompts(*, days: int = 7, top_n: int = 3) -> dict:
    """Suggest 1-3 NEW prompt kit cards based on recurring intents."""
    feeds = await recent_feeds(days=days, limit=200)
    if not feeds:
        return {"ok": False, "note": f"No feeds in the last {days} day(s)."}
    corpus = _feeds_to_corpus(feeds, max_n=min(len(feeds), 120))

    system_prompt = (
        "You are a prompt designer for the We Hive AI assistant. You are given a "
        "corpus of real user questions. Suggest NEW prompt-kit cards (the chips that "
        "appear under the chat input) for the most common intents that aren't yet well "
        "covered by the current prompt kit.\n\n"
        "Return ONLY a JSON object:\n"
        '  "prompts": array of {title, sub, sample_question, target_agent, rationale}\n\n'
        "Max 4 cards. `target_agent` should be one of: hive_visa, hive_travel, "
        "hive_documents, hive_study_abroad. Keep titles short (<= 6 words). "
        "`sample_question` should be a realistic Indian-traveller question."
    )
    user_prompt = f"Window: last {days} day(s). Feeds: {len(feeds)}.\n\n--- CORPUS ---\n{corpus}\n--- END ---"
    raw = await _llm_chat(system_prompt, user_prompt, max_tokens=1200)
    parsed = _extract_json(raw) or {}
    prompts = parsed.get("prompts", []) if isinstance(parsed, dict) else []
    if not isinstance(prompts, list):
        prompts = []
    return {
        "ok": True,
        "prompts": prompts[:max(1, min(top_n, 6))],
    }


async def propose_new_tools(*, days: int = 7) -> dict:
    """Suggest new tool definitions (name, description, JSON schema) for gaps."""
    feeds = await recent_feeds(days=days, limit=200)
    if not feeds:
        return {"ok": False, "note": f"No feeds in the last {days} day(s)."}
    corpus = _feeds_to_corpus(feeds, max_n=min(len(feeds), 120))

    system_prompt = (
        "You are a tool designer for the We Hive ReAct agent framework. You are given a "
        "corpus of recent Hive conversations. Suggest NEW tools the agents should have "
        "to answer recurring user intents they currently cannot handle well.\n\n"
        "A tool has: name, description (one sentence), and a JSON schema with "
        'type=object, properties={...}, required=[...].\n\n'
        "Return ONLY a JSON object:\n"
        '  "tools": array of {name, description, parameters, when_to_call, target_agent}\n\n'
        "Max 4 tools. Names use snake_case. target_agent is one of: hive_visa, "
        "hive_travel, hive_documents, hive_study_abroad, or 'all'."
    )
    user_prompt = f"Window: last {days} day(s). Feeds: {len(feeds)}.\n\n--- CORPUS ---\n{corpus}\n--- END ---"
    raw = await _llm_chat(system_prompt, user_prompt, max_tokens=1400)
    parsed = _extract_json(raw) or {}
    tools = parsed.get("tools", []) if isinstance(parsed, dict) else []
    if not isinstance(tools, list):
        tools = []
    return {"ok": True, "tools": tools[:4]}


# ─────────────────────────────────────────────────────────────────────────
# Apply — save approved proposals
# ─────────────────────────────────────────────────────────────────────────

async def save_proposal(kind: str, payload: dict) -> dict:
    """Persist a proposal so the admin UI can show a history.

    `kind` is "prompt_edit", "new_prompt", or "new_tool".
    """
    coll = db[PROPOSALS_COLL]
    doc = {
        "kind": kind,
        "payload": payload,
        "status": "proposed",
        "ts": datetime.utcnow().isoformat() + "Z",
    }
    await coll.insert_one(doc)
    try:
        await coll.create_index([("kind", 1), ("ts", -1)])
    except Exception:
        pass
    return {k: v for k, v in doc.items() if k != "_id"}


async def apply_prompt_edit(*, agent_id: str, new_system: str, proposed_version: Optional[int] = None, changes: Optional[list] = None) -> dict:
    """Bump the prompt's version and save the new system text. Returns the saved prompt.

    Because the agent framework re-reads the highest prompt version on every
    run, this is a "real-time" update — the next user message uses the new
    prompt with no restart.
    """
    from agent_framework import get_agent_registry
    from prompts_lib import get_store, Prompt

    reg = get_agent_registry(db)
    spec = await reg.get(agent_id)
    if not spec:
        return {"ok": False, "note": f"Agent not found: {agent_id}"}

    store = get_store(db)
    current = store.get(spec.prompt_id)
    if not current:
        return {"ok": False, "note": f"Prompt not found: {spec.prompt_id}"}

    new_version = int(proposed_version or (current.version + 1))
    # Detect the variables the new template uses
    var_re = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")
    new_vars: list[str] = []
    for m in var_re.findall(new_system):
        if m not in new_vars:
            new_vars.append(m)
    for v in var_re.findall(current.user):
        if v not in new_vars:
            new_vars.append(v)

    new_prompt = Prompt(
        id=current.id,
        version=new_version,
        description=current.description + " (auto-revised by hive self-learning)",
        tags=list(current.tags or []) + ["hive-learned"],
        variables=new_vars,
        system=new_system,
        user=current.user,
        source="hive-learned",
    )
    await store.save(new_prompt)
    # Reload the in-process cache so the next run_agent call sees the new version
    try:
        store.reload()
    except Exception:
        pass
    await save_proposal("prompt_edit", {
        "agent_id": agent_id,
        "prompt_id": current.id,
        "version": new_version,
        "previous_version": current.version,
        "new_system": new_system,
        "changes": changes or [],
        "applied": True,
    })
    return {"ok": True, "prompt": new_prompt.to_dict()}


# ─────────────────────────────────────────────────────────────────────────
# Real-time auto-apply — invoked by seed.py / bootstrap
# ─────────────────────────────────────────────────────────────────────────

import os as _os

# Default Hive agent ids whose prompts are eligible for self-learning
HIVE_AGENT_IDS = ("hive_visa", "hive_travel", "hive_documents", "hive_study_abroad")

# Minimum absolute Jaccard distance between the proposed system prompt and
# the current one before we apply. Below this we treat the proposal as a
# no-op and skip it. This keeps the LLM from spamming tiny wording tweaks.
_MIN_PROMPT_DELTA = 0.12

# Minimum number of feeds in the window before we'll even consider auto-apply.
_MIN_FEEDS_FOR_AUTO_APPLY = 8


def _tokenize(s: str) -> set:
    """Whitespace + punctuation tokenizer, lowercased. Strips {{ vars }}."""
    if not s:
        return set()
    s = re.sub(r"\{\{[^}]+\}\}", " ", s)
    s = re.sub(r"[^a-zA-Z0-9_]+", " ", s.lower())
    return {t for t in s.split() if len(t) > 2}


def _prompt_delta(a: str, b: str) -> float:
    """Return 0.0..1.0 — symmetric Jaccard distance."""
    A, B = _tokenize(a), _tokenize(b)
    if not A and not B:
        return 0.0
    inter = A & B
    union = A | B
    if not union:
        return 0.0
    return 1.0 - (len(inter) / len(union))


async def auto_apply_recent(
    *,
    days: int = 7,
    agent_ids: Optional[list[str]] = None,
    min_delta: float = _MIN_PROMPT_DELTA,
    min_feeds: int = _MIN_FEEDS_FOR_AUTO_APPLY,
    force: bool = False,
) -> dict:
    """End-to-end real-time update:

      1. Grep recent feeds (last `days`).
      2. For each Hive agent, ask the LLM to propose a new system prompt.
      3. If the proposal is materially different (Jaccard > `min_delta`)
         AND we have at least `min_feeds` to learn from, apply it as a
         new prompt version. The agent picks it up on the next run.

    Args:
        days: how far back to mine.
        agent_ids: defaults to the 4 Hive agents.
        min_delta: Jaccard-distance threshold (smaller = more conservative).
        min_feeds: don't auto-apply on tiny corpora.
        force: if True, ignore `min_feeds` and `min_delta` (admin override).

    Returns:
        dict with per-agent outcomes and a summary.
    """
    targets = list(agent_ids or HIVE_AGENT_IDS)
    overall: dict[str, Any] = {
        "applied": [],
        "skipped": [],
        "errors": [],
        "feeds_seen": 0,
        "min_delta": min_delta,
        "min_feeds": min_feeds,
        "force": force,
    }

    # Pre-compute corpus size once
    sample = await recent_feeds(days=days, limit=1)
    overall["feeds_seen"] = len(sample) and (
        await db[FEED_COLL].count_documents(
            {"ts": {"$gte": (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"}}
        )
    )

    if not force and overall["feeds_seen"] < min_feeds:
        overall["note"] = (
            f"Only {overall['feeds_seen']} feeds in the last {days}d "
            f"(need >= {min_feeds}). Skipping auto-apply."
        )
        return overall

    for agent_id in targets:
        try:
            proposal = await propose_prompt_edits(agent_id=agent_id, days=days)
            if not proposal.get("ok"):
                overall["skipped"].append({
                    "agent_id": agent_id,
                    "reason": proposal.get("note") or "proposal failed",
                })
                continue

            current = proposal.get("current_system") or ""
            new = proposal.get("new_system") or ""
            delta = _prompt_delta(current, new)
            proposal["delta"] = round(delta, 3)

            if not force and delta < min_delta:
                overall["skipped"].append({
                    "agent_id": agent_id,
                    "reason": f"delta {delta:.3f} below threshold {min_delta:.3f}",
                    "delta": delta,
                })
                continue

            # Apply → bumps prompt version; agent picks it up next run
            apply_res = await apply_prompt_edit(
                agent_id=agent_id,
                new_system=new,
                proposed_version=proposal.get("proposed_version"),
                changes=proposal.get("changes"),
            )
            if apply_res.get("ok"):
                overall["applied"].append({
                    "agent_id": agent_id,
                    "prompt_id": proposal.get("prompt_id"),
                    "version": apply_res["prompt"]["version"],
                    "previous_version": proposal.get("current_version"),
                    "delta": delta,
                    "changes": proposal.get("changes"),
                })
            else:
                overall["skipped"].append({
                    "agent_id": agent_id,
                    "reason": apply_res.get("note") or "apply failed",
                })
        except Exception as e:
            logger.exception("auto_apply_recent: %s failed: %s", agent_id, e)
            overall["errors"].append({"agent_id": agent_id, "error": str(e)})

    return overall


def self_learn_enabled() -> bool:
    """Read the HIVE_SELF_LEARN env flag. Default: ON, with a 7d window."""
    v = _os.environ.get("HIVE_SELF_LEARN", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def self_learn_days() -> int:
    try:
        return max(1, min(int(_os.environ.get("HIVE_SELF_LEARN_DAYS", "7")), 30))
    except Exception:
        return 7


def self_learn_min_feeds() -> int:
    try:
        return max(1, int(_os.environ.get("HIVE_SELF_LEARN_MIN_FEEDS", str(_MIN_FEEDS_FOR_AUTO_APPLY))))
    except Exception:
        return _MIN_FEEDS_FOR_AUTO_APPLY


def self_learn_min_delta() -> float:
    try:
        v = float(_os.environ.get("HIVE_SELF_LEARN_MIN_DELTA", str(_MIN_PROMPT_DELTA)))
        return max(0.0, min(1.0, v))
    except Exception:
        return _MIN_PROMPT_DELTA


async def run_self_learn(
    *,
    days: Optional[int] = None,
    min_feeds: Optional[int] = None,
    min_delta: Optional[float] = None,
    force: bool = False,
) -> dict:
    """The single entry point that bootstrap_rag and seed.py call.

    Honors the HIVE_SELF_LEARN* env vars by default. Set HIVE_SELF_LEARN=0
    to disable. Set HIVE_SELF_LEARN_FORCE=1 to bypass thresholds.
    """
    if not self_learn_enabled() and not force:
        return {"ok": True, "skipped": True, "reason": "HIVE_SELF_LEARN disabled"}
    res = await auto_apply_recent(
        days=days or self_learn_days(),
        min_feeds=min_feeds if min_feeds is not None else self_learn_min_feeds(),
        min_delta=min_delta if min_delta is not None else self_learn_min_delta(),
        force=force or _os.environ.get("HIVE_SELF_LEARN_FORCE", "0") == "1",
    )
    res["ok"] = True
    return res
