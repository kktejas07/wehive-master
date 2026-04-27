from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from data import COUNTRIES as STATIC_COUNTRIES, get_country as static_get, get_holiday_plan
from db import db

router = APIRouter(prefix='/countries', tags=['countries'])

countries_col = db['countries_v2']


def _strip_mongo(d: dict) -> dict:
    d = dict(d)
    d.pop('_id', None)
    return d


async def _all_countries() -> List[dict]:
    """Return DB-backed list if seeded, else fall back to the static one."""
    cur = countries_col.find({}, {'_id': 0}).sort('name', 1)
    items = [doc async for doc in cur]
    if items:
        return items
    return [dict(c) for c in STATIC_COUNTRIES]


async def _get_one(country_id: str) -> Optional[dict]:
    country_id = (country_id or '').lower()
    # Try DB first
    doc = await countries_col.find_one(
        {'$or': [{'id': country_id}, {'iso2': country_id.upper()}]},
        {'_id': 0},
    )
    if doc:
        return doc
    return static_get(country_id)


@router.get('')
async def list_countries(
    q: Optional[str] = Query(None, description='Search by country name'),
    visa_type: Optional[str] = Query(None, description='Filter by visa type'),
    delivery: Optional[str] = Query(None, description='any | standard | rush | same_day'),
    documents: Optional[str] = Query(None, description='any | minimal | standard'),
    no_visa: Optional[bool] = Query(None, description='Show only no-visa-required countries'),
    limit: Optional[int] = Query(None, ge=1, le=500),
) -> List[dict]:
    items = await _all_countries()
    if q:
        ql = q.lower().strip()
        items = [c for c in items if ql in (c.get('name') or '').lower()]
    if visa_type and visa_type.lower() != 'all':
        items = [c for c in items if visa_type in c.get('visa_types', [])]
    if delivery and delivery.lower() not in ('', 'any'):
        if delivery == 'same_day':
            items = [c for c in items if (c.get('delivery') or {}).get('same_day')]
        elif delivery == 'rush':
            items = [c for c in items
                     if (c.get('delivery') or {}).get('rush_days') and c['delivery']['rush_days'] <= 5]
        elif delivery == 'standard':
            items = [c for c in items
                     if (c.get('delivery') or {}).get('standard_days') is not None
                     and c['delivery']['standard_days'] <= 15]
    if documents and documents.lower() not in ('', 'any'):
        if documents == 'minimal':
            items = [c for c in items if len(c.get('documents', [])) <= 2]
    if no_visa is True:
        items = [c for c in items if c.get('no_visa')]
    if limit:
        items = items[:limit]
    return items


@router.get('/{country_id}')
async def country_detail(country_id: str):
    c = await _get_one(country_id)
    if not c:
        raise HTTPException(404, 'Country not found')
    return _strip_mongo(c)


@router.get('/{country_id}/holiday-plan')
async def country_holiday_plan(country_id: str):
    c = await _get_one(country_id)
    if not c:
        raise HTTPException(404, 'Country not found')
    return {
        'country': _strip_mongo(c),
        'plan': get_holiday_plan(c.get('id') or country_id.lower()),
    }
