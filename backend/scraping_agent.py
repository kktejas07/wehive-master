"""Scraping Agent — automated web scraping for visa updates.

Scrapes official government and embassy websites on a schedule,
detects content changes via difflib, and ingests new content into
the RAG vector store for retrieval.

Uses httpx + BeautifulSoup (same stack as visa_rules_agent.py).
"""

from __future__ import annotations

import asyncio
import difflib
import hashlib
import logging
import time
import uuid
from datetime import datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from db import db

logger = logging.getLogger("wehive.scraping_agent")

USER_AGENT = "WeHive-Scraper/1.0 (+https://wehive.co.in)"
SCRAPE_TIMEOUT = 20
MAX_CONTENT_SIZE = 5 * 1024 * 1024

DEFAULT_TARGETS = [
    {
        "url": "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html",
        "selector": "div.tsg-rwd-main-copy",
        "name": "US Visa Bulletin",
        "category": "us_visa",
    },
    {
        "url": "https://www.uscis.gov/newsroom/news-releases",
        "selector": "div.views-element-container",
        "name": "USCIS News Releases",
        "category": "us_visa",
    },
    {
        "url": "https://www.gov.uk/guidance/visa-decision-waiting-times-applications-outside-the-uk",
        "selector": "div.govspeak",
        "name": "UK Visa Wait Times",
        "category": "uk_visa",
    },
    {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
        "selector": "main",
        "name": "Canada Processing Times",
        "category": "ca_visa",
    },
]

RAG_COLLECTION = "scraped_visa_updates"


async def scrape_target(target: dict) -> dict:
    """Scrape a single URL and extract text via CSS selector."""
    t0 = time.time()
    try:
        async with httpx.AsyncClient(
            timeout=SCRAPE_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            resp = await client.get(target["url"])
            resp.raise_for_status()
            if len(resp.content) > MAX_CONTENT_SIZE:
                return {
                    "content": "",
                    "status": "error",
                    "error": f"Response too large: {len(resp.content)} bytes",
                    "latency_ms": int((time.time() - t0) * 1000),
                    "scraped_at": datetime.utcnow().isoformat(),
                }
            soup = BeautifulSoup(resp.text, "html.parser")
            selector = target.get("selector", "body")
            el = soup.select_one(selector)
            content = el.get_text(separator="\n", strip=True) if el else soup.get_text(separator="\n", strip=True)
            return {
                "content": content,
                "status": "ok",
                "error": None,
                "latency_ms": int((time.time() - t0) * 1000),
                "scraped_at": datetime.utcnow().isoformat(),
            }
    except Exception as e:
        logger.warning("Scrape failed for %s: %s", target.get("url"), e)
        return {
            "content": "",
            "status": "error",
            "error": str(e),
            "latency_ms": int((time.time() - t0) * 1000),
            "scraped_at": datetime.utcnow().isoformat(),
        }


async def detect_diff(target_id: str, new_content: str) -> dict:
    """Compare new scrape with last stored version."""
    content_hash = hashlib.sha256(new_content.encode()).hexdigest()[:32]
    last_run = await db["scrape_runs"].find_one(
        {"target_id": target_id, "status": "ok"},
        sort=[("scraped_at", -1)],
        projection={"content_hash": 1, "content_preview": 1, "_id": 0},
    )
    if not last_run:
        return {
            "changed": True,
            "diff_summary": "First scrape — no previous version.",
            "added_lines": len(new_content.splitlines()),
            "removed_lines": 0,
            "content_hash": content_hash,
        }
    if last_run.get("content_hash") == content_hash:
        return {
            "changed": False,
            "diff_summary": "",
            "added_lines": 0,
            "removed_lines": 0,
            "content_hash": content_hash,
        }
    old_lines = (last_run.get("content_preview") or "").splitlines()
    new_lines = new_content[:5000].splitlines()
    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm=""))
    added = sum(1 for l in diff if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in diff if l.startswith("-") and not l.startswith("---"))
    summary = f"+{added} lines, -{removed} lines"
    if diff:
        summary += ": " + " ".join(diff[:5])
    return {
        "changed": True,
        "diff_summary": summary[:500],
        "added_lines": added,
        "removed_lines": removed,
        "content_hash": content_hash,
    }


async def ingest_into_rag(target_id: str, content: str, metadata: dict) -> dict:
    """Push scraped content into the RAG vector store."""
    from rag_ingest import ingest_text_documents

    items = [
        {
            "id": f"scrape_{target_id}",
            "text": content,
            "source": "scraping_agent",
            **metadata,
        }
    ]
    result = await ingest_text_documents(
        RAG_COLLECTION,
        items,
        text_field="text",
        extra_metadata={"source": "scraping_agent", "target_id": target_id},
    )
    return {"ingested": result.get("chunks", 0)}


async def run_scrape_cycle(trigger: str = "scheduler") -> dict:
    """Run all active scrape targets."""
    targets = []
    async for t in db["scrape_targets"].find({"active": True}, {"_id": 0}):
        targets.append(t)

    summary = {"total": len(targets), "scraped": 0, "changed": 0, "errors": 0, "trigger": trigger}

    for target in targets:
        tid = target["id"]
        result = await scrape_target(target)

        if result["status"] != "ok":
            summary["errors"] += 1
            await db["scrape_runs"].insert_one({
                "_id": uuid.uuid4().hex[:16],
                "target_id": tid,
                "status": "error",
                "error": result["error"],
                "latency_ms": result["latency_ms"],
                "scraped_at": result["scraped_at"],
                "changed": False,
                "content_hash": "",
                "content_preview": "",
                "diff_summary": "",
                "ingested": False,
                "dismissed": False,
            })
            await asyncio.sleep(1)
            continue

        summary["scraped"] += 1
        diff = await detect_diff(tid, result["content"])

        ingested = False
        if diff["changed"]:
            summary["changed"] += 1
            try:
                await ingest_into_rag(tid, result["content"], {
                    "name": target.get("name", ""),
                    "category": target.get("category", ""),
                    "url": target.get("url", ""),
                })
                ingested = True
            except Exception as e:
                logger.warning("RAG ingest failed for %s: %s", tid, e)

        await db["scrape_runs"].insert_one({
            "_id": uuid.uuid4().hex[:16],
            "target_id": tid,
            "status": "ok",
            "error": None,
            "latency_ms": result["latency_ms"],
            "scraped_at": result["scraped_at"],
            "changed": diff["changed"],
            "content_hash": diff["content_hash"],
            "content_preview": result["content"][:5000],
            "diff_summary": diff["diff_summary"],
            "ingested": ingested,
            "dismissed": False,
        })
        await asyncio.sleep(1)

    logger.info("Scrape cycle done: %s", summary)
    return summary


async def seed_default_targets() -> int:
    """Insert default targets if collection is empty."""
    count = await db["scrape_targets"].count_documents({})
    if count > 0:
        return 0
    docs = []
    for t in DEFAULT_TARGETS:
        docs.append({
            "id": uuid.uuid4().hex[:16],
            "url": t["url"],
            "selector": t["selector"],
            "name": t["name"],
            "category": t["category"],
            "active": True,
            "scrape_interval_hours": 24,
            "last_scraped_at": None,
            "created_at": datetime.utcnow().isoformat(),
        })
    if docs:
        await db["scrape_targets"].insert_many(docs)
    return len(docs)
