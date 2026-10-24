"""RAGAS nightly RAG quality evaluator.

Runs a sample of recent chatbot questions through the RAG pipeline and scores
them with RAGAS (faithfulness, answer_relevancy, context_recall).

Falls back gracefully when ragas is not installed or Qdrant is unavailable.

Usage:
    python -m backend.eval.ragas_evaluator          # one-off run
    # or call evaluate() from a scheduler at 02:00 daily

Results stored in MongoDB: rag_eval_runs collection.
Exposed via GET /api/admin/rag/eval/latest and /api/admin/rag/eval/history
(see routes_admin_observability.py).
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from db import db

logger = logging.getLogger("wehive.ragas_eval")

eval_runs_col = db["rag_eval_runs"]

# Sample size — keep small so the nightly job completes quickly.
EVAL_SAMPLE_SIZE = int(os.environ.get("RAGAS_SAMPLE_SIZE", "20"))


def _ragas_available() -> bool:
    try:
        import ragas  # noqa: F401
        return True
    except ImportError:
        return False


async def _sample_questions() -> list[dict[str, Any]]:
    """Pull recent distinct chatbot questions from chat_messages."""
    col = db["chat_messages"]
    cursor = col.find(
        {"role": "user", "text": {"$exists": True, "$ne": ""}},
        {"text": 1, "session_id": 1},
        sort=[("_id", -1)],
    ).limit(EVAL_SAMPLE_SIZE * 3)  # over-fetch to deduplicate
    seen: set[str] = set()
    samples: list[dict[str, Any]] = []
    async for doc in cursor:
        q = doc["text"].strip()
        if q not in seen:
            seen.add(q)
            samples.append({"question": q, "session_id": str(doc.get("session_id", ""))})
        if len(samples) >= EVAL_SAMPLE_SIZE:
            break
    return samples


async def _retrieve_and_answer(question: str) -> dict[str, Any]:
    """Run one question through the RAG pipeline; return contexts + answer."""
    try:
        from qdrant_store import hybrid_search

        hits = await hybrid_search("wehive_kb", question, top_k=5)
        contexts = [h.get("payload", {}).get("text", "") for h in hits]
        ctx_block = "\n\n".join(contexts[:3])
        from local_llm import _ollama_chat
        answer = await _ollama_chat(
            system="Answer using only the provided context. Be concise.",
            prompt=question,
            context=ctx_block,
        ) or ""
        return {"question": question, "answer": answer, "contexts": contexts}
    except Exception as exc:
        logger.debug("retrieve_and_answer failed for %r: %s", question[:60], exc)
        return {"question": question, "answer": "", "contexts": []}


async def evaluate() -> dict[str, Any]:
    """Main entry point. Returns a run summary dict and persists to MongoDB."""
    run: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc),
        "sample_size": 0,
        "scores": {},
        "status": "ok",
    }

    if not _ragas_available():
        run["status"] = "skipped"
        run["reason"] = "ragas not installed — pip install ragas to enable"
        logger.info("RAGAS eval skipped: package not installed")
        await eval_runs_col.insert_one(run)
        return run

    try:
        from ragas import evaluate as ragas_evaluate
        from ragas.metrics import faithfulness, answer_relevancy
        from datasets import Dataset

        samples = await _sample_questions()
        if not samples:
            run["status"] = "skipped"
            run["reason"] = "no chat history found"
            await eval_runs_col.insert_one(run)
            return run

        pipeline_results = await asyncio.gather(
            *[_retrieve_and_answer(s["question"]) for s in samples],
            return_exceptions=True,
        )

        rows = [r for r in pipeline_results if isinstance(r, dict) and r["answer"]]
        if not rows:
            run["status"] = "skipped"
            run["reason"] = "all pipeline calls failed"
            await eval_runs_col.insert_one(run)
            return run

        dataset = Dataset.from_list([
            {
                "question": r["question"],
                "answer": r["answer"],
                "contexts": r["contexts"],
                "ground_truth": "",  # unsupervised — no ground truth
            }
            for r in rows
        ])

        result = ragas_evaluate(dataset, metrics=[faithfulness, answer_relevancy])
        scores = result.to_pandas().mean(numeric_only=True).to_dict()

        run["sample_size"] = len(rows)
        run["scores"] = {k: round(float(v), 4) for k, v in scores.items() if v == v}  # drop NaN
        run["finished_at"] = datetime.now(timezone.utc)
        logger.info("RAGAS eval complete: %s", run["scores"])

    except Exception as exc:
        logger.exception("RAGAS eval failed: %s", exc)
        run["status"] = "error"
        run["error"] = str(exc)

    await eval_runs_col.insert_one(run)
    return run


if __name__ == "__main__":
    asyncio.run(evaluate())
