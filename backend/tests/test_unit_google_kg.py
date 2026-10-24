"""Google Knowledge Graph client and its integrations (search, travel planner, document scan, chat)."""
import logging
import os
import sys
from unittest.mock import AsyncMock

import httpx
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import google_kg  # noqa: E402

KEY = 'AIzaTEST-KEY-NEVER-LEAK'

KG_RESPONSE = {'itemListElement': [{
    'resultScore': 900,
    'result': {
        '@id': 'kg:/m/07tgn',
        'name': 'University of Toronto',
        '@type': ['CollegeOrUniversity', 'Thing'],
        'description': 'Public university in Toronto, Canada',
        'url': 'https://www.utoronto.ca/',
        'image': {'contentUrl': 'https://img.example/uoft.png'},
        'detailedDescription': {'articleBody': 'The University of Toronto is a public research university.',
                                'url': 'https://en.wikipedia.org/wiki/University_of_Toronto'},
    },
}]}


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    google_kg._cache.clear()
    monkeypatch.setenv('GOOGLE_API_KEY', KEY)


def _mock_http(monkeypatch, handler):
    real = httpx.AsyncClient
    calls = []

    def wrapped(request):
        calls.append(request)
        return handler(request)
    monkeypatch.setattr(google_kg.httpx, 'AsyncClient',
                        lambda **kw: real(transport=httpx.MockTransport(wrapped), **kw))
    return calls


# ── client ────────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_search_parses_and_caches(monkeypatch):
    calls = _mock_http(monkeypatch, lambda r: httpx.Response(200, json=KG_RESPONSE))
    first = await google_kg.search('University of Toronto', limit=1)
    second = await google_kg.search('University of Toronto', limit=1)
    assert first == second and len(calls) == 1
    e = first[0]
    assert e['name'] == 'University of Toronto'
    assert e['detail'].startswith('The University of Toronto')
    assert e['image'] == 'https://img.example/uoft.png'
    assert calls[0].url.params['key'] == KEY


@pytest.mark.asyncio
async def test_no_key_means_no_call(monkeypatch):
    monkeypatch.delenv('GOOGLE_API_KEY')
    calls = _mock_http(monkeypatch, lambda r: httpx.Response(200, json=KG_RESPONSE))
    assert await google_kg.search('x') == []
    assert await google_kg.context_for('Tell me about University of Toronto') == ''
    assert calls == []


@pytest.mark.asyncio
async def test_failures_return_empty_and_never_log_the_key(monkeypatch, caplog):
    def boom(request):
        raise httpx.ConnectError(f'failed for {request.url}', request=request)  # message contains the key
    _mock_http(monkeypatch, boom)
    with caplog.at_level(logging.DEBUG):
        assert await google_kg.search('Paris') == []
    assert KEY not in caplog.text

    _mock_http(monkeypatch, lambda r: httpx.Response(400, json={'error': {'message': 'API key not valid'}}))
    assert await google_kg.search('Paris') == []
    assert ('Paris|None|None|5') not in google_kg._cache  # failures are not cached


@pytest.mark.asyncio
async def test_lookup_rejects_unrelated_top_hit(monkeypatch):
    _mock_http(monkeypatch, lambda r: httpx.Response(200, json=KG_RESPONSE))
    assert (await google_kg.lookup('university of toronto'))['name'] == 'University of Toronto'
    google_kg._cache.clear()
    assert await google_kg.lookup('Acme Shell Bank Ltd') is None


def test_entity_candidates():
    assert google_kg.entity_candidates('What is the fee at University of Toronto for MBA?') == ['University of Toronto']
    assert google_kg.entity_candidates('Can I study in Germany or Canada next year') == ['Germany', 'Canada']
    assert google_kg.entity_candidates('how much is the visa fee') == []


@pytest.mark.asyncio
async def test_context_for_formats_facts(monkeypatch):
    _mock_http(monkeypatch, lambda r: httpx.Response(200, json=KG_RESPONSE))
    ctx = await google_kg.context_for('Is University of Toronto good for CS?')
    assert ctx.startswith('Facts from Google Knowledge Graph:')
    assert 'public research university' in ctx and 'wikipedia.org' in ctx


# ── integrations ──────────────────────────────────────────────────────────────
ENTITY = google_kg.parse(KG_RESPONSE)[0]


@pytest.mark.asyncio
async def test_public_lookup_endpoint(monkeypatch):
    import routes_google_knowledge as r
    monkeypatch.setattr(google_kg, 'lookup', AsyncMock(return_value=ENTITY))
    out = await r.public_lookup(q='University of Toronto')
    assert out['entity']['name'] == 'University of Toronto'
    assert out['entity']['url'].startswith('https://en.wikipedia.org')
    assert set(out['entity']) == {'name', 'description', 'detail', 'url', 'image', 'types'}


@pytest.mark.asyncio
async def test_scan_issuer_verification(monkeypatch):
    import routes_scan
    monkeypatch.setattr(google_kg, 'lookup', AsyncMock(return_value=ENTITY))
    v = await routes_scan._verify_issuer('University of Toronto')
    assert v['found'] is True and v['url'] == 'https://www.utoronto.ca/'

    monkeypatch.setattr(google_kg, 'lookup', AsyncMock(return_value=None))
    assert (await routes_scan._verify_issuer('Totally Real Bank'))['found'] is False
    assert await routes_scan._verify_issuer(None) is None


@pytest.mark.asyncio
async def test_travel_destination_uses_country_name(monkeypatch):
    import routes_travel
    monkeypatch.setattr(routes_travel, 'lookup_country', AsyncMock(return_value={'name': 'Barbados'}))
    lookup = AsyncMock(return_value={**ENTITY, 'name': 'Barbados', 'description': 'Island country'})
    monkeypatch.setattr(google_kg, 'lookup', lookup)
    name, card = await routes_travel._destination('bb')
    assert name == 'Barbados' and card['description'] == 'Island country'
    assert lookup.await_args.args[0] == 'Barbados'


@pytest.mark.asyncio
async def test_chat_context_includes_rag_and_kg(monkeypatch):
    import routes_chatbot
    for name in ('lookup_country', 'search_universities', 'get_application_fee'):  # no real DB
        monkeypatch.setattr(routes_chatbot, name, AsyncMock(return_value=None))
    monkeypatch.setattr(routes_chatbot, '_rag_context', AsyncMock(return_value='From our knowledge base:\n[x] chunk'))
    monkeypatch.setattr(google_kg, 'context_for', AsyncMock(return_value='Facts from Google Knowledge Graph:\n- U of T'))
    ctx = await routes_chatbot._gather_context('Tell me about University of Toronto')
    assert 'From our knowledge base' in ctx and 'Facts from Google Knowledge Graph' in ctx
