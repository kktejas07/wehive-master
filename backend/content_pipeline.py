"""Content Automation Pipeline — multi-agent content generation.

Three-stage pipeline using the existing agent framework:
  1. Research: find trending visa/study-abroad topics
  2. Write: generate content in the requested format
  3. Review: check accuracy, tone, compliance

Content types: reel_30s, reel_10s, linkedin_post, newsletter_article.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from agent_framework import AgentSpec, run_agent
from db import db

logger = logging.getLogger("wehive.content_pipeline")

CONTENT_TYPES: dict[str, dict[str, Any]] = {
    "reel_30s": {
        "max_words": 80,
        "format": "30-second Reel script with visual cues in brackets",
        "tone": "energetic, hook-first",
    },
    "reel_10s": {
        "max_words": 30,
        "format": "10-second Reel with one punchy fact",
        "tone": "quick, surprising",
    },
    "linkedin_post": {
        "max_words": 300,
        "format": "professional LinkedIn post with hashtags",
        "tone": "informative, engaging",
    },
    "newsletter_article": {
        "max_words": 800,
        "format": "newsletter article with sections and headers",
        "tone": "authoritative, helpful",
    },
}

_REVIEW_REWRITE_THRESHOLD = 7
_MAX_REWRITES = 1


# ---------------------------------------------------------------------------
# Agent specs
# ---------------------------------------------------------------------------


def _research_spec() -> AgentSpec:
    return AgentSpec(
        id="content_research",
        name="Content Researcher",
        role="a visa news researcher who finds trending topics for social media content",
        prompt_id="content.research",
        tools=["rag_search"],
        rag_collections=["wehive_kb", "scraped_visa_updates"],
    )


def _writer_spec(content_type: str) -> AgentSpec:
    ct = CONTENT_TYPES.get(content_type, CONTENT_TYPES["linkedin_post"])
    return AgentSpec(
        id="content_writer",
        name="Content Writer",
        role=(
            f"a social media content writer. Write in {ct['tone']} tone. "
            f"Format: {ct['format']}. Max {ct['max_words']} words."
        ),
        prompt_id="content.write",
        tools=["rag_search"],
        rag_collections=["wehive_kb"],
    )


def _reviewer_spec() -> AgentSpec:
    return AgentSpec(
        id="content_reviewer",
        name="Content Reviewer",
        role=(
            "a content reviewer for a visa/education platform. "
            "Check factual accuracy, tone appropriateness, compliance "
            "(no guaranteed outcomes, include disclaimers). "
            'Return JSON: {"approved": bool, "score": 0-10, "issues": [...], "suggestions": [...]}'
        ),
        prompt_id="content.review",
        tools=["rag_search"],
        rag_collections=["wehive_kb"],
    )


# ---------------------------------------------------------------------------
# Review parsing
# ---------------------------------------------------------------------------

_JSON_RE = re.compile(r"\{[^{}]*\}", re.S)


def _parse_review(text: str) -> dict:
    """Best-effort parse of the reviewer agent's JSON output."""
    m = _JSON_RE.search(text)
    if m:
        try:
            parsed = json.loads(m.group(0))
            return {
                "approved": bool(parsed.get("approved", False)),
                "score": min(max(int(parsed.get("score", 0)), 0), 10),
                "issues": list(parsed.get("issues") or []),
                "suggestions": list(parsed.get("suggestions") or []),
                "raw": text,
            }
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return {"approved": False, "score": 5, "issues": [], "suggestions": [], "raw": text}


# ---------------------------------------------------------------------------
# Pipeline execution
# ---------------------------------------------------------------------------


def _run_id() -> str:
    return uuid4().hex[:16]


def _stage_record(agent_run) -> dict:
    return {
        "output": agent_run.final_answer,
        "duration_ms": agent_run.duration_ms,
        "provider": agent_run.provider,
        "model": agent_run.model,
        "error": agent_run.error,
    }


async def run_pipeline(
    content_type: str,
    topic: str = "",
    admin_id: str = "",
) -> dict:
    """Execute the full research → write → review pipeline."""
    if content_type not in CONTENT_TYPES:
        content_type = "linkedin_post"

    run_id = _run_id()
    stages: dict[str, Any] = {}
    now = datetime.utcnow().isoformat()

    doc: dict[str, Any] = {
        "_id": run_id,
        "content_type": content_type,
        "topic": topic,
        "stages": stages,
        "final_content": "",
        "review": {},
        "status": "running",
        "admin_id": admin_id,
        "created_at": now,
        "approved_at": None,
        "rejected_at": None,
        "rejection_feedback": None,
    }
    await db["content_pipeline_runs"].insert_one(doc)

    try:
        # Stage 1: Research
        research_input = topic or "Find a trending visa or study-abroad topic for social media content"
        research_run = await run_agent(_research_spec(), research_input, user_id=admin_id)
        stages["research"] = _stage_record(research_run)

        # Stage 2: Write
        write_input = f"Write a {content_type} about: {research_run.final_answer}"
        writer_run = await run_agent(_writer_spec(content_type), write_input, user_id=admin_id)
        stages["write"] = _stage_record(writer_run)

        # Stage 3: Review
        review_input = (
            f"Review this {content_type} for accuracy and compliance:\n\n"
            f"{writer_run.final_answer}"
        )
        review_run = await run_agent(_reviewer_spec(), review_input, user_id=admin_id)
        stages["review"] = _stage_record(review_run)
        review = _parse_review(review_run.final_answer)

        # Optional rewrite if score below threshold
        if review["score"] < _REVIEW_REWRITE_THRESHOLD:
            feedback = "; ".join(review.get("issues", []) + review.get("suggestions", []))
            rewrite_input = (
                f"Rewrite this {content_type}. Address these issues: {feedback}\n\n"
                f"Original:\n{writer_run.final_answer}"
            )
            rewrite_run = await run_agent(_writer_spec(content_type), rewrite_input, user_id=admin_id)
            stages["rewrite"] = _stage_record(rewrite_run)

            re_review_input = (
                f"Review this revised {content_type} for accuracy and compliance:\n\n"
                f"{rewrite_run.final_answer}"
            )
            re_review_run = await run_agent(_reviewer_spec(), re_review_input, user_id=admin_id)
            stages["re_review"] = _stage_record(re_review_run)
            review = _parse_review(re_review_run.final_answer)
            final_content = rewrite_run.final_answer
        else:
            final_content = writer_run.final_answer

        status = "completed" if review.get("approved") else "needs_review"

        await db["content_pipeline_runs"].update_one(
            {"_id": run_id},
            {"$set": {
                "stages": stages,
                "final_content": final_content,
                "review": review,
                "status": status,
                "finished_at": datetime.utcnow().isoformat(),
            }},
        )

        return {
            "run_id": run_id,
            "status": status,
            "content": final_content,
            "review": review,
            "stages": stages,
        }

    except Exception as e:
        logger.exception("Content pipeline failed: %s", e)
        await db["content_pipeline_runs"].update_one(
            {"_id": run_id},
            {"$set": {
                "stages": stages,
                "status": "error",
                "error": str(e),
                "finished_at": datetime.utcnow().isoformat(),
            }},
        )
        return {"run_id": run_id, "status": "error", "error": str(e), "stages": stages}


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------


async def list_runs(
    limit: int = 20,
    skip: int = 0,
    status: Optional[str] = None,
    content_type: Optional[str] = None,
) -> list[dict]:
    query: dict[str, Any] = {}
    if status:
        query["status"] = status
    if content_type:
        query["content_type"] = content_type
    cursor = (
        db["content_pipeline_runs"]
        .find(query, {"_id": 1, "content_type": 1, "topic": 1, "status": 1,
                       "review.score": 1, "created_at": 1, "finished_at": 1, "admin_id": 1})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    results = []
    async for doc in cursor:
        doc["id"] = doc.pop("_id")
        results.append(doc)
    return results


async def get_run(run_id: str) -> Optional[dict]:
    doc = await db["content_pipeline_runs"].find_one({"_id": run_id})
    if doc:
        doc["id"] = doc.pop("_id")
    return doc


async def approve_run(run_id: str, admin_id: str) -> bool:
    res = await db["content_pipeline_runs"].update_one(
        {"_id": run_id, "status": {"$in": ["completed", "needs_review"]}},
        {"$set": {"status": "approved", "approved_at": datetime.utcnow().isoformat(), "approved_by": admin_id}},
    )
    return (res.modified_count or 0) > 0


async def reject_run(run_id: str, admin_id: str, feedback: str = "") -> bool:
    res = await db["content_pipeline_runs"].update_one(
        {"_id": run_id, "status": {"$in": ["completed", "needs_review"]}},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.utcnow().isoformat(),
            "rejected_by": admin_id,
            "rejection_feedback": feedback,
        }},
    )
    return (res.modified_count or 0) > 0
