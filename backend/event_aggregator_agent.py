"""Global Events Aggregator Agent (optional ScrapeGraphAI).

There is no reliable public events feed for our audience, so event discovery
only runs when ScrapeGraphAI is installed AND OPENAI_API_KEY is configured.
Otherwise it returns nothing (it never asks an LLM to invent events).
Scraped events are stored as *pending* for admin review.
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from db import global_events_col

try:
    from scrapegraphai.graphs import SmartScraperGraph
    SCRAPEGRAPH_AVAILABLE = True
except ImportError:
    SCRAPEGRAPH_AVAILABLE = False


logger = logging.getLogger("wehive.event_aggregator")

# Public listing pages scraped when ScrapeGraphAI is enabled.
SEED_URLS = {
    "united-kingdom": [{"url": "https://www.eventbrite.co.uk/d/united-kingdom/all-events/", "platform": "website"}],
    "usa": [{"url": "https://www.eventbrite.com/d/ny--new-york/all-events/", "platform": "website"}],
}

_PROMPT = """
Extract all upcoming events, festivals, conferences, or gatherings listed on this page.
Format the output strictly as a JSON array of objects with the following keys:
- "name": string (Title of the event)
- "date": string (event date as printed on the page, ISO "YYYY-MM-DD"; null if not shown)
- "category": string (e.g., "Music", "Tech", "Culture", "Meetup")
- "image_url": string (main image if present, else null)
- "source_url": string (link to the event page if present, else null)
- "is_high_risk": boolean (True if it's a massive gathering >50k people or politically sensitive)
"""


def scraping_enabled() -> Optional[str]:
    """Return None when scraping can run, else the reason it is disabled."""
    if not SCRAPEGRAPH_AVAILABLE:
        return "ScrapeGraphAI not installed"
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        return "OPENAI_API_KEY not configured"
    return None


async def fetch_events_from_url(url: str, country: str, platform: str = None) -> List[Dict[str, Any]]:
    """Scrape events from a public page with ScrapeGraphAI; [] when disabled or on failure."""
    reason = scraping_enabled()
    if reason:
        logger.info("Event scraping skipped for %s: %s.", url, reason)
        return []

    graph_config = {
        "llm": {"api_key": os.environ["OPENAI_API_KEY"].strip(), "model": "openai/gpt-4o-mini"},
        "verbose": False,
        "headless": True,
    }

    def run_scraper():
        return SmartScraperGraph(prompt=_PROMPT, source=url, config=graph_config).run()

    result = await asyncio.to_thread(run_scraper)
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        if isinstance(result.get("events"), list):
            return result["events"]
        for v in result.values():
            if isinstance(v, list):
                return v
    return []


async def run_aggregator() -> Dict[str, Any]:
    """Scrape SEED_URLS (if enabled) and insert pending events. Returns counts/errors."""
    stats: Dict[str, Any] = {"inserted": 0, "updated": 0, "skipped": 0, "errors": []}
    reason = scraping_enabled()
    if reason:
        logger.info("Event aggregator skipped: %s (no public events feed; nothing fabricated).", reason)
        stats["disabled"] = reason
        return stats

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    for country_id, seeds in SEED_URLS.items():
        for seed in seeds:
            try:
                events = await fetch_events_from_url(seed["url"], country_id, seed.get("platform"))
            except Exception as e:
                msg = f"{seed['url']}: {type(e).__name__}: {e}"[:300]
                logger.warning("Event scrape failed — %s", msg)
                stats["errors"].append(msg)
                continue
            for evt in events:
                name = evt.get("name") or evt.get("title")
                if not name:
                    continue
                evt_date = evt.get("date")
                if not isinstance(evt_date, str) or len(evt_date) < 10:
                    evt_date = None  # unknown date stays unknown
                elif evt_date[:10] < today_str:
                    stats["skipped"] += 1  # past event: drop, never re-date
                    continue
                if await global_events_col.find_one({"name": name, "country_id": country_id, "date": evt_date}):
                    stats["skipped"] += 1
                    continue
                await global_events_col.insert_one({
                    "name": name,
                    "country_id": country_id,
                    "date": evt_date,
                    "category": evt.get("category", "General"),
                    "image_url": evt.get("image_url"),
                    "source_url": evt.get("source_url") or seed["url"],
                    "status": "pending",
                    "is_high_risk": bool(evt.get("is_high_risk", False)),
                    "created_at": datetime.utcnow(),
                })
                stats["inserted"] += 1
            await asyncio.sleep(2)

    logger.info("Event aggregator finished: inserted=%d skipped=%d errors=%d",
                stats["inserted"], stats["skipped"], len(stats["errors"]))
    await run_auto_approval()
    return stats


async def run_auto_approval():
    """Approve low-risk pending events only when AGGREGATOR_AUTO_APPROVE is enabled."""
    if os.environ.get("AGGREGATOR_AUTO_APPROVE", "").lower() not in ("1", "true", "yes"):
        logger.info("AGGREGATOR_AUTO_APPROVE disabled; leaving pending events for admin review.")
        return
    result = await global_events_col.update_many(
        {"status": "pending", "is_high_risk": False}, {"$set": {"status": "approved"}},
    )
    logger.info("Auto-approved %d pending events.", result.modified_count)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_aggregator())
