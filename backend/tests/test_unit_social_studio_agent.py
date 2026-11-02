"""Social Studio agent: AI drafts keep the real source line and fall back to the news text."""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import routes_social_studio as ss

NEWS = {'_id': 'n1', 'title': 'UK announces 2027 visa changes', 'content': 'Skilled worker thresholds rise.',
        'source_name': 'Hindustan Times', 'date': '2026-11-01', 'source_url': 'https://example.com/a'}


def _news(monkeypatch, doc):
    monkeypatch.setattr(ss, 'global_news_col', MagicMock(find_one=AsyncMock(return_value=doc)))


@pytest.mark.asyncio
async def test_ai_draft_keeps_real_source(monkeypatch):
    _news(monkeypatch, NEWS)
    import ai_marketplace
    reply = '{"eyebrow":"Visa update","headline":"UK *2027* changes","body":"What changes.","items":"Source: made up","cta":"Ask us","tags":"#UKVisa"}'
    monkeypatch.setattr(ai_marketplace.marketplace, 'chat', AsyncMock(return_value=reply))
    out = await ss.draft_post(ss.DraftReq(news_id='n1'), _={})
    assert out['ai'] is True and out['fields']['headline'] == 'UK *2027* changes'
    assert out['fields']['items'] == 'Source: Hindustan Times, 2026-11-01'
    assert out['source_url'] == 'https://example.com/a'


@pytest.mark.asyncio
async def test_draft_falls_back_when_ai_fails(monkeypatch):
    _news(monkeypatch, NEWS)
    import ai_marketplace
    monkeypatch.setattr(ai_marketplace.marketplace, 'chat', AsyncMock(side_effect=RuntimeError('down')))
    out = await ss.draft_post(ss.DraftReq(news_id='n1'), _={})
    assert out['ai'] is False and out['fields']['headline'] == NEWS['title']


@pytest.mark.asyncio
async def test_draft_needs_news_or_topic(monkeypatch):
    _news(monkeypatch, None)
    with pytest.raises(HTTPException) as exc:
        await ss.draft_post(ss.DraftReq(), _={})
    assert exc.value.status_code == 400
