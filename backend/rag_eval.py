"""RAG Evaluation — LLM-as-judge metrics for RAG answer quality.

Three core metrics (inspired by RAGAS, implemented without the package):
  - Faithfulness: is the answer grounded in the retrieved context?
  - Answer Relevancy: does the answer actually address the question?
  - Context Precision: are the retrieved chunks relevant to the question?

All LLM calls go through the existing agent_framework._llm_call() so
provider routing, BYOK, and fallback behaviour are inherited.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from db import db

logger = logging.getLogger("wehive.rag_eval")

_EVAL_SYSTEM = (
    "You are a strict evaluation assistant. "
    "Always respond with valid JSON only — no markdown fences, no commentary."
)


# ---------------------------------------------------------------------------
# Cosine similarity (no numpy)
# ---------------------------------------------------------------------------

def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _parse_json(text: str) -> Any:
    """Best-effort JSON extraction from LLM output."""
    text = text.strip()
    m = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if m:
        text = m.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m2 = re.search(r'(\{[\s\S]*\})', text)
        if m2:
            try:
                return json.loads(m2.group(1))
            except json.JSONDecodeError:
                pass
    return None


# ---------------------------------------------------------------------------
# Metric 1: Faithfulness
# ---------------------------------------------------------------------------

async def score_faithfulness(
    question: str,
    answer: str,
    contexts: list[str],
    user_id: str = "",
) -> dict:
    """Is every claim in the answer supported by the retrieved context?

    Returns {"score": 0.0-1.0, "claims": [...], "unsupported": [...]}.
    """
    from agent_framework import _llm_call

    context_block = "\n---\n".join(contexts) if contexts else "(no context)"

    prompt = (
        "Given the following context and answer, extract every atomic factual "
        "claim from the answer. Then for each claim, determine whether it is "
        "supported by the context.\n\n"
        f"Context:\n{context_block}\n\n"
        f"Question: {question}\n\n"
        f"Answer: {answer}\n\n"
        'Return JSON: {{"claims": [{{"claim": "...", "supported": true/false}}]}}'
    )

    try:
        reply, _ = await _llm_call(user_id, _EVAL_SYSTEM, prompt, max_tokens=1024)
        parsed = _parse_json(reply)
        if not parsed or "claims" not in parsed:
            return {"score": 0.0, "claims": [], "unsupported": [], "error": "parse_failed"}

        claims = parsed["claims"]
        total = len(claims)
        if total == 0:
            return {"score": 1.0, "claims": [], "unsupported": []}

        unsupported = [c["claim"] for c in claims if not c.get("supported")]
        score = (total - len(unsupported)) / total
        return {
            "score": round(score, 4),
            "claims": [c["claim"] for c in claims],
            "unsupported": unsupported,
        }
    except Exception as e:
        logger.warning("Faithfulness scoring failed: %s", e)
        return {"score": 0.0, "claims": [], "unsupported": [], "error": str(e)}


# ---------------------------------------------------------------------------
# Metric 2: Answer Relevancy
# ---------------------------------------------------------------------------

async def score_answer_relevancy(
    question: str,
    answer: str,
    user_id: str = "",
) -> dict:
    """Does the answer address the question?

    Generates hypothetical questions from the answer, then measures cosine
    similarity between their embeddings and the original question's embedding.

    Returns {"score": 0.0-1.0, "generated_questions": [...]}.
    """
    from agent_framework import _llm_call
    from embeddings_bge import embed_query

    prompt = (
        "Given the following answer, generate exactly 3 questions that this "
        "answer would be a good response to. The questions should be diverse "
        "but all answered by the given text.\n\n"
        f"Answer: {answer}\n\n"
        'Return JSON: {{"questions": ["q1", "q2", "q3"]}}'
    )

    try:
        reply, _ = await _llm_call(user_id, _EVAL_SYSTEM, prompt, max_tokens=512)
        parsed = _parse_json(reply)
        if not parsed or "questions" not in parsed:
            return {"score": 0.0, "generated_questions": [], "error": "parse_failed"}

        gen_questions = parsed["questions"][:3]
        if not gen_questions:
            return {"score": 0.0, "generated_questions": [], "error": "no_questions"}

        orig_vec = await embed_query(question)
        if not orig_vec:
            return {"score": 0.0, "generated_questions": gen_questions, "error": "embed_failed"}

        sims: list[float] = []
        for gq in gen_questions:
            gv = await embed_query(gq)
            if gv:
                sims.append(_cosine(orig_vec, gv))

        score = sum(sims) / len(sims) if sims else 0.0
        score = max(0.0, min(1.0, score))

        return {
            "score": round(score, 4),
            "generated_questions": gen_questions,
        }
    except Exception as e:
        logger.warning("Answer relevancy scoring failed: %s", e)
        return {"score": 0.0, "generated_questions": [], "error": str(e)}


# ---------------------------------------------------------------------------
# Metric 3: Context Precision
# ---------------------------------------------------------------------------

async def score_context_precision(
    question: str,
    contexts: list[str],
    user_id: str = "",
) -> dict:
    """Are the retrieved chunks relevant to the question?

    Position-weighted: top-ranked chunks matter more (weight = 1/(rank+1)).

    Returns {"score": 0.0-1.0, "per_chunk": [{"relevant": bool, "reason": str}]}.
    """
    from agent_framework import _llm_call

    if not contexts:
        return {"score": 0.0, "per_chunk": []}

    chunks_block = "\n".join(
        f"Chunk {i+1}: {c[:500]}" for i, c in enumerate(contexts)
    )
    prompt = (
        "For each chunk below, determine if it is relevant to answering the "
        "question. Be strict — a chunk is relevant only if it contains "
        "information that directly helps answer the question.\n\n"
        f"Question: {question}\n\n"
        f"{chunks_block}\n\n"
        "Return JSON: "
        '{{"chunks": [{{"index": 1, "relevant": true/false, "reason": "..."}}]}}'
    )

    try:
        reply, _ = await _llm_call(user_id, _EVAL_SYSTEM, prompt, max_tokens=1024)
        parsed = _parse_json(reply)
        if not parsed or "chunks" not in parsed:
            return {"score": 0.0, "per_chunk": [], "error": "parse_failed"}

        chunk_results = parsed["chunks"]
        per_chunk: list[dict] = []
        weighted_sum = 0.0
        weight_total = 0.0

        for i, ctx in enumerate(contexts):
            weight = 1.0 / (i + 1)
            weight_total += weight

            matching = next(
                (c for c in chunk_results if c.get("index") == i + 1), None
            )
            relevant = matching.get("relevant", False) if matching else False
            reason = matching.get("reason", "") if matching else "not evaluated"

            per_chunk.append({"relevant": relevant, "reason": reason})
            if relevant:
                weighted_sum += weight

        score = weighted_sum / weight_total if weight_total else 0.0
        return {
            "score": round(score, 4),
            "per_chunk": per_chunk,
        }
    except Exception as e:
        logger.warning("Context precision scoring failed: %s", e)
        return {"score": 0.0, "per_chunk": [], "error": str(e)}


# ---------------------------------------------------------------------------
# Full evaluation of a chatbot conversation turn
# ---------------------------------------------------------------------------

async def evaluate_conversation(
    session_id: str,
    message_id: str,
    user_id: str = "",
) -> dict:
    """Run all three metrics on a specific chatbot Q&A pair.

    Pulls question, answer, and reconstructs RAG context from chat_messages.
    Stores result in rag_evaluations collection.
    """
    assistant_msg = await db["chat_messages"].find_one({"_id": message_id})
    if not assistant_msg or assistant_msg.get("role") != "assistant":
        return {"error": "Assistant message not found"}

    answer = assistant_msg.get("content", "")
    contexts = assistant_msg.get("rag_contexts", [])

    user_msg = await db["chat_messages"].find_one(
        {
            "session_id": session_id,
            "role": "user",
            "created_at": {"$lt": assistant_msg.get("created_at")},
        },
        sort=[("created_at", -1)],
    )
    if not user_msg:
        return {"error": "Preceding user message not found"}

    question = user_msg.get("content", "")

    faithfulness, relevancy, precision = await asyncio.gather(
        score_faithfulness(question, answer, contexts, user_id),
        score_answer_relevancy(question, answer, user_id),
        score_context_precision(question, contexts, user_id),
    )

    eval_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    doc = {
        "_id": eval_id,
        "session_id": session_id,
        "message_id": message_id,
        "question": question,
        "answer": answer[:2000],
        "contexts": [c[:500] for c in contexts[:10]],
        "scores": {
            "faithfulness": faithfulness["score"],
            "answer_relevancy": relevancy["score"],
            "context_precision": precision["score"],
        },
        "details": {
            "faithfulness": faithfulness,
            "answer_relevancy": relevancy,
            "context_precision": precision,
        },
        "evaluated_at": now,
        "auto": False,
    }
    await db["rag_evaluations"].insert_one(doc)
    return doc


# ---------------------------------------------------------------------------
# Auto-evaluate hook (fire-and-forget from chatbot)
# ---------------------------------------------------------------------------

async def auto_evaluate_hook(
    session_id: str,
    question: str,
    answer: str,
    contexts: list[str],
    message_id: str = "",
    user_id: str = "",
) -> None:
    """Evaluate every Nth chatbot response. Safe to call as a fire-and-forget
    asyncio.create_task — all exceptions are caught and logged."""
    try:
        config = await db["settings"].find_one({"_id": "rag_eval_config"}) or {}
        if not config.get("auto_enabled", False):
            return

        every_nth = max(1, int(config.get("every_nth", 10)))
        counter = int(config.get("counter", 0)) + 1
        await db["settings"].update_one(
            {"_id": "rag_eval_config"},
            {"$set": {"counter": counter}},
            upsert=True,
        )

        if counter % every_nth != 0:
            return

        faithfulness, relevancy, precision = await asyncio.gather(
            score_faithfulness(question, answer, contexts, user_id),
            score_answer_relevancy(question, answer, user_id),
            score_context_precision(question, contexts, user_id),
        )

        eval_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        await db["rag_evaluations"].insert_one({
            "_id": eval_id,
            "session_id": session_id,
            "message_id": message_id,
            "question": question,
            "answer": answer[:2000],
            "contexts": [c[:500] for c in contexts[:10]],
            "scores": {
                "faithfulness": faithfulness["score"],
                "answer_relevancy": relevancy["score"],
                "context_precision": precision["score"],
            },
            "details": {
                "faithfulness": faithfulness,
                "answer_relevancy": relevancy,
                "context_precision": precision,
            },
            "evaluated_at": now,
            "auto": True,
        })
        logger.info("Auto-eval %s: faith=%.2f rel=%.2f prec=%.2f",
                     eval_id, faithfulness["score"], relevancy["score"], precision["score"])
    except Exception:
        logger.exception("auto_evaluate_hook failed (non-fatal)")
