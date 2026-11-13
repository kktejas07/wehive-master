"""Wise RAG core — retrieval-augmented generation for visa guidance.

Flow:
  1. embed(user_message)
  2. vector_search(visa_knowledge, filter={country, visa_type})
  3. build_prompt(message, chunks)
  4. llm_stream(prompt) → token generator
  5. log_feed(message, chunks, session_id) → ai_feeds
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional

logger = logging.getLogger("wehive.wise.rag")

# ---------------------------------------------------------------------------
# Vector search
# ---------------------------------------------------------------------------

async def vector_search(
    query_vec: List[float],
    country: Optional[str] = None,
    visa_type: Optional[str] = None,
    limit: int = 5,
) -> List[Dict]:
    """Return top-*limit* visa_knowledge chunks similar to *query_vec*.

    Uses MongoDB Atlas $vectorSearch when the index exists, falls back to
    a cosine-similarity scan for local/CI environments.
    """
    from db import visa_knowledge_col

    match_filter: Dict = {}
    if country:
        match_filter["country"] = country
    if visa_type:
        match_filter["visa_type"] = visa_type

    # --- Atlas Vector Search (production) ---
    try:
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "wise_knowledge_vec",
                    "path": "embedding",
                    "queryVector": query_vec,
                    "numCandidates": limit * 10,
                    "limit": limit,
                    **({"filter": match_filter} if match_filter else {}),
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "text": 1,
                    "country": 1,
                    "visa_type": 1,
                    "source_url": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        docs = await visa_knowledge_col.aggregate(pipeline).to_list(length=limit)
        if docs:
            return docs
    except Exception as exc:
        logger.debug("Atlas vector search unavailable (%s), falling back", exc)

    # --- Fallback: cosine-scan (dev / CI) ---
    query = match_filter if match_filter else {}
    cursor = visa_knowledge_col.find(query, {"embedding": 1, "text": 1, "country": 1,
                                              "visa_type": 1, "source_url": 1}).limit(200)
    docs = await cursor.to_list(length=200)

    def cosine(a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5 or 1.0
        nb = sum(x * x for x in b) ** 0.5 or 1.0
        return dot / (na * nb)

    scored = [(cosine(query_vec, d.get("embedding") or []), d) for d in docs if d.get("embedding")]
    scored.sort(key=lambda t: t[0], reverse=True)
    return [
        {"text": d["text"], "country": d.get("country"), "visa_type": d.get("visa_type"),
         "source_url": d.get("source_url"), "score": s}
        for s, d in scored[:limit]
    ]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are Wise, WeHive's expert visa guidance assistant.
You help students and professionals navigate visa applications, interview prep,
and travel planning with accurate, friendly advice.

RULES:
- Base answers on the provided context chunks when available.
- If context is insufficient, say so clearly rather than guessing.
- Never give legal advice — recommend professional consultation for complex cases.
- Keep answers concise, structured, and actionable.
- Always mention the source when quoting regulations."""


def build_prompt(message: str, chunks: List[Dict], system_override: Optional[str] = None) -> List[Dict]:
    """Return OpenAI-style messages list."""
    system = system_override or SYSTEM_PROMPT

    context_parts = []
    for i, c in enumerate(chunks, 1):
        source = c.get("source_url") or "WeHive knowledge base"
        context_parts.append(f"[{i}] {c.get('text', '')} (Source: {source})")

    context_block = "\n\n".join(context_parts) if context_parts else "No specific context found."

    user_content = f"""Context:
{context_block}

User question: {message}"""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]


# ---------------------------------------------------------------------------
# LLM streaming
# ---------------------------------------------------------------------------

async def llm_stream(
    messages: List[Dict],
    model_profile: str = "balanced",
    max_tokens: int = 1024,
) -> AsyncGenerator[str, None]:
    """Stream tokens from the chosen model profile."""
    from model_router import chat_with_profile

    result = await chat_with_profile(
        profile_id=model_profile,
        messages=messages,
        max_tokens=max_tokens,
    )

    if result.get("error"):
        yield f"[Error: {result['error']}]"
        return

    content = result.get("content", result.get("text", ""))
    # Simulate streaming by yielding words (real streaming requires provider-level SSE)
    words = content.split(" ")
    for i, word in enumerate(words):
        yield word + (" " if i < len(words) - 1 else "")


# ---------------------------------------------------------------------------
# Feed logger
# ---------------------------------------------------------------------------

async def log_feed(
    message: str,
    chunks: List[Dict],
    session_id: str,
    agent: str = "wise",
    user_id: Optional[str] = None,
    answer_preview: str = "",
) -> None:
    """Write an entry to ai_feeds (Hive Learning screen)."""
    try:
        from db import ai_feeds_col
        await ai_feeds_col.insert_one({
            "_id": str(uuid.uuid4()),
            "agent": agent,
            "session_id": session_id,
            "user_id": user_id,
            "message": message[:500],
            "chunks_used": len(chunks),
            "answer_preview": answer_preview[:200],
            "sources": [c.get("source_url") for c in chunks if c.get("source_url")],
            "created_at": datetime.now(timezone.utc),
        })
    except Exception as exc:
        logger.warning("log_feed failed: %s", exc)


# ---------------------------------------------------------------------------
# Main entry — wise_chat
# ---------------------------------------------------------------------------

async def wise_chat(
    message: str,
    session_id: str,
    ctx: Dict,
    model_profile: str = "balanced",
    pack_system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Full RAG pipeline — yields SSE-compatible token strings."""
    from wise.embeddings import embed

    # 1. Embed
    query_vec = await embed(message)

    # 2. Retrieve
    chunks = await vector_search(
        query_vec,
        country=ctx.get("country"),
        visa_type=ctx.get("visa_type"),
        limit=5,
    )

    # 3. Build prompt
    messages = build_prompt(message, chunks, system_override=pack_system_prompt)

    # 4. Stream + collect answer
    full_answer = []
    async for token in llm_stream(messages, model_profile=model_profile):
        full_answer.append(token)
        yield token

    # 5. Log
    await log_feed(
        message=message,
        chunks=chunks,
        session_id=session_id,
        user_id=ctx.get("user_id"),
        answer_preview="".join(full_answer),
    )
