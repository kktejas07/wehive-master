"""Unit tests for the scheduled aggregators (news/blog RSS, events, intakes),
the admin aggregator endpoints, slot-monitor estimate marking and the
Telegram slot reader skip path. No network, no LLM, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import datetime  # noqa: E402
from types import SimpleNamespace  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import blog_aggregator_agent  # noqa: E402
import event_aggregator_agent  # noqa: E402
import intake_aggregator_agent  # noqa: E402
import news_aggregator_agent as news  # noqa: E402
import routes_agents_ai  # noqa: E402
import telegram_slot_reader  # noqa: E402
from admin_auth import get_current_admin_flex  # noqa: E402
from server import app  # noqa: E402

RSS = b"""<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
<item><title>H-1B cap &amp; registration update</title><link>https://example.gov/a</link>
<description>&lt;p&gt;New <b>rules</b>&lt;/p&gt;</description><pubDate>Fri, 09 Oct 26 14:52:46 -0400</pubDate>
<dc:creator>USCIS</dc:creator></item>
<item><title>Yemen - Level 4: Do Not Travel</title><link>https://example.gov/b</link>
<pubDate>Sat, 10 Oct 2026</pubDate></item>
<item><title>No link item</title></item>
</channel></rss>"""

ATOM = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Student visa changes</title><link rel="alternate" href="https://example.uk/s"/>
<summary type="html">Universities face new rules</summary><updated>2026-08-14T09:51:00+01:00</updated>
<author><name>Home Office</name></author></entry></feed>"""


class FakeCol:
    """Minimal async stand-in for a Motor collection keyed by source_url."""

    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, q):
        return next((d for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)

    async def insert_one(self, doc):
        doc = {**doc, "_id": f"id{len(self.docs)}"}
        self.docs.append(doc)
        return SimpleNamespace(inserted_id=doc["_id"])

    async def update_one(self, q, upd):
        d = await self.find_one(q)
        if d:
            d.update(upd["$set"])
        return SimpleNamespace(matched_count=1 if d else 0, modified_count=1 if d else 0)


# ─── Feed parsing ────────────────────────────────────────────────────────────

def test_parse_rss_items_real_dates_and_clean_text():
    items = news.parse_feed(RSS)
    assert [i["url"] for i in items] == ["https://example.gov/b", "https://example.gov/a"]
    a = items[1]
    assert a["title"] == "H-1B cap & registration update"
    assert a["summary"] == "New rules"
    assert a["published"] == datetime(2026, 10, 9, 18, 52, 46)
    assert a["author"] == "USCIS"
    assert items[0]["published"] == datetime(2026, 10, 10)


def test_parse_atom_entry():
    (e,) = news.parse_feed(ATOM)
    assert e["url"] == "https://example.uk/s"
    assert e["published"] == datetime(2026, 8, 14, 8, 51)
    assert e["author"] == "Home Office"


def test_classify_category():
    assert news.classify_category("H-1B registration") == "H1B"
    assert news.classify_category("International student visa") == "F1"
    assert news.classify_category("Travel advisory for Peru") == "Travel"
    assert news.classify_category("Asylum office opens") == "Business"


# ─── Upsert / dedupe by URL ──────────────────────────────────────────────────

def _mock_transport(payloads):
    def handler(request):
        body = payloads.get(str(request.url))
        if body is None:
            return httpx.Response(503)
        return httpx.Response(200, content=body)
    return httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_news_run_inserts_dedupes_updates_and_records_errors():
    feeds = [
        {"name": "Feed A", "url": "https://feeds.test/a", "country_id": "usa"},
        {"name": "Feed B", "url": "https://feeds.test/down", "country_id": "canada"},
    ]
    col = FakeCol([{"_id": "old", "source_url": "https://example.gov/a", "title": "Old title",
                    "date": "2026-10-09", "status": "approved"}])
    client = httpx.AsyncClient(transport=_mock_transport({"https://feeds.test/a": RSS}))
    with patch.object(news, "NEWS_FEEDS", feeds), patch.object(news, "global_news_col", col), \
            patch.object(news, "feed_client", return_value=client), \
            patch.object(news, "ingest_vectors", new=AsyncMock()), \
            patch.object(news.asyncio, "sleep", new=AsyncMock()):
        stats = await news.run_aggregator()
    assert (stats["inserted"], stats["updated"], stats["skipped"]) == (1, 1, 0)
    assert len(stats["errors"]) == 1 and "Feed B" in stats["errors"][0]
    new = next(d for d in col.docs if d["source_url"] == "https://example.gov/b")
    assert new["status"] == "pending" and new["date"] == "2026-10-10" and new["source"] == "rss"
    old = next(d for d in col.docs if d["_id"] == "old")
    assert old["status"] == "approved" and old["title"].startswith("H-1B")  # refreshed, status kept
    # second pass: everything already stored → all skipped
    client2 = httpx.AsyncClient(transport=_mock_transport({"https://feeds.test/a": RSS}))
    with patch.object(news, "NEWS_FEEDS", feeds[:1]), patch.object(news, "global_news_col", col), \
            patch.object(news, "feed_client", return_value=client2), \
            patch.object(news, "ingest_vectors", new=AsyncMock()), \
            patch.object(news.asyncio, "sleep", new=AsyncMock()):
        stats = await news.run_aggregator()
    assert (stats["inserted"], stats["updated"], stats["skipped"]) == (0, 0, 2)


@pytest.mark.asyncio
async def test_blog_run_uses_real_author_never_fabricated():
    feeds = [{"name": "Edu Feed", "url": "https://feeds.test/blog", "country_id": "global"}]
    col = FakeCol()
    client = httpx.AsyncClient(transport=_mock_transport({"https://feeds.test/blog": RSS}))
    with patch.object(blog_aggregator_agent, "BLOG_FEEDS", feeds), \
            patch.object(blog_aggregator_agent, "global_blogs_col", col), \
            patch.object(news, "feed_client", return_value=client), \
            patch.object(news, "ingest_vectors", new=AsyncMock()), \
            patch.object(news.asyncio, "sleep", new=AsyncMock()):
        stats = await blog_aggregator_agent.run_aggregator()
    assert stats["inserted"] == 2
    authors = {d["author"]["name"] for d in col.docs}
    assert authors == {"USCIS", "Edu Feed"}  # feed author, else the publication name
    assert all(d["status"] == "pending" and d["source_url"] for d in col.docs)


# ─── Events / intakes skip cleanly ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_events_disabled_without_scraper_or_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    stats = await event_aggregator_agent.run_aggregator()
    assert stats["inserted"] == 0 and stats["disabled"]
    assert await event_aggregator_agent.fetch_events_from_url("https://x.test", "usa") == []


@pytest.mark.asyncio
async def test_intake_skips_without_llm():
    col = MagicMock()
    col.find_one = AsyncMock(return_value=None)
    with patch.object(intake_aggregator_agent, "global_intakes_col", col), \
            patch.object(intake_aggregator_agent.marketplace, "get_active_provider",
                         new=AsyncMock(return_value=(None, ""))):
        res = await intake_aggregator_agent.run_aggregator()
    assert res["status"] == "skipped"


@pytest.mark.asyncio
async def test_intake_uses_system_identity_not_user_quota():
    col = MagicMock()
    col.find_one = AsyncMock(return_value=None)
    col.delete_many = AsyncMock()
    col.insert_many = AsyncMock()
    provider = MagicMock()
    provider.chat = AsyncMock(return_value='[{"country": "Canada", "tracks": {}}]')
    mp = intake_aggregator_agent.marketplace
    with patch.object(intake_aggregator_agent, "global_intakes_col", col), \
            patch.object(mp, "get_active_provider", new=AsyncMock(return_value=(provider, "router"))) as gap, \
            patch.object(mp, "_check_quota", new=AsyncMock(return_value=False)), \
            patch.object(mp, "_estimate_and_track_usage", new=AsyncMock()):
        res = await intake_aggregator_agent.run_aggregator()
    assert res == {"status": "ok", "inserted": 1}
    gap.assert_awaited_with("system_aggregator")


@pytest.mark.asyncio
async def test_intake_skips_when_fresh():
    col = MagicMock()
    col.find_one = AsyncMock(return_value={"fetched_at": datetime.utcnow()})
    with patch.object(intake_aggregator_agent, "global_intakes_col", col):
        res = await intake_aggregator_agent.run_aggregator()
    assert res["status"] == "skipped"


# ─── Run status normalisation ────────────────────────────────────────────────

def test_source_result_statuses():
    sr = routes_agents_ai._source_result
    assert sr({"inserted": 2, "updated": 0, "skipped": 1, "errors": []})["status"] == "ok"
    assert sr({"inserted": 0, "updated": 0, "skipped": 0, "errors": []})["status"] == "empty"
    assert sr({"inserted": 3, "errors": ["feed down"]})["status"] == "error"
    assert sr(RuntimeError("boom"))["status"] == "error"
    assert sr({"status": "skipped", "reason": "no LLM"})["status"] == "skipped"
    assert sr({"inserted": 0, "errors": [], "disabled": "no scraper"})["status"] == "skipped"
    assert sr({"status": "error", "message": "bad json"})["errors"] == ["bad json"]


# ─── Routes ──────────────────────────────────────────────────────────────────

client = TestClient(app)


def test_public_aggregator_endpoints_removed():
    assert client.get("/api/public/aggregator-trigger").status_code == 404
    assert client.get("/api/public/aggregator-status").status_code == 404


def test_agent_and_aggregator_endpoints_require_admin():
    for method, path in (("post", "/api/agents/run"), ("post", "/api/agents/aggregators/run"),
                         ("get", "/api/agents/aggregators/status"), ("get", "/api/agents/aggregator-runs")):
        assert getattr(client, method)(path).status_code == 401


@pytest.fixture
def admin():
    app.dependency_overrides[get_current_admin_flex] = lambda: {"_id": "admin1", "is_admin": True}
    yield
    app.dependency_overrides.pop(get_current_admin_flex, None)


def test_admin_trigger_returns_run_id(admin):
    runs = MagicMock()
    runs.insert_one = AsyncMock()
    with patch.object(routes_agents_ai, "aggregator_runs_col", runs), \
            patch.object(routes_agents_ai, "run_aggregator_cycle", new=AsyncMock()) as cycle:
        r = client.post("/api/agents/aggregators/run")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "running" and len(body["run_id"]) == 36
    assert runs.insert_one.await_args.args[0]["run_id"] == body["run_id"]
    cycle.assert_called_once_with(trigger="admin", run_id=body["run_id"])


def test_admin_status_by_run_id(admin):
    runs = MagicMock()
    runs.find_one = AsyncMock(return_value={"run_id": "r1", "status": "error",
                                            "results": {"news": {"status": "error"}}})
    with patch.object(routes_agents_ai, "aggregator_runs_col", runs):
        r = client.get("/api/agents/aggregators/status?run_id=r1")
    assert r.status_code == 200 and r.json()["run"]["status"] == "error"


@pytest.mark.asyncio
async def test_cycle_records_per_source_results():
    runs = MagicMock()
    runs.update_one = AsyncMock()
    ok = AsyncMock(return_value={"inserted": 1, "updated": 0, "skipped": 0, "errors": []})
    with patch.object(routes_agents_ai, "aggregator_runs_col", runs), \
            patch("news_aggregator_agent.run_aggregator", new=ok), \
            patch("blog_aggregator_agent.run_aggregator", new=AsyncMock(side_effect=RuntimeError("down"))), \
            patch("event_aggregator_agent.run_aggregator", new=AsyncMock(return_value={"disabled": "x"})), \
            patch("intake_aggregator_agent.run_aggregator", new=AsyncMock(return_value={"status": "skipped",
                                                                                       "reason": "no LLM"})), \
            patch("db.global_events_col") as ev:
        ev.update_many = AsyncMock()
        out = await routes_agents_ai.run_aggregator_cycle(run_id="r9")
    assert out["status"] == "error"
    res = out["results"]
    assert res["news"]["status"] == "ok" and res["blogs"]["status"] == "error"
    assert res["events"]["status"] == "skipped" and res["intakes"]["status"] == "skipped"
    final = runs.update_one.await_args_list[-1].args[1]["$set"]
    assert final["status"] == "error" and final["results"]["news"]["inserted"] == 1


@pytest.mark.parametrize("kind", ["news", "blogs"])
def test_moderation_invalid_and_missing_ids_404(admin, kind):
    assert client.post(f"/api/{kind}/not-an-id/approve").status_code == 404
    col = MagicMock()
    col.update_one = AsyncMock(return_value=MagicMock(matched_count=0))
    with patch(f"routes_{kind}.global_{kind}_col", col):
        assert client.post(f"/api/{kind}/60f7b3b3b3b3b3b3b3b3b3b4/reject").status_code == 404
    col.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    with patch(f"routes_{kind}.global_{kind}_col", col):
        r = client.post(f"/api/{kind}/60f7b3b3b3b3b3b3b3b3b3b4/reject")
    assert r.status_code == 200 and r.json()["new_status"] == "rejected"


@pytest.mark.parametrize("kind", ["news", "blogs"])
def test_moderation_requires_admin(kind):
    assert client.get(f"/api/{kind}/pending").status_code == 401
    assert client.post(f"/api/{kind}/60f7b3b3b3b3b3b3b3b3b3b4/approve").status_code == 401


# ─── Slot monitor / Telegram ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_slot_wait_times_marked_estimate_without_visahq_key():
    import slot_monitor
    with patch("adapters.visahq_adapter.VISA_HQ_API_KEY", ""), \
            patch.object(slot_monitor, "load_official_wait_times", new=AsyncMock(return_value=None)):
        results, is_estimate, source = await slot_monitor._fetch_wait_times()
    assert is_estimate is True and source == "estimate" and results["mumbai"]["f1"]
    display = slot_monitor.get_wait_times_for_display("usa")
    assert all(c["is_estimate"] for c in display.values())


@pytest.mark.asyncio
async def test_telegram_reader_skips_when_not_configured():
    with patch.object(telegram_slot_reader, "TELEGRAM_BOT_TOKEN", "t"), \
            patch.object(telegram_slot_reader, "TELEGRAM_SLOT_CHANNELS", ""), \
            patch.object(telegram_slot_reader, "_telegram_get", new=AsyncMock()) as tg:
        assert await telegram_slot_reader.read_all_channels() == []
    tg.assert_not_called()
