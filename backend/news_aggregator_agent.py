"""Global News Aggregator Agent.

Pulls immigration / visa news from official public RSS/Atom feeds, plus
Google News search feeds for destinations with no official feed, over plain
HTTP (no LLM, no API key) and stores each item as a *pending* news document
with its real source URL and published date. Items are deduplicated by URL.
Nothing is generated or invented: if a feed is unreachable the error is
recorded and the run moves on.
"""

import asyncio
import html
import logging
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import httpx

from db import global_news_col

logger = logging.getLogger("wehive.news_aggregator")

CATEGORIES = ["F1", "H1B", "O1", "EB1", "Business", "Travel"]

USER_AGENT = "WeHiveNewsBot/1.0 (+https://wehive.app; immigration news aggregator)"
FEED_TIMEOUT = httpx.Timeout(20.0, connect=10.0)
MAX_FEED_BYTES = 5 * 1024 * 1024
MAX_ITEMS_PER_FEED = int(os.environ.get("NEWS_MAX_ITEMS_PER_FEED", "20"))

# Official/public feeds, each verified to return RSS/Atom XML (Oct 2026).
NEWS_FEEDS: List[Dict[str, Any]] = [
    {
        "name": "USCIS",
        "trusted": True,  # official government feed: publish without review
        "url": "https://www.uscis.gov/news/rss-feed/59144",
        "country_id": "usa",
    },
    {
        "name": "UK Visas and Immigration (GOV.UK)",
        "trusted": True,  # official government feed: publish without review
        "url": "https://www.gov.uk/search/news-and-communications.atom"
               "?organisations%5B%5D=uk-visas-and-immigration",
        "country_id": "united-kingdom",
    },
    {
        "name": "Immigration, Refugees and Citizenship Canada",
        "trusted": True,  # official government feed: publish without review
        "url": "https://api.io.canada.ca/io-server/gc/news/en/v2"
               "?dept=departmentofcitizenshipandimmigration&type=newsreleases"
               "&sort=publishedDate&orderBy=desc&pick=50&format=atom&atomtitle=IRCC",
        "country_id": "canada",
    },
    {
        "name": "U.S. Department of State - Travel Advisories",
        "trusted": True,  # official government feed: publish without review
        "url": "https://travel.state.gov/_res/rss/TAsTWs.xml",
        "country_id": "usa",
        "category": "Travel",
    },
]


def google_news_feed(query: str) -> str:
    """Public Google News RSS search (no key): last-7-day headlines from many publishers."""
    return ("https://news.google.com/rss/search?q=" + quote_plus(f"{query} when:7d")
            + "&hl=en-IN&gl=IN&ceid=IN:en")


# Global coverage: one search per destination, so the newsroom isn't limited to
# the countries that publish an official feed. source_name is the real publisher.
GLOBAL_NEWS_QUERIES: Dict[str, str] = {
    "usa": "F-1 visa OR H-1B OR green card",
    "united-kingdom": "UK student visa OR UK skilled worker visa",
    "canada": "Canada study permit OR Express Entry",
    "australia": "Australia student visa OR Australia immigration",
    "new-zealand": "New Zealand visa OR New Zealand immigration",
    "ireland": "Ireland student visa OR Ireland immigration",
    "germany": "Germany student visa OR Opportunity Card OR EU Blue Card",
    "europe": "Schengen visa",
    "uae": "UAE visa OR UAE golden visa",
    "singapore": "Singapore student pass OR Singapore work pass",
    "japan": "Japan student visa OR Japan work visa",
    "global": "international students visa policy",
}
NEWS_FEEDS += [
    {"name": f"Google News ({country})", "url": google_news_feed(query), "country_id": country}
    for country, query in GLOBAL_NEWS_QUERIES.items()
]

_ATOM = "{http://www.w3.org/2005/Atom}"
_DC = "{http://purl.org/dc/elements/1.1/}"
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


# ---------------------------------------------------------------------------
# Feed fetching / parsing (also used by blog_aggregator_agent)
# ---------------------------------------------------------------------------

def _clean_text(value: Optional[str], limit: int = 1000) -> str:
    """Strip HTML tags/entities and collapse whitespace."""
    if not value:
        return ""
    text = html.unescape(_TAG_RE.sub(" ", value))
    return _WS_RE.sub(" ", text).strip()[:limit]


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    """Parse RFC-822 (RSS) or ISO-8601 (Atom) dates into naive UTC datetimes."""
    if not value:
        return None
    value = value.strip()
    dt: Optional[datetime] = None
    try:
        dt = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        dt = None
    if dt is None:
        for fmt in ("%a, %d %b %Y", "%d %b %Y"):
            try:
                dt = datetime.strptime(value, fmt)
                break
            except ValueError:
                continue
    if dt is None:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _text(el: Optional[ET.Element]) -> str:
    return "".join(el.itertext()).strip() if el is not None else ""


def parse_feed(xml_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse RSS 2.0 or Atom XML into a newest-first list of
    {title, url, summary, published (datetime|None), author, categories}."""
    root = ET.fromstring(xml_bytes)
    items: List[Dict[str, Any]] = []

    for it in root.iter("item"):  # RSS 2.0
        link = _text(it.find("link"))
        guid = it.find("guid")
        if not link and guid is not None and guid.get("isPermaLink", "true") != "false":
            link = _text(guid)
        items.append({
            "title": _clean_text(_text(it.find("title")), 300),
            "url": link,
            "summary": _clean_text(_text(it.find("description"))),
            "published": _parse_date(_text(it.find("pubDate")) or _text(it.find(f"{_DC}date"))),
            "author": _clean_text(_text(it.find(f"{_DC}creator")), 120),
            "publisher": _clean_text(_text(it.find("source")), 120),
            "categories": [_text(c) for c in it.findall("category") if _text(c)],
        })

    for entry in root.iter(f"{_ATOM}entry"):  # Atom
        link = next(
            (ln.get("href", "") for ln in entry.findall(f"{_ATOM}link")
             if ln.get("rel", "alternate") == "alternate" and ln.get("href")),
            "",
        )
        summary = _text(entry.find(f"{_ATOM}summary")) or _text(entry.find(f"{_ATOM}content"))
        published = _text(entry.find(f"{_ATOM}published")) or _text(entry.find(f"{_ATOM}updated"))
        items.append({
            "title": _clean_text(_text(entry.find(f"{_ATOM}title")), 300),
            "url": link,
            "summary": _clean_text(summary),
            "published": _parse_date(published),
            "author": _clean_text(_text(entry.find(f"{_ATOM}author/{_ATOM}name")), 120),
            "publisher": "",
            "categories": [c.get("term", "") for c in entry.findall(f"{_ATOM}category") if c.get("term")],
        })

    items = [i for i in items if i["title"] and i["url"].startswith(("http://", "https://"))]
    items.sort(key=lambda i: i["published"] or datetime.min, reverse=True)
    return items


def feed_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=FEED_TIMEOUT,
        follow_redirects=True,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
        },
    )


async def fetch_feed(client: httpx.AsyncClient, url: str) -> List[Dict[str, Any]]:
    """GET a feed and parse it. Raises on HTTP / size / parse errors."""
    resp = await client.get(url)
    resp.raise_for_status()
    if len(resp.content) > MAX_FEED_BYTES:
        raise ValueError(f"feed too large ({len(resp.content)} bytes)")
    return parse_feed(resp.content)


def classify_category(text: str, default: str = "Business") -> str:
    """Keyword-map a headline/summary onto one of CATEGORIES."""
    t = text.lower()
    if re.search(r"\bh-?1b\b", t):
        return "H1B"
    if re.search(r"\bo-?1\b", t):
        return "O1"
    if re.search(r"\beb-?1\b", t):
        return "EB1"
    if re.search(r"\bf-?1\b|\bstudent|\bstudy\b|\buniversit", t):
        return "F1"
    if re.search(r"\btravel|\bvisitor|\btourist|\badvisory", t):
        return "Travel"
    return default


async def ingest_vectors(kind: str, ids: List[str], docs: List[str], metas: List[dict]) -> None:
    """Best-effort RAG ingest of newly inserted items (local embeddings)."""
    if not ids:
        return
    try:
        from ollama_embeddings import embed_query
        from vector_store import upsert_documents
        embeddings = [await embed_query(text) for text in docs]
        upsert_documents("wehive_rag", ids, docs, embeddings, metas)
        logger.info("Ingested %d %s items into Vector DB.", len(ids), kind)
    except Exception as e:
        logger.warning("Vector DB ingest skipped for %s: %s", kind, e)


async def upsert_feed_items(col, feeds: List[Dict[str, Any]], kind: str, to_doc) -> Dict[str, Any]:
    """Fetch every feed and upsert its items into `col`, deduplicated by source_url.

    `to_doc(feed, item)` maps a parsed item to the stored fields. New items are
    inserted as 'approved' for trusted feeds, else 'pending'; an existing URL whose title/date changed is
    refreshed without touching its moderation status.
    Returns {"inserted", "updated", "skipped", "errors": [...], "feeds": {...}}.
    """
    stats: Dict[str, Any] = {"inserted": 0, "updated": 0, "skipped": 0, "errors": [], "feeds": {}}
    vector_ids: List[str] = []
    vector_docs: List[str] = []
    vector_metas: List[dict] = []

    async with feed_client() as client:
        for feed in feeds:
            fstats: Dict[str, Any] = {"inserted": 0, "updated": 0, "skipped": 0}
            stats["feeds"][feed["name"]] = fstats
            try:
                items = await fetch_feed(client, feed["url"])
            except Exception as e:
                msg = f"{feed['name']}: {type(e).__name__}: {e}"[:300]
                logger.warning("%s feed failed — %s", kind, msg)
                stats["errors"].append(msg)
                fstats["error"] = msg
                continue

            for item in items[:MAX_ITEMS_PER_FEED]:
                fields = to_doc(feed, item)
                existing = await col.find_one({"source_url": item["url"]})
                if existing:
                    if existing.get("title") == fields["title"] and existing.get("date") == fields["date"]:
                        fstats["skipped"] += 1
                    else:
                        await col.update_one(
                            {"_id": existing["_id"]},
                            {"$set": {**fields, "updated_at": datetime.utcnow()}},
                        )
                        fstats["updated"] += 1
                    continue
                # Official government feeds and named publishers go live straight away;
                # open search results (Google News) wait for an admin.
                status = "approved" if feed.get("trusted") or auto_approve_all() else "pending"
                res = await col.insert_one({**fields, "status": status, "created_at": datetime.utcnow()})
                fstats["inserted"] += 1
                vector_ids.append(str(res.inserted_id))
                vector_docs.append(f"{fields['title']} {item['summary']}")
                vector_metas.append({"type": kind, "country_id": fields["country_id"], "category": fields["category"]})

            for k in ("inserted", "updated", "skipped"):
                stats[k] += fstats[k]
            await asyncio.sleep(1)  # be polite between hosts

    await ingest_vectors(kind, vector_ids, vector_docs, vector_metas)
    logger.info(
        "%s aggregator finished: inserted=%d updated=%d skipped=%d errors=%d",
        kind, stats["inserted"], stats["updated"], stats["skipped"], len(stats["errors"]),
    )
    return stats


# ---------------------------------------------------------------------------
# Aggregator
# ---------------------------------------------------------------------------

def _news_doc(feed: Dict[str, Any], item: Dict[str, Any]) -> Dict[str, Any]:
    published = item["published"]
    publisher = item.get("publisher") or ""
    title = item["title"]
    if publisher and title.endswith(f" - {publisher}"):  # Google News appends the publisher
        title = title[: -len(publisher) - 3]
    return {
        "title": title,
        "country_id": feed["country_id"],
        "date": published.strftime("%Y-%m-%d") if published else None,
        "published_at": published,
        "category": feed.get("category") or classify_category(f"{item['title']} {item['summary']}"),
        "content": item["summary"],
        "source_url": item["url"],
        "source_name": publisher or feed["name"],
        "source": "rss",
    }


async def run_aggregator() -> Dict[str, Any]:
    """Fetch NEWS_FEEDS and upsert pending news. Returns per-run counts/errors."""
    logger.info("News aggregator: fetching %d RSS/Atom feeds...", len(NEWS_FEEDS))
    stats = await upsert_feed_items(global_news_col, NEWS_FEEDS, "news", _news_doc)
    await run_auto_approval()
    return stats


def auto_approve_all() -> bool:
    return os.environ.get("AGGREGATOR_AUTO_APPROVE", "").lower() in ("1", "true", "yes")


async def approve_trusted_backlog(col, feeds: List[Dict[str, Any]]) -> int:
    """Publish items already waiting from trusted feeds (e.g. the backlog from
    before trusted feeds were auto-published)."""
    trusted = [f["name"] for f in feeds if f.get("trusted")]
    if not trusted:
        return 0
    result = await col.update_many({"status": "pending", "source_name": {"$in": trusted}},
                                   {"$set": {"status": "approved"}})
    return result.modified_count


async def run_auto_approval():
    """Publish pending items from trusted feeds; everything else only when
    AGGREGATOR_AUTO_APPROVE is enabled."""
    n = await approve_trusted_backlog(global_news_col, NEWS_FEEDS)
    if n:
        logger.info("Published %d pending news items from trusted feeds.", n)
    if not auto_approve_all():
        logger.info("AGGREGATOR_AUTO_APPROVE disabled; other pending news stays for admin review.")
        return
    result = await global_news_col.update_many({"status": "pending"}, {"$set": {"status": "approved"}})
    logger.info("Auto-approved %d pending news items.", result.modified_count)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_aggregator())
