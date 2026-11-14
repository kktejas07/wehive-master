"""Sitemap for pages whose URLs come from the database.

The frontend build writes /sitemap.xml for its fixed pages; it cannot know
which countries and universities exist. This endpoint lists those detail pages
and is served on the site's own host at /api/sitemap.xml (robots.txt points to
both sitemaps).
"""
import logging
from xml.sax.saxutils import escape

from fastapi import APIRouter
from fastapi.responses import Response

from config import FRONTEND_URL
from db import universities_col
from routes_countries import _all_countries

logger = logging.getLogger('wehive.sitemap')

router = APIRouter(tags=['seo'])

MAX_UNIVERSITIES = 5000  # a sitemap file may hold 50,000 URLs; stay far below


def build_sitemap(paths: list[str], site_url: str = FRONTEND_URL) -> str:
    urls = ''.join(f'  <url><loc>{escape(site_url + p)}</loc></url>\n' for p in paths)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{urls}</urlset>\n'
    )


def country_path(country: dict) -> str:
    """Visa-free destinations have a holiday planner page instead of a visa page."""
    return f"/{'holiday' if country.get('no_visa') else 'visa'}/{country['id']}"


@router.get('/sitemap.xml', include_in_schema=False)
async def sitemap():
    paths = [country_path(c) for c in await _all_countries() if c.get('id')]
    try:
        cursor = universities_col.find({}, {'_id': 0, 'id': 1}).limit(MAX_UNIVERSITIES)
        paths += [f"/university/{u['id']}" async for u in cursor if u.get('id')]
    except Exception as exc:  # countries alone are still a valid sitemap
        logger.warning('sitemap: universities unavailable: %s', exc)
    return Response(build_sitemap(paths), media_type='application/xml')
