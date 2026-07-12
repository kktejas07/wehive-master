"""Seed-time self-learner for Hive.

Called by:
  - `bootstrap_rag.bootstrap_rag_and_prompts()` on every server boot
  - `python backend/seed_self_learn.py` (manual trigger from CLI)

Behaviour:
  1. Greps the most recent Hive feeds (window = HIVE_SELF_LEARN_DAYS days,
     default 7).
  2. Asks the LLM to propose a revised system prompt for each of the
     4 Hive agents (hive_visa, hive_travel, hive_documents,
     hive_study_abroad).
  3. If a proposal is materially different (Jaccard distance >=
     HIVE_SELF_LEARN_MIN_DELTA, default 0.12) AND there are at least
     HIVE_SELF_LEARN_MIN_FEEDS feeds in the window (default 8), the new
     prompt is saved as a new version in Mongo. Because the agent
     framework re-reads the latest version on every run, the new prompt
     is in effect immediately — this is the "real-time update" the spec
     asks for.

Disable with HIVE_SELF_LEARN=0. Force-apply (bypass thresholds) with
HIVE_SELF_LEARN_FORCE=1.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from typing import Any

from core.db import db

logger = logging.getLogger("wehive.seed_self_learn")


async def seed_self_learn(db) -> dict:
    """Mine recent feeds and auto-apply improved prompts in real time.

    Returns a summary dict. Never raises — failures are reported in the
    summary so the server boot is not blocked.
    """
    try:
        from shared.feed_miner import run_self_learn
    except Exception as e:
        logger.warning("feed_miner not importable: %s", e)
        return {"ok": False, "skipped": True, "reason": f"import: {e}"}

    try:
        result = await run_self_learn()
        logger.info("Hive self-learn result: %s", json.dumps(result, default=str)[:600])
        return result
    except Exception as e:
        logger.exception("Hive self-learn failed: %s", e)
        return {"ok": False, "error": str(e)}


# ── CLI entry point ────────────────────────────────────────────────────────

async def _amain():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s | %(message)s")
    days = int(os.environ.get("HIVE_SELF_LEARN_DAYS", "7"))
    min_feeds = int(os.environ.get("HIVE_SELF_LEARN_MIN_FEEDS", "8"))
    min_delta = float(os.environ.get("HIVE_SELF_LEARN_MIN_DELTA", "0.12"))
    force = os.environ.get("HIVE_SELF_LEARN_FORCE", "0") == "1"
    print(f"Hive self-learn  days={days}  min_feeds={min_feeds}  "
          f"min_delta={min_delta}  force={force}")
    from shared.feed_miner import run_self_learn
    res = await run_self_learn(days=days, min_feeds=min_feeds, min_delta=min_delta, force=force)
    print(json.dumps(res, indent=2, default=str))


if __name__ == "__main__":
    try:
        asyncio.run(_amain())
    except KeyboardInterrupt:
        sys.exit(0)
