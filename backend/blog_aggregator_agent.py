"""Global Blogs Aggregator Agent.

Sources real articles from the public RSS feeds of reputable international-
education / student-visa publications and stores them as *pending* blog
documents (real title, author, URL and published date). No LLM is used and
nothing is written or invented here; admins approve items before they appear.
"""

import asyncio
import logging
import os
from typing import Any, Dict, List

from db import global_blogs_col
from news_aggregator_agent import classify_category, upsert_feed_items

logger = logging.getLogger("wehive.blog_aggregator")

CATEGORIES = ["F1", "H1B", "O1", "EB1", "Business", "Travel"]

# Verified to return RSS XML (Oct 2026).
BLOG_FEEDS: List[Dict[str, Any]] = [
    {"name": "The PIE News", "url": "https://thepienews.com/feed/", "country_id": "global"},
    {"name": "ICEF Monitor", "url": "https://monitor.icef.com/feed/", "country_id": "global"},
    {"name": "Study International", "url": "https://www.studyinternational.com/feed/", "country_id": "global"},
]

_GENERIC_AUTHORS = {"", "admin", "editor", "staff"}


def _initials(name: str) -> str:
    return "".join(p[0] for p in name.split()[:2]).upper()


def _blog_doc(feed: Dict[str, Any], item: Dict[str, Any]) -> Dict[str, Any]:
    published = item["published"]
    author = item["author"] if item["author"].lower() not in _GENERIC_AUTHORS else feed["name"]
    return {
        "title": item["title"],
        "country_id": feed["country_id"],
        "date": published.strftime("%Y-%m-%d") if published else None,
        "published_at": published,
        "description": item["summary"],
        "category": classify_category(f"{item['title']} {item['summary']} {' '.join(item['categories'])}"),
        "imageUrl": None,
        "author": {"name": author, "initials": _initials(author)},
        "source_url": item["url"],
        "source_name": feed["name"],
        "source": "rss",
    }


async def run_aggregator() -> Dict[str, Any]:
    """Fetch BLOG_FEEDS and upsert pending blogs. Returns per-run counts/errors."""
    logger.info("Blog aggregator: fetching %d RSS feeds...", len(BLOG_FEEDS))
    stats = await upsert_feed_items(global_blogs_col, BLOG_FEEDS, "blog", _blog_doc)
    await run_auto_approval()
    return stats


async def run_auto_approval():
    """Approve pending blogs only when AGGREGATOR_AUTO_APPROVE is explicitly enabled."""
    if os.environ.get("AGGREGATOR_AUTO_APPROVE", "").lower() not in ("1", "true", "yes"):
        logger.info("AGGREGATOR_AUTO_APPROVE disabled; leaving pending blogs for admin review.")
        return
    result = await global_blogs_col.update_many({"status": "pending"}, {"$set": {"status": "approved"}})
    logger.info("Auto-approved %d pending blogs.", result.modified_count)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_aggregator())
