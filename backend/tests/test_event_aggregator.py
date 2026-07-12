import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from event_aggregator_agent import _route_social_media_url, fetch_events_from_url, fetch_events_for_country_fallback

def test_route_social_media_url():
    # Test Twitter routing
    assert _route_social_media_url("https://x.com/TechConnect") == "https://nitter.net/TechConnect"
    assert _route_social_media_url("https://twitter.com/LondonEvents") == "https://nitter.net/LondonEvents"
    # Test Instagram routing
    assert _route_social_media_url("https://instagram.com/timeoutlondon") == "https://www.picuki.com/profile/timeoutlondon"
    # Test explicit platform forcing
    assert _route_social_media_url("https://example.com/mytweets", platform="twitter") == "https://nitter.net/mytweets"
    # Test no change for standard URLs
    assert _route_social_media_url("https://www.eventbrite.com") == "https://www.eventbrite.com"

@pytest.mark.asyncio
@patch('event_aggregator_agent.SCRAPEGRAPH_AVAILABLE', False)
@patch('event_aggregator_agent.fetch_events_for_country_fallback', new_callable=AsyncMock)
async def test_fetch_events_from_url_no_scraper(mock_fallback):
    mock_fallback.return_value = [{"name": "Mock Event"}]
    events = await fetch_events_from_url("https://example.com", "united-kingdom")
    assert len(events) == 1
    assert events[0]["name"] == "Mock Event"
    mock_fallback.assert_called_once()

@pytest.mark.asyncio
@patch('event_aggregator_agent.SCRAPEGRAPH_AVAILABLE', True)
@patch('event_aggregator_agent.asyncio.to_thread', new_callable=AsyncMock)
async def test_fetch_events_from_url_with_scraper(mock_to_thread):
    # Mock ScrapeGraphAI returning valid list
    mock_to_thread.return_value = [{"name": "Scraped Event", "date": "2026-10-15"}]
    events = await fetch_events_from_url("https://example.com", "united-kingdom")
    assert len(events) == 1
    assert events[0]["name"] == "Scraped Event"

@pytest.mark.asyncio
@patch('event_aggregator_agent.AIMarketplace.chat', new_callable=AsyncMock)
async def test_fetch_events_for_country_fallback(mock_chat):
    mock_chat.return_value = '[{"name": "Hallucinated Event", "category": "Tech"}]'
    marketplace = MagicMock()
    marketplace.chat = mock_chat
    
    events = await fetch_events_for_country_fallback(marketplace, "Japan")
    assert len(events) == 1
    assert events[0]["name"] == "Hallucinated Event"
