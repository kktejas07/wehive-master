from unittest.mock import patch, AsyncMock

import pytest

from event_aggregator_agent import fetch_events_from_url, scraping_enabled


def test_scraping_disabled_without_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    assert scraping_enabled() is not None


@pytest.mark.asyncio
@patch('event_aggregator_agent.SCRAPEGRAPH_AVAILABLE', False)
async def test_fetch_events_from_url_no_scraper_returns_nothing():
    assert await fetch_events_from_url("https://example.com", "united-kingdom") == []


@pytest.mark.asyncio
@patch('event_aggregator_agent.SCRAPEGRAPH_AVAILABLE', True)
@patch('event_aggregator_agent.SmartScraperGraph', create=True)
@patch('event_aggregator_agent.asyncio.to_thread', new_callable=AsyncMock)
async def test_fetch_events_from_url_with_scraper(mock_to_thread, _graph, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    mock_to_thread.return_value = {"events": [{"name": "Scraped Event", "date": "2026-10-15"}]}
    events = await fetch_events_from_url("https://example.com", "united-kingdom")
    assert events == [{"name": "Scraped Event", "date": "2026-10-15"}]
