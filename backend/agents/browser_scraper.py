"""Browser-based scraper for official government visa pages.

Uses playwright (already in requirements) to fetch JS-rendered pages that
httpx/BeautifulSoup cannot reach.  Falls back to plain httpx when playwright
is not available or the page loads fast enough without JS.

Primary targets:
  - USCIS processing times  (https://egov.uscis.gov/processing-times/)
  - UKVI processing times   (https://www.gov.uk/check-visa-processing-times-tool)
  - IRCC (Canada) times     (https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html)

All results are returned as plain text, never stored here — callers decide
what to do with the extracted text.

Usage:
    from agents.browser_scraper import scrape_page
    text = await scrape_page("https://egov.uscis.gov/processing-times/")
"""

import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger("wehive.agents.browser_scraper")

_TIMEOUT = 30  # seconds

# Targets that need JS rendering; others get plain httpx.
_JS_REQUIRED_HOSTS = {
    "egov.uscis.gov",
    "www.gov.uk",
}


def _needs_js(url: str) -> bool:
    from urllib.parse import urlparse
    return urlparse(url).netloc in _JS_REQUIRED_HOSTS


async def _fetch_plain(url: str) -> str:
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True,
                                  headers={"User-Agent": "WeHiveBot/1.0"}) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.text


async def _fetch_playwright(url: str) -> str:
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=_TIMEOUT * 1000)
        text = await page.inner_text("body")
        await browser.close()
        return text


async def scrape_page(url: str) -> Optional[str]:
    """Fetch page text. Returns None on failure (caller decides how to degrade)."""
    try:
        if _needs_js(url):
            try:
                return await _fetch_playwright(url)
            except ImportError:
                logger.debug("playwright not available, falling back to httpx for %s", url)
                return await _fetch_plain(url)
        return await _fetch_plain(url)
    except Exception as exc:
        logger.warning("browser_scraper failed for %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Convenience wrappers for the sources visa_rules_agent already knows about
# ---------------------------------------------------------------------------

USCIS_PROCESSING_URL = "https://egov.uscis.gov/processing-times/"
UKVI_PROCESSING_URL = "https://www.gov.uk/check-visa-processing-times-tool"
IRCC_PROCESSING_URL = (
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
    "application/check-processing-times.html"
)


async def fetch_uscis_times() -> Optional[str]:
    return await scrape_page(USCIS_PROCESSING_URL)


async def fetch_ukvi_times() -> Optional[str]:
    return await scrape_page(UKVI_PROCESSING_URL)


async def fetch_ircc_times() -> Optional[str]:
    return await scrape_page(IRCC_PROCESSING_URL)


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else USCIS_PROCESSING_URL
    text = asyncio.run(scrape_page(url))
    print(text[:2000] if text else "(no content)")
