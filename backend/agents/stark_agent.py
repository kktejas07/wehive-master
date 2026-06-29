"""Stark Agent — External open-source data fetcher sub-agent.

Stark is a subordinate agent that fetches information from external open sources:
Wikipedia, Google Knowledge Graph, public APIs, arXiv, GitHub, PyPI, and duckduckgo.
It returns structured context for Hive (the orchestrator) to use in responses.

Design:
  - Pluggable data sources (each can be enabled/disabled via env)
  - Rate-limited with per-source caching (5-minute TTL)
  - Returns JSON context objects suitable for RAG injection
  - Zero hard dependencies — graceful degradation on import errors
"""

import hashlib
import logging
import os
import re
import time
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger("wehive.stark")

STARK_CACHE_TTL = int(os.environ.get("STARK_CACHE_TTL", "300"))
STARK_TIMEOUT = int(os.environ.get("STARK_TIMEOUT", "15"))
STARK_MAX_SOURCES = int(os.environ.get("STARK_MAX_SOURCES", "3"))

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GOOGLE_CX = os.environ.get("GOOGLE_CX", "")
WIKIPEDIA_ENABLED = os.environ.get("STARK_WIKIPEDIA", "1") == "1"
GOOGLE_KNOWLEDGE_ENABLED = os.environ.get("STARK_KNOWLEDGE", "1") == "1"
GITHUB_ENABLED = os.environ.get("STARK_GITHUB", "1") == "1"
ARXIV_ENABLED = os.environ.get("STARK_ARXIV", "1") == "1"
PYPI_ENABLED = os.environ.get("STARK_PYPI", "1") == "1"
DUCKDUCKGO_ENABLED = os.environ.get("STARK_DDG", "1") == "1"
BRAVE_SEARCH_ENABLED = os.environ.get("STARK_BRAVE", "1") == "1"
BRAVE_SEARCH_API_KEY = os.environ.get("BRAVE_SEARCH_API_KEY", "")
SEARXNG_ENABLED = os.environ.get("STARK_SEARXNG", "1") == "1"
SEARXNG_BASE_URL = os.environ.get("SEARXNG_BASE_URL", "https://searx.be")
SERPER_ENABLED = os.environ.get("STARK_SERPER", "0") == "1"
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
KAGI_ENABLED = os.environ.get("STARK_KAGI", "0") == "1"
KAGI_API_KEY = os.environ.get("KAGI_API_KEY", "")
GEMINI_RESEARCH_ENABLED = os.environ.get("STARK_GEMINI_RESEARCH", "0") == "1"
GOOGLE_AI_MODE_ENABLED = os.environ.get("STARK_GOOGLE_AI", "0") == "1"

_cache: dict[str, tuple[float, dict]] = {}


def _cache_get(key: str) -> Optional[dict]:
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < STARK_CACHE_TTL:
            return val
        del _cache[key]
    return None


def _cache_set(key: str, val: dict):
    _cache[key] = (time.time(), val)
    if len(_cache) > 500:
        oldest = min(_cache, key=lambda k: _cache[k][0])
        del _cache[oldest]


def _cache_key(prefix: str, query: str) -> str:
    return f"{prefix}:{hashlib.md5(query.encode()).hexdigest()[:12]}"


async def _http_get(url: str, params: dict = None, headers: dict = None) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=STARK_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.debug("HTTP GET failed %s: %s", url[:80], e)
        return None


async def fetch_wikipedia(query: str, lang: str = "en") -> Optional[dict]:
    if not WIKIPEDIA_ENABLED:
        return None
    ck = _cache_key("wiki", f"{lang}:{query}")
    cached = _cache_get(ck)
    if cached:
        return cached

    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
    data = await _http_get(url)
    if data and "extract" in data and "title" in data:
        result = {
            "source": "wikipedia",
            "title": data["title"],
            "extract": data["extract"][:800],
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "thumbnail": data.get("thumbnail", {}).get("source"),
        }
        _cache_set(ck, result)
        return result
    return None


async def fetch_wikipedia_search(query: str, limit: int = 5, lang: str = "en") -> Optional[dict]:
    if not WIKIPEDIA_ENABLED:
        return None
    ck = _cache_key("wiki_search", f"{lang}:{query}")
    cached = _cache_get(ck)
    if cached:
        return cached

    url = f"https://{lang}.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": limit,
        "format": "json",
    }
    data = await _http_get(url, params=params)
    if data and "query" in data:
        pages = data["query"].get("search", [])
        result = {
            "source": "wikipedia_search",
            "query": query,
            "results": [
                {
                    "title": p["title"],
                    "snippet": p.get("snippet", "").replace('<span class="searchmatch">', "").replace("</span>", ""),
                    "pageid": p.get("pageid"),
                }
                for p in pages[:limit]
            ],
        }
        _cache_set(ck, result)
        return result
    return None


async def fetch_google_knowledge(query: str) -> Optional[dict]:
    if not GOOGLE_KNOWLEDGE_ENABLED or not GOOGLE_API_KEY:
        return None
    ck = _cache_key("kg", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    url = "https://kgsearch.googleapis.com/v1/entities:search"
    params = {"query": query, "key": GOOGLE_API_KEY, "limit": 5, "languages": "en"}
    data = await _http_get(url, params=params)
    if data and "itemListElement" in data:
        entities = []
        for item in data["itemListElement"]:
            ent = item.get("result", {})
            entities.append({
                "name": ent.get("name", ""),
                "description": ent.get("description", ""),
                "detailed_description": (ent.get("detailedDescription", {}) or {}).get("articleBody", ""),
                "types": ent.get("@type", []),
                "url": ent.get("url", ent.get("detailedDescription", {}).get("url", "") if ent.get("detailedDescription") else ""),
            })
        result = {"source": "google_knowledge_graph", "query": query, "entities": entities}
        _cache_set(ck, result)
        return result
    return None


async def fetch_duckduckgo_instant(query: str) -> Optional[dict]:
    if not DUCKDUCKGO_ENABLED:
        return None
    ck = _cache_key("ddg", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    url = "https://api.duckduckgo.com/"
    params = {"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"}
    data = await _http_get(url, params=params)
    if data:
        result = {
            "source": "duckduckgo",
            "query": query,
            "abstract": data.get("AbstractText", ""),
            "abstract_url": data.get("AbstractURL", ""),
            "heading": data.get("Heading", ""),
            "answer": data.get("Answer", ""),
            "related_topics": [
                t.get("Text", "") for t in (data.get("RelatedTopics", []) or [])[:3]
                if isinstance(t, dict) and "Text" in t
            ],
        }
        _cache_set(ck, result)
        return result
    return None


async def fetch_github_repo(owner: str, repo: str) -> Optional[dict]:
    if not GITHUB_ENABLED:
        return None
    ck = _cache_key("github", f"{owner}/{repo}")
    cached = _cache_get(ck)
    if cached:
        return cached

    url = f"https://api.github.com/repos/{owner}/{repo}"
    data = await _http_get(url, headers={"Accept": "application/vnd.github.v3+json"})
    if data:
        result = {
            "source": "github",
            "full_name": data.get("full_name", ""),
            "description": data.get("description", ""),
            "stars": data.get("stargazers_count", 0),
            "language": data.get("language", ""),
            "topics": data.get("topics", []),
            "url": data.get("html_url", ""),
            "license": (data.get("license") or {}).get("spdx_id", ""),
            "updated_at": data.get("updated_at", ""),
        }
        _cache_set(ck, result)
        return result
    return None


async def fetch_brave_search(query: str, count: int = 5) -> Optional[dict]:
    """Search the web using Brave Search API — free tier (2K/mo), MIT license."""
    if not BRAVE_SEARCH_ENABLED or not BRAVE_SEARCH_API_KEY:
        return None
    ck = _cache_key("brave", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
    }
    params = {"q": query, "count": min(count, 20)}
    data = await _http_get(url, params=params, headers=headers)
    if data and "web" in data:
        results = []
        for r in data["web"].get("results", [])[:count]:
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", "")[:400],
            })
        result = {
            "source": "brave_search",
            "query": query,
            "results": results,
            "total_estimated": data["web"].get("total_results", len(results)),
        }
        _cache_set(ck, result)
        return result
    return None


async def fetch_brave_news(query: str, count: int = 5) -> Optional[dict]:
    """Search recent news using Brave News API."""
    if not BRAVE_SEARCH_ENABLED or not BRAVE_SEARCH_API_KEY:
        return None
    ck = _cache_key("brave_news", query)
    cached = _cache_get(ck)
    if cached:
        return cached
    url = "https://api.search.brave.com/res/v1/news/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
    }
    params = {"q": query, "count": min(count, 20), "freshness": "pm"}
    data = await _http_get(url, params=params, headers=headers)
    if data and "results" in data:
        results = []
        for r in data["results"][:count]:
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", "")[:400],
            })
        result = {"source": "brave_news", "query": query, "articles": results}
        _cache_set(ck, result)
        return result
    return None


async def fetch_searxng(query: str, count: int = 10) -> Optional[dict]:
    """Search via SearXNG — free, self-hosted, zero API keys. Web + news + images."""
    if not SEARXNG_ENABLED:
        return None
    ck = _cache_key("searxng", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    params = {"q": query, "format": "json", "categories": "general,news", "language": "en"}
    data = await _http_get(f"{SEARXNG_BASE_URL}/search", params=params)
    if data:
        results = []
        for r in data.get("results", [])[:count]:
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": (r.get("content", "") or "")[:400],
                "engine": ", ".join(r.get("engines", [])) if isinstance(r.get("engines"), list) else "",
            })
        result = {
            "source": "searxng",
            "query": query,
            "results": results,
            "total": len(results),
            "instance": SEARXNG_BASE_URL,
        }
        _cache_set(ck, result)
        return result
    return None


async def fetch_serper(query: str, count: int = 5) -> Optional[dict]:
    """Search via Serper.dev — Google Search results for LLMs ($0.30/1K)."""
    if not SERPER_ENABLED or not SERPER_API_KEY:
        return None
    ck = _cache_key("serper", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=STARK_TIMEOUT) as client:
            resp = await client.post(
                "https://google.serper.dev/search",
                json={"q": query, "num": min(count, 10)},
                headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for r in data.get("organic", [])[:count]:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("link", ""),
                        "description": r.get("snippet", "")[:400],
                        "position": r.get("position", 0),
                    })
                result = {
                    "source": "serper",
                    "query": query,
                    "results": results,
                    "total": data.get("searchInformation", {}).get("totalResults", "0"),
                }
                _cache_set(ck, result)
                return result
    except Exception as e:
        logger.debug("Serper error: %s", e)
    return None


async def fetch_kagi(query: str, count: int = 5) -> Optional[dict]:
    """Search via Kagi Search API — privacy-focused, free tier available."""
    if not KAGI_ENABLED or not KAGI_API_KEY:
        return None
    ck = _cache_key("kagi", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    url = "https://kagi.com/api/v0/search"
    headers = {"Authorization": f"Bot {KAGI_API_KEY}"}
    params = {"q": query, "limit": min(count, 10)}

    data = await _http_get(url, params=params, headers=headers)
    if data and "data" in data:
        results = []
        for r in data["data"][:count]:
            results.append({
                "title": r.get("t", ""),
                "url": r.get("url", ""),
                "description": (r.get("snippet", "") or "")[:400],
                "published": r.get("published", ""),
            })
        result = {"source": "kagi", "query": query, "results": results}
        _cache_set(ck, result)
        return result
    return None


async def fetch_gemini_research(query: str) -> Optional[dict]:
    """Search via Gemini 2.5 Flash with real-time web search — free."""
    if not GEMINI_RESEARCH_ENABLED or not GOOGLE_API_KEY:
        return None
    ck = _cache_key("gemini_research", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GOOGLE_API_KEY}"
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": (
                        f"Search the web for: {query}. "
                        "Return the top 5 results with title, URL, and a 2-sentence summary for each. "
                        "Format as a bulleted list with [title](url) - summary."
                    )}]}],
                    "tools": [{"googleSearch": {}}],
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                text = ""
                for candidate in data.get("candidates", []):
                    for part in candidate.get("content", {}).get("parts", []):
                        text += part.get("text", "")
                result = {
                    "source": "gemini_research",
                    "query": query,
                    "results": [{"title": query, "description": text[:800], "url": ""}],
                }
                _cache_set(ck, result)
                return result
    except Exception as e:
        logger.debug("Gemini research error: %s", e)
    return None


async def fetch_arxiv(query: str, max_results: int = 5) -> Optional[dict]:
    if not ARXIV_ENABLED:
        return None
    ck = _cache_key("arxiv", query)
    cached = _cache_get(ck)
    if cached:
        return cached

    url = "http://export.arxiv.org/api/query"
    params = {"search_query": f"all:{query}", "max_results": max_results}
    try:
        async with httpx.AsyncClient(timeout=STARK_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            text = resp.text

        papers = []
        for entry in text.split("<entry>")[1:]:
            title = _xml_extract(entry, "title")
            summary = _xml_extract(entry, "summary")
            link = _xml_extract(entry, "id")
            papers.append({"title": title, "summary": summary[:400] if summary else "", "link": link})

        result = {"source": "arxiv", "query": query, "papers": papers[:max_results]}
        _cache_set(ck, result)
        return result
    except Exception as e:
        logger.debug("ArXiv fetch failed: %s", e)
        return None


def _xml_extract(xml: str, tag: str) -> str:
    m = re.search(f"<{tag}[^>]*>(.*?)</{tag}>", xml, re.DOTALL)
    return m.group(1).strip() if m else ""


async def fetch_pypi(package: str) -> Optional[dict]:
    if not PYPI_ENABLED:
        return None
    ck = _cache_key("pypi", package)
    cached = _cache_get(ck)
    if cached:
        return cached

    url = f"https://pypi.org/pypi/{package}/json"
    data = await _http_get(url)
    if data and "info" in data:
        info = data["info"]
        result = {
            "source": "pypi",
            "name": info.get("name", ""),
            "summary": info.get("summary", ""),
            "version": info.get("version", ""),
            "license": info.get("license", ""),
            "url": info.get("package_url", ""),
            "requires_python": info.get("requires_python", ""),
            "keywords": info.get("keywords", ""),
        }
        _cache_set(ck, result)
        return result
    return None


async def stark_search(query: str) -> dict:
    """Run all enabled Stark data sources in parallel and aggregate results."""
    tasks = []

    if WIKIPEDIA_ENABLED:
        tasks.append(("wikipedia", fetch_wikipedia(query)))
        tasks.append(("wikipedia_search", fetch_wikipedia_search(query)))
    if GOOGLE_KNOWLEDGE_ENABLED and GOOGLE_API_KEY:
        tasks.append(("google_knowledge", fetch_google_knowledge(query)))
    if DUCKDUCKGO_ENABLED:
        tasks.append(("duckduckgo", fetch_duckduckgo_instant(query)))
    if BRAVE_SEARCH_ENABLED and BRAVE_SEARCH_API_KEY:
        tasks.append(("brave_search", fetch_brave_search(query)))
        tasks.append(("brave_news", fetch_brave_news(query)))
    if SEARXNG_ENABLED:
        tasks.append(("searxng", fetch_searxng(query)))
    if SERPER_ENABLED and SERPER_API_KEY:
        tasks.append(("serper", fetch_serper(query)))
    if KAGI_ENABLED and KAGI_API_KEY:
        tasks.append(("kagi", fetch_kagi(query)))
    if GEMINI_RESEARCH_ENABLED and GOOGLE_API_KEY:
        tasks.append(("gemini_research", fetch_gemini_research(query)))
    if ARXIV_ENABLED and len(query) > 3:
        tasks.append(("arxiv", fetch_arxiv(query, max_results=3)))
    if GITHUB_ENABLED:
        parts = query.strip().split("/")
        if len(parts) == 2:
            tasks.append(("github", fetch_github_repo(parts[0], parts[1])))

    results = []
    for name, coro in tasks:
        try:
            data = await coro
            if data:
                results.append(data)
        except Exception as e:
            logger.debug("Stark source %s failed: %s", name, e)

    return {
        "query": query,
        "sources_queried": len(tasks),
        "sources_returned": len(results),
        "results": results,
        "queried_at": datetime.utcnow().isoformat(),
    }


async def stark_research(topic: str) -> dict:
    """Deep research: search + fetch summaries from multiple sources."""
    search_result = await stark_search(topic)

    wiki_result = await fetch_wikipedia(topic)
    if wiki_result:
        search_result["results"].append(wiki_result)

    kg_result = await fetch_google_knowledge(topic)
    if kg_result:
        search_result["results"].append(kg_result)

    return search_result


def stark_context_for_rag(stark_result: dict) -> str:
    """Convert Stark results into a RAG-ready context string."""
    parts = []
    for r in stark_result.get("results", []):
        source = r.get("source", "unknown")
        if source in ("wikipedia",):
            parts.append(f"[Wikipedia] {r.get('title', '')}: {r.get('extract', '')}")
        elif source == "google_knowledge_graph":
            for ent in r.get("entities", []):
                parts.append(f"[Google KG] {ent.get('name', '')}: {ent.get('description', '')} {ent.get('detailed_description', '')}")
        elif source == "duckduckgo":
            parts.append(f"[DuckDuckGo] {r.get('heading', '')}: {r.get('abstract', '')}")
        elif source == "arxiv":
            for paper in r.get("papers", []):
                parts.append(f"[arXiv] {paper.get('title', '')}: {paper.get('summary', '')}")
        elif source == "github":
            parts.append(f"[GitHub] {r.get('full_name', '')}: {r.get('description', '')} (⭐{r.get('stars', 0)}, {r.get('language', '')})")
        elif source == "wikipedia_search":
            for s in r.get("results", []):
                parts.append(f"[WikiSearch] {s.get('title', '')}: {s.get('snippet', '')}")
        elif source == "brave_search":
            for s in r.get("results", []):
                parts.append(f"[Brave] {s.get('title', '')}: {s.get('description', '')}")
        elif source == "brave_news":
            for s in r.get("articles", []):
                parts.append(f"[BraveNews] {s.get('title', '')}: {s.get('description', '')}")
        elif source == "searxng":
            for s in r.get("results", []):
                parts.append(f"[SearXNG] {s.get('title', '')}: {s.get('description', '')}")
        elif source == "serper":
            for s in r.get("results", []):
                parts.append(f"[Serper] {s.get('title', '')}: {s.get('description', '')}")
        elif source == "kagi":
            for s in r.get("results", []):
                parts.append(f"[Kagi] {s.get('title', '')}: {s.get('description', '')}")
        elif source == "gemini_research":
            for s in r.get("results", []):
                parts.append(f"[GeminiResearch] {s.get('title', '')}: {s.get('description', '')}")
    return "\n\n".join(parts[:8])


def stark_sources_status() -> dict:
    return {
        "wikipedia": {"enabled": WIKIPEDIA_ENABLED, "free": True},
        "google_knowledge": {"enabled": GOOGLE_KNOWLEDGE_ENABLED, "free": False, "configured": bool(GOOGLE_API_KEY)},
        "duckduckgo": {"enabled": DUCKDUCKGO_ENABLED, "free": True},
        "github": {"enabled": GITHUB_ENABLED, "free": True},
        "arxiv": {"enabled": ARXIV_ENABLED, "free": True},
        "pypi": {"enabled": PYPI_ENABLED, "free": True},
        "brave_search": {"enabled": BRAVE_SEARCH_ENABLED, "free": True, "configured": bool(BRAVE_SEARCH_API_KEY), "tier": "2K queries/month free"},
        "brave_news": {"enabled": BRAVE_SEARCH_ENABLED, "free": True, "configured": bool(BRAVE_SEARCH_API_KEY)},
        "searxng": {"enabled": SEARXNG_ENABLED, "free": True, "configured": True, "tier": "Unlimited (self-hosted)", "instance": SEARXNG_BASE_URL},
        "serper": {"enabled": SERPER_ENABLED, "free": False, "configured": bool(SERPER_API_KEY), "tier": "$0.30/1K queries"},
        "kagi": {"enabled": KAGI_ENABLED, "free": True, "configured": bool(KAGI_API_KEY), "tier": "Free tier available"},
        "gemini_research": {"enabled": GEMINI_RESEARCH_ENABLED, "free": True, "configured": bool(GOOGLE_API_KEY), "tier": "Free via Google AI"},
        "cache_ttl": STARK_CACHE_TTL,
        "timeout": STARK_TIMEOUT,
    }
