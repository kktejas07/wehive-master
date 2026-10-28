"""Lightweight prompt optimizer — no DSPy package needed.

Reads the last N RAGAS eval runs, identifies the worst-scoring prompt variable
(system prompt for each agent), then uses Ollama to suggest an improved version.
Stores the suggestion in MongoDB (prompt_optimizer_runs) for admin review.

Triggered manually via POST /api/admin/prompts/optimize or nightly by the scheduler.
"""
from __future__ import annotations
import logging
import os
from datetime import datetime
from typing import Any

logger = logging.getLogger("wehive.prompt_optimizer")

EVAL_WINDOW = int(os.environ.get("PROMPT_OPT_EVAL_WINDOW", "5"))  # look at last N eval runs


async def _ollama_chat(system: str, prompt: str) -> str:
    from config import OLLAMA_HOST as host, OLLAMA_GRADE_MODEL as model
    # Use langfuse.openai for automatic generation tracing; fall back to httpx
    try:
        from langfuse.openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=f"{host}/v1", api_key="ollama")
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        pass
    try:
        import httpx
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(f"{host}/api/chat", json={
                "model": model, "stream": False,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            })
            r.raise_for_status()
            return r.json().get("message", {}).get("content", "").strip()
    except Exception as exc:
        logger.warning("Ollama call failed: %s", exc)
        return ""


async def optimize_prompts() -> dict[str, Any]:
    """Read recent RAGAS history, pick the worst run, and suggest improved prompts."""
    from db import db
    run: dict[str, Any] = {
        "started_at": datetime.utcnow(),
        "eval_window": EVAL_WINDOW,
    }
    opt_col = db["prompt_optimizer_runs"]

    # 1. Gather recent eval scores
    cursor = db["rag_eval_runs"].find(
        {"status": "ok"},
        sort=[("_id", -1)],
    ).limit(EVAL_WINDOW)
    evals = [e async for e in cursor]

    if not evals:
        run.update(status="skipped", reason="no completed eval runs found")
        await opt_col.insert_one(run)
        return run

    # 2. Compute average faithfulness and answer_relevancy
    faith_scores = [e.get("faithfulness", 0) for e in evals if "faithfulness" in e]
    rel_scores   = [e.get("answer_relevancy", 0) for e in evals if "answer_relevancy" in e]

    avg_faith = sum(faith_scores) / len(faith_scores) if faith_scores else None
    avg_rel   = sum(rel_scores)   / len(rel_scores)   if rel_scores   else None

    run["avg_faithfulness"]      = avg_faith
    run["avg_answer_relevancy"]  = avg_rel

    # 3. If both scores are high enough, no optimization needed
    threshold = float(os.environ.get("PROMPT_OPT_THRESHOLD", "0.8"))
    if avg_faith is not None and avg_rel is not None:
        if avg_faith >= threshold and avg_rel >= threshold:
            run.update(status="skipped", reason=f"scores above threshold ({threshold})")
            await opt_col.insert_one(run)
            return run

    # 4. Pull the system prompt from the prompts store for the main chatbot agent
    try:
        from prompts_lib import get_store
        store = get_store()
        eva_prompt = store.get("eva_system") or store.get("chatbot_system")
        current_system = eva_prompt.system if eva_prompt else None
    except Exception as exc:
        logger.debug("Could not load current Eva prompt: %s", exc)
        current_system = None

    # 5. Ask Ollama for an improved prompt
    weak_dimension = "faithfulness" if (avg_faith or 1) < (avg_rel or 1) else "answer relevancy"
    context = (
        f"Recent average faithfulness: {avg_faith:.2f if avg_faith else 'N/A'}\n"
        f"Recent average answer relevancy: {avg_rel:.2f if avg_rel else 'N/A'}\n"
        f"Weakest dimension: {weak_dimension}\n"
    )
    if current_system:
        context += f"\nCurrent system prompt:\n{current_system[:1500]}"

    suggestion = await _ollama_chat(
        system=(
            "You are a prompt engineer specializing in immigration AI assistants. "
            "Your task is to rewrite an AI assistant's system prompt to improve "
            "its RAG faithfulness and answer relevancy scores."
        ),
        prompt=(
            f"Based on these RAGAS evaluation metrics:\n{context}\n\n"
            "Write an improved system prompt for the Eva immigration assistant. "
            "Focus on reducing hallucination and staying grounded in retrieved context. "
            "Return ONLY the improved system prompt text, nothing else."
        ),
    )

    if not suggestion:
        run.update(status="error", reason="Ollama returned empty suggestion")
        await opt_col.insert_one(run)
        return run

    # 6. Store suggestion for admin review (never auto-applies)
    run.update(
        status="ok",
        suggestion=suggestion[:3000],
        weak_dimension=weak_dimension,
        message="Suggestion stored for admin review. Apply via Prompts admin panel.",
    )
    await opt_col.insert_one(run)
    logger.info("Prompt optimizer: suggestion stored (weak: %s)", weak_dimension)
    return run
