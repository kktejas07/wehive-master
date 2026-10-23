"""Global news/events coverage and the public content API guards. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

import event_aggregator_agent as events  # noqa: E402
import news_aggregator_agent as news  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)

GOOGLE_NEWS_RSS = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
<item><title>Australia tightens student visa rules - The Guardian</title>
<link>https://news.google.com/rss/articles/abc</link>
<pubDate>Thu, 22 Oct 2026 08:00:00 GMT</pubDate>
<description>&lt;a href="x"&gt;Australia tightens student visa rules&lt;/a&gt;</description>
<source url="https://www.theguardian.com">The Guardian</source></item>
</channel></rss>"""


def test_news_feeds_cover_destinations_beyond_us_uk_canada():
    countries = {f["country_id"] for f in news.NEWS_FEEDS}
    assert {"australia", "new-zealand", "ireland", "germany", "europe", "uae", "global"} <= countries
    names = [f["name"] for f in news.NEWS_FEEDS]
    assert len(names) == len(set(names))  # per-feed run stats are keyed by name


def test_google_news_feed_url():
    url = news.google_news_feed("Schengen visa")
    assert url.startswith("https://news.google.com/rss/search?q=Schengen+visa+when%3A7d")


def test_google_news_item_uses_real_publisher_and_clean_title():
    (item,) = news.parse_feed(GOOGLE_NEWS_RSS)
    assert item["publisher"] == "The Guardian"
    doc = news._news_doc({"name": "Google News (australia)", "country_id": "australia"}, item)
    assert doc["title"] == "Australia tightens student visa rules"
    assert doc["source_name"] == "The Guardian"
    assert doc["date"] == "2026-10-22"


def test_event_sources_are_global_study_abroad_listings():
    assert {"global", "india", "australia", "germany"} <= set(events.SEED_URLS)
    for seeds in events.SEED_URLS.values():
        for seed in seeds:
            assert "study-abroad" in seed["url"]
            assert "all-events" not in seed["url"]


def _empty_cursor(col):
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=[])
    cursor.__aiter__.return_value = []
    col.find.return_value = cursor
    col.count_documents = AsyncMock(return_value=0)
    return cursor


@patch("routes_events.global_events_col")
def test_public_events_hide_pending_and_rejected(mock_col):
    _empty_cursor(mock_col)
    for status in ("pending", "rejected"):
        assert client.get(f"/api/events?status={status}").status_code in (401, 403)
    assert client.get("/api/events").status_code == 200


@patch("routes_events.global_events_col")
def test_public_events_default_soonest_first(mock_col):
    cursor = _empty_cursor(mock_col)
    client.get("/api/events")
    cursor.sort.assert_called_once_with("date", 1)


@patch("routes_news.global_news_col")
def test_news_sorted_by_published_date_then_ingest_time(mock_col):
    cursor = _empty_cursor(mock_col)
    assert client.get("/api/news").status_code == 200
    cursor.sort.assert_called_once_with([("published_at", -1), ("created_at", -1)])


@patch("routes_blogs.global_blogs_col")
@patch("routes_news.global_news_col")
def test_bad_input_is_400_or_422_not_500(news_col, blogs_col):
    _empty_cursor(news_col)
    _empty_cursor(blogs_col)
    for base in ("/api/news", "/api/blogs"):
        assert client.get(f"{base}?date_from=not-a-date").status_code == 400
        assert client.get(f"{base}?sort=password").status_code == 422
