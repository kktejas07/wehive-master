"""Aggregator Crew — runs all 4 content aggregators in parallel.

Replaces individual cron invocations with a single coordinated run.
No crewai package needed: asyncio.gather provides the same fan-out/join.

Usage:
    python -m backend.agents.crewai.aggregator_crew
    # or import and call run_all() from a scheduler
"""

import asyncio
import logging
from typing import Any

logger = logging.getLogger("wehive.aggregator_crew")


async def run_all() -> dict[str, Any]:
    """Fan out to all 4 aggregators concurrently; return per-agent summaries."""
    from news_aggregator_agent import run_aggregator as run_news
    from blog_aggregator_agent import run_aggregator as run_blog
    from event_aggregator_agent import run_aggregator as run_event
    from intake_aggregator_agent import run_aggregator as run_intake

    results = await asyncio.gather(
        run_news(),
        run_blog(),
        run_event(),
        run_intake(),
        return_exceptions=True,
    )

    names = ["news", "blog", "event", "intake"]
    summary: dict[str, Any] = {}
    for name, result in zip(names, results):
        if isinstance(result, Exception):
            logger.error("%s aggregator failed: %s", name, result)
            summary[name] = {"status": "error", "error": str(result)}
        else:
            summary[name] = {"status": "ok", **(result or {})}

    logger.info("aggregator_crew finished: %s", summary)
    return summary


if __name__ == "__main__":
    asyncio.run(run_all())
