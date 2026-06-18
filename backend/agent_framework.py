"""Agent Framework — composable, tool-using LLM agents.

Each Agent combines:
  - a system prompt (looked up by id in the prompts library)
  - a set of tools (looked up by name in the tool_registry)
  - a model spec (provider + model)
  - optional memory (sliding window of recent messages)
  - a max-iteration cap for the ReAct loop

AgentRun records the trace (one entry per iteration: thought, tool_call,
observation) plus the final answer. This is what callers persist and
display in the admin UI.

The framework integrates with:
  - ai_marketplace.AIMarketplace  for LLM calls (any provider, including Ollama)
  - tool_registry                 for tools
  - prompts_lib                   for prompt templates
  - vector_store                  for RAG context retrieval
  - rag_service                   for keyword-based fallback retrieval
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger("wehive.agent_framework")

DEFAULT_MAX_ITERATIONS = 6
DEFAULT_MAX_TOKENS = 1024
TOOL_CALL_RE = re.compile(r'TOOL:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)', re.S)


@dataclass
class AgentSpec:
    """Static definition of an agent — what it is, not what it did."""

    id: str
    name: str
    role: str
    prompt_id: str
    tools: list[str] = field(default_factory=list)
    provider_id: str = "ollama"
    model: str = ""
    max_iterations: int = DEFAULT_MAX_ITERATIONS
    max_tokens: int = DEFAULT_MAX_TOKENS
    memory_window: int = 6
    description: str = ""
    tags: list[str] = field(default_factory=list)
    rag_collections: list[str] = field(default_factory=list)
    temperature: float = 0.3

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "AgentSpec":
        return cls(
            id=str(d.get("id") or "").strip(),
            name=str(d.get("name") or d.get("id") or "Agent"),
            role=str(d.get("role") or "a helpful assistant"),
            prompt_id=str(d.get("prompt_id") or "agent.react"),
            tools=list(d.get("tools") or []),
            provider_id=str(d.get("provider_id") or "ollama"),
            model=str(d.get("model") or ""),
            max_iterations=int(d.get("max_iterations") or DEFAULT_MAX_ITERATIONS),
            max_tokens=int(d.get("max_tokens") or DEFAULT_MAX_TOKENS),
            memory_window=int(d.get("memory_window") or 6),
            description=str(d.get("description") or ""),
            tags=list(d.get("tags") or []),
            rag_collections=list(d.get("rag_collections") or []),
            temperature=float(d.get("temperature") or 0.3),
        )


@dataclass
class AgentStep:
    iteration: int
    thought: str
    tool_name: Optional[str] = None
    tool_args: dict = field(default_factory=dict)
    observation: Optional[str] = None
    error: Optional[str] = None
    duration_ms: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AgentRun:
    agent_id: str
    input: str
    steps: list[AgentStep] = field(default_factory=list)
    final_answer: str = ""
    provider: str = ""
    model: str = ""
    started_at: str = ""
    finished_at: str = ""
    duration_ms: int = 0
    error: Optional[str] = None
    user_id: str = ""

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "input": self.input,
            "steps": [s.to_dict() for s in self.steps],
            "final_answer": self.final_answer,
            "provider": self.provider,
            "model": self.model,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "duration_ms": self.duration_ms,
            "error": self.error,
            "user_id": self.user_id,
        }


# ---------------------------------------------------------------------------
# Tool-call parsing — tolerant to extra text in LLM output
# ---------------------------------------------------------------------------


def parse_tool_call(text: str) -> Optional[tuple[str, dict]]:
    """Extract the first TOOL: name(args) call from a model response.

    Returns (name, args_dict) or None if no tool call found.
    """
    if not text:
        return None
    m = TOOL_CALL_RE.search(text)
    if not m:
        return None
    name = m.group(1).strip()
    args_str = m.group(2).strip()
    args: dict[str, Any] = {}
    if not args_str:
        return name, args
    try:
        for pair in _split_args(args_str):
            if "=" not in pair:
                continue
            k, v = pair.split("=", 1)
            k = k.strip()
            v = v.strip()
            if v.startswith('"') and v.endswith('"'):
                v = v[1:-1]
            elif v.startswith("'") and v.endswith("'"):
                v = v[1:-1]
            args[k] = v
    except Exception as e:
        logger.debug("Tool-call arg parse failed: %s", e)
    return name, args


def _split_args(s: str) -> list[str]:
    """Split tool-call args on commas, respecting quoted strings."""
    out: list[str] = []
    buf = ""
    in_q: Optional[str] = None
    for ch in s:
        if in_q:
            buf += ch
            if ch == in_q:
                in_q = None
        elif ch in ('"', "'"):
            in_q = ch
            buf += ch
        elif ch == ",":
            if buf.strip():
                out.append(buf.strip())
            buf = ""
        else:
            buf += ch
    if buf.strip():
        out.append(buf.strip())
    return out


# ---------------------------------------------------------------------------
# Tool registry helpers
# ---------------------------------------------------------------------------


def get_tool_descriptions(tool_names: list[str]) -> str:
    """Format a list of tool descriptions for the system prompt."""
    from tool_registry import get_tool

    lines: list[str] = []
    for n in tool_names:
        t = get_tool(n)
        if not t:
            continue
        params = t.parameters.get("properties", {}) if isinstance(t.parameters, dict) else {}
        params_str = ", ".join(
            f"{k}: {p.get('description', p.get('type', ''))}" for k, p in params.items()
        )
        lines.append(f"- {t.name}({params_str}) — {t.description}")
    return "\n".join(lines) if lines else "(no tools available)"


async def call_tool_by_name(name: str, args: dict[str, Any]) -> tuple[Any, Optional[str]]:
    """Dispatch a tool call to the registry. Returns (result, error)."""
    from tool_registry import get_tool

    t = get_tool(name)
    if not t:
        return None, f"Unknown tool: {name}"
    try:
        coerced = _coerce_args(args, t.parameters)
        result = await t.handler(**coerced)
        return result, None
    except Exception as e:
        logger.exception("Tool call failed: %s(%s)", name, args)
        return None, str(e)


def _coerce_args(args: dict[str, Any], schema: dict) -> dict[str, Any]:
    """Coerce string args to the JSON-schema declared type (best-effort)."""
    if not isinstance(schema, dict):
        return args
    props = schema.get("properties", {}) or {}
    out: dict[str, Any] = {}
    for k, v in args.items():
        spec = props.get(k, {})
        t = (spec or {}).get("type", "string")
        if t == "integer" and isinstance(v, str) and v.lstrip("-").isdigit():
            out[k] = int(v)
        elif t == "number" and isinstance(v, str):
            try:
                out[k] = float(v)
            except ValueError:
                out[k] = v
        elif t == "boolean" and isinstance(v, str):
            out[k] = v.lower() in ("true", "1", "yes")
        else:
            out[k] = v
    return out


# ---------------------------------------------------------------------------
# LLM invocation — uses AI Marketplace so any provider (incl. Ollama) works
# ---------------------------------------------------------------------------


async def _llm_call(
    user_id: str,
    system_prompt: str,
    user_prompt: str,
    provider_id: str = "",
    model: str = "",
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> tuple[str, dict]:
    """Invoke the LLM via AI Marketplace, optionally with a forced provider.

    Returns (reply_text, provider_info). Falls back to local Ollama via
    local_llm if no marketplace provider is configured.
    """
    from ai_marketplace import marketplace

    if provider_id and model:
        try:
            from ai_marketplace import get_provider, PROVIDER_REGISTRY
            meta = PROVIDER_REGISTRY.get(provider_id, {})
            base_url = meta.get("default_url", "") if provider_id == "ollama" else meta.get("base_url", "")
            provider = get_provider(provider_id, key="", base_url=base_url, model=model)
            reply = await provider.chat(system_prompt, user_prompt, max_tokens)
            return reply, {
                "id": provider_id,
                "name": meta.get("name", provider_id),
                "model": model,
                "powered_by_tagline": meta.get("powered_by_tagline", ""),
            }
        except Exception as e:
            logger.warning("Forced provider %s/%s failed: %s — falling back to marketplace", provider_id, model, e)

    try:
        return await marketplace.chat_with_info(user_id, system_prompt, user_prompt, max_tokens)
    except Exception as e:
        logger.warning("Marketplace chat failed: %s — trying local Ollama", e)
        from local_llm import local_chat_with_info

        reply, info = await local_chat_with_info(user_prompt, context=system_prompt)
        return reply, info


# ---------------------------------------------------------------------------
# RAG context retrieval (optional)
# ---------------------------------------------------------------------------


async def _retrieve_rag_context(query: str, collections: list[str], k: int = 4) -> str:
    """Pull top-k chunks from each requested collection. Returns formatted text."""
    if not collections:
        return ""
    from ollama_embeddings import embed_query
    from vector_store import query_collection

    try:
        vec = await embed_query(query)
    except Exception as e:
        logger.warning("RAG embed failed: %s", e)
        return ""
    if not vec:
        return ""
    snippets: list[str] = []
    for coll in collections:
        try:
            hits = query_collection(coll, vec, n_results=k)
        except Exception as e:
            logger.warning("RAG query on %s failed: %s", coll, e)
            continue
        for h in hits:
            meta = h.get("metadata") or {}
            label = meta.get("name") or meta.get("source_key") or h.get("id") or "source"
            snippets.append(f"[{label}] {h.get('document', '')}")
    return "\n\n".join(snippets)


# ---------------------------------------------------------------------------
# Agent execution
# ---------------------------------------------------------------------------


async def run_agent(
    spec: AgentSpec,
    user_input: str,
    *,
    user_id: str = "",
    context: str = "",
    conversation_history: Optional[list[dict]] = None,
) -> AgentRun:
    """Execute an agent on a single user input.

    The agent is invoked as a ReAct loop:
      1. Build system + user prompt from spec.prompt_id via prompts_lib
      2. Optionally augment with RAG context
      3. Call the LLM
      4. If the response contains TOOL: name(args), call the tool and feed
         the observation back. Repeat up to spec.max_iterations times.
      5. Return the final answer (or the last response if no tool call).
    """
    from prompts_lib import get_store, render_prompt, Prompt

    run = AgentRun(
        agent_id=spec.id,
        input=user_input,
        started_at=datetime.utcnow().isoformat(),
        user_id=user_id,
    )
    t0 = time.time()

    try:
        store = get_store()
        prompt = store.get(spec.prompt_id)
        if not prompt:
            prompt = Prompt(
                id=spec.prompt_id,
                version=1,
                description="Ad-hoc fallback",
                tags=[],
                variables=["user_input", "tools_description", "agent_name", "agent_role", "context"],
                system=(
                    "You are {{ agent_name }}, {{ agent_role }}.\n"
                    "Answer the user's question concisely.\n"
                    "Tools available:\n{{ tools_description }}\n"
                    "If you need data, write: TOOL: tool_name(key=value)"
                ),
                user="{{ user_input }}",
                source="ad-hoc",
            )

        tools_desc = get_tool_descriptions(spec.tools)
        rag_context = ""
        if spec.rag_collections:
            rag_context = await _retrieve_rag_context(user_input, spec.rag_collections)
        if context:
            rag_context = (rag_context + "\n\n" + context).strip() if rag_context else context

        variables: dict[str, Any] = {
            "user_input": user_input,
            "tools_description": tools_desc,
            "agent_name": spec.name,
            "agent_role": spec.role,
            "context": rag_context,
        }
        rendered = render_prompt(prompt, variables)
        system_prompt = rendered["system"]
        user_prompt = rendered["user"]
        if conversation_history:
            hist_lines = []
            for h in conversation_history[-spec.memory_window:]:
                role = h.get("role", "user")
                content = h.get("content", "")
                if content:
                    hist_lines.append(f"{role.capitalize()}: {content}")
            if hist_lines:
                system_prompt += "\n\nRecent conversation:\n" + "\n".join(hist_lines)

        available_tools = set(spec.tools)

        for iteration in range(spec.max_iterations):
            step_t0 = time.time()
            try:
                response, info = await _llm_call(
                    user_id=user_id,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    provider_id=spec.provider_id,
                    model=spec.model,
                    max_tokens=spec.max_tokens,
                )
            except Exception as e:
                logger.exception("LLM call failed in agent %s: %s", spec.id, e)
                run.error = f"LLM call failed: {e}"
                run.final_answer = f"[Agent error: {e}]"
                break

            run.provider = info.get("id", "") if isinstance(info, dict) else ""
            run.model = info.get("model", "") if isinstance(info, dict) else ""

            parsed = parse_tool_call(response or "")
            if not parsed:
                run.steps.append(
                    AgentStep(
                        iteration=iteration,
                        thought=(response or "").strip(),
                        duration_ms=int((time.time() - step_t0) * 1000),
                    )
                )
                run.final_answer = (response or "").strip()
                break

            tool_name, tool_args = parsed
            if tool_name not in available_tools:
                obs = f"Error: tool '{tool_name}' is not available to this agent."
                run.steps.append(
                    AgentStep(
                        iteration=iteration,
                        thought=response.strip(),
                        tool_name=tool_name,
                        tool_args=tool_args,
                        observation=obs,
                        duration_ms=int((time.time() - step_t0) * 1000),
                    )
                )
                user_prompt = (
                    f"{user_prompt}\n\nObservation: {obs}\n"
                    f"That tool is not available. Either call a valid tool or give a final answer."
                )
                continue

            result, err = await call_tool_by_name(tool_name, tool_args)
            obs = f"Error: {err}" if err else _stringify_tool_result(result)
            run.steps.append(
                AgentStep(
                    iteration=iteration,
                    thought=response.strip(),
                    tool_name=tool_name,
                    tool_args=tool_args,
                    observation=obs,
                    error=err,
                    duration_ms=int((time.time() - step_t0) * 1000),
                )
            )
            user_prompt = (
                f"{user_prompt}\n\nAssistant: {response.strip()}\n\n"
                f"Observation: {obs}\n\nNow decide: call another tool, or give a final answer."
            )
        else:
            if not run.final_answer and run.steps:
                last_thought = run.steps[-1].thought or ""
                run.final_answer = last_thought

    except Exception as e:
        logger.exception("Agent run failed: %s", e)
        run.error = str(e)
        if not run.final_answer:
            run.final_answer = f"[Agent error: {e}]"

    run.finished_at = datetime.utcnow().isoformat()
    run.duration_ms = int((time.time() - t0) * 1000)
    return run


def _stringify_tool_result(result: Any) -> str:
    if result is None:
        return "(no result)"
    if isinstance(result, str):
        return result[:3000]
    try:
        return json.dumps(result, ensure_ascii=False, default=str)[:3000]
    except Exception:
        return str(result)[:3000]


# ---------------------------------------------------------------------------
# Registry — agent definitions stored in Mongo
# ---------------------------------------------------------------------------


class AgentRegistry:
    """CRUD over agent specs in MongoDB collection `agent_definitions`."""

    def __init__(self, db: Any = None):
        self.db = db
        self._coll_name = "agent_definitions"

    def bind_db(self, db: Any) -> None:
        self.db = db

    def _coll(self):
        if self.db is None:
            from db import db as _db

            self.db = _db
        return self.db[self._coll_name]

    async def upsert(self, spec: AgentSpec) -> AgentSpec:
        if not spec.id:
            raise ValueError("Agent id is required")
        coll = self._coll()
        doc = spec.to_dict()
        doc["updated_at"] = datetime.utcnow().isoformat()
        await coll.update_one(
            {"id": spec.id},
            {"$set": doc, "$setOnInsert": {"created_at": doc["updated_at"]}},
            upsert=True,
        )
        return spec

    async def get(self, agent_id: str) -> Optional[AgentSpec]:
        coll = self._coll()
        d = await coll.find_one({"id": agent_id}, {"_id": 0})
        if not d:
            return None
        return AgentSpec.from_dict(d)

    async def list(self) -> list[AgentSpec]:
        coll = self._coll()
        out: list[AgentSpec] = []
        async for d in coll.find({}, {"_id": 0}):
            try:
                out.append(AgentSpec.from_dict(d))
            except Exception as e:
                logger.warning("Bad agent doc: %s", e)
        return out

    async def delete(self, agent_id: str) -> bool:
        coll = self._coll()
        res = await coll.delete_one({"id": agent_id})
        return (res.deleted_count or 0) > 0


_registry: Optional[AgentRegistry] = None


def get_agent_registry(db: Any = None) -> AgentRegistry:
    global _registry
    if _registry is None:
        _registry = AgentRegistry(db=db)
    elif db is not None:
        _registry.bind_db(db)
    return _registry
