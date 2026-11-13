"""Database-driven sitemap served at /api/sitemap.xml."""
import os
import sys
import xml.etree.ElementTree as ET
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import routes_sitemap as sm  # noqa: E402

NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}


def _locs(xml: str) -> list[str]:
    return [e.text for e in ET.fromstring(xml).findall('s:url/s:loc', NS)]


def _cursor(docs):
    async def gen():
        for d in docs:
            yield d
    cur = MagicMock()
    cur.limit = MagicMock(return_value=gen())
    return cur


def test_visa_free_countries_link_to_the_holiday_planner():
    assert sm.country_path({'id': 'fr'}) == '/visa/fr'
    assert sm.country_path({'id': 'th', 'no_visa': True}) == '/holiday/th'


def test_sitemap_is_valid_xml_and_escapes_urls():
    xml = sm.build_sitemap(['/visa/fr', '/university/a&b'], site_url='https://example.test')
    assert xml.startswith('<?xml version="1.0" encoding="UTF-8"?>')
    assert _locs(xml) == ['https://example.test/visa/fr', 'https://example.test/university/a&b']
    assert '/university/a&amp;b' in xml
    assert _locs(sm.build_sitemap([])) == []


@pytest.mark.asyncio
async def test_sitemap_lists_countries_and_universities_from_the_database(monkeypatch):
    monkeypatch.setattr(sm, '_all_countries', AsyncMock(return_value=[
        {'id': 'fr', 'name': 'France'}, {'id': 'th', 'no_visa': True}, {'name': 'no id — skipped'},
    ]))
    col = MagicMock()
    col.find = MagicMock(return_value=_cursor([{'id': 'tu-munich-de'}, {}, {'id': 'mit-us'}]))
    monkeypatch.setattr(sm, 'universities_col', col)

    res = await sm.sitemap()

    assert res.media_type == 'application/xml'
    assert _locs(res.body.decode()) == [
        f'{sm.FRONTEND_URL}/visa/fr', f'{sm.FRONTEND_URL}/holiday/th',
        f'{sm.FRONTEND_URL}/university/tu-munich-de', f'{sm.FRONTEND_URL}/university/mit-us',
    ]
    col.find.assert_called_once_with({}, {'_id': 0, 'id': 1})
    col.find.return_value.limit.assert_called_once_with(sm.MAX_UNIVERSITIES)


@pytest.mark.asyncio
async def test_sitemap_still_lists_countries_when_universities_fail(monkeypatch):
    monkeypatch.setattr(sm, '_all_countries', AsyncMock(return_value=[{'id': 'de'}]))
    col = MagicMock()
    col.find = MagicMock(side_effect=RuntimeError('mongo down'))
    monkeypatch.setattr(sm, 'universities_col', col)

    res = await sm.sitemap()
    assert _locs(res.body.decode()) == [f'{sm.FRONTEND_URL}/visa/de']
