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


def test_contacts_from_text_finds_emails_and_phones():
    text = 'Ravi ravi@x.com, 9000666149; Sita +91 90007 77149 / sita@y.in; US +1 (609) 555-0142; date 2026-11-02'
    out = ss.contacts_from_text(text)
    assert out['emails'] == ['ravi@x.com', 'sita@y.in']
    assert out['phones'] == ['+16095550142', '+919000666149', '+919000777149']


def test_office_files_are_read_as_zipped_xml():
    import io
    import zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr('xl/sharedStrings.xml', '<sst><si><t>lead@a.com</t></si></sst>')
        z.writestr('xl/worksheets/sheet1.xml', '<sheetData><c><v>9121495077</v></c></sheetData>')
    out = ss.contacts_from_text(ss._office_text(buf.getvalue()))
    assert out == {'emails': ['lead@a.com'], 'phones': ['+919121495077']}
