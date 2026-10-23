from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging

from data import COUNTRIES as STATIC_COUNTRIES, get_country as static_get, get_holiday_plan
from db import db
from fee_calculator import FLAT_APPLICATION_FEE_INR, USD_TO_INR

router = APIRouter(prefix='/countries', tags=['countries'])
logger = logging.getLogger('wehive')

countries_col = db['countries_v2']
MIN_COUNTRIES_THRESHOLD = 50


def _strip_mongo(d: dict) -> dict:
    d = dict(d)
    d.pop('_id', None)
    return d


async def _ensure_seeded():
    """Trigger seeding if the DB has fewer than MIN_COUNTRIES_THRESHOLD entries."""
    try:
        count = await countries_col.estimated_document_count()
    except Exception:
        count = 0
    if count < MIN_COUNTRIES_THRESHOLD:
        try:
            from seed_countries import seed
            logger.info('Country count (%d) below threshold (%d) — triggering auto-seed', count, MIN_COUNTRIES_THRESHOLD)
            res = await seed()
            logger.info('Auto-seed result: %s', res)
        except Exception as e:
            logger.warning('Auto-seed failed (non-fatal): %s', e)


async def _all_countries() -> List[dict]:
    """Return DB-backed list if seeded, else fall back to the static one."""
    await _ensure_seeded()
    cur = countries_col.find({}, {'_id': 0}).sort('name', 1)
    items = [doc async for doc in cur]
    if items:
        return items
    return [dict(c) for c in STATIC_COUNTRIES]


async def _get_one(country_id: str) -> Optional[dict]:
    await _ensure_seeded()
    country_id = (country_id or '').lower()
    doc = await countries_col.find_one(
        {'$or': [{'id': country_id}, {'iso2': country_id.upper()}]},
        {'_id': 0},
    )
    if doc:
        return doc
    return static_get(country_id)


async def _corrected(items: list[dict]) -> list[dict]:
    """Apply visa_rules (requirement for Indian passports, decision time and its
    basis) to stored country documents. Official figures exist for only a few
    destinations, so those are looked up once."""
    import visa_rules
    official = {}
    for iso2 in visa_rules.OFFICIAL_CORRIDOR:
        try:
            official[iso2] = await visa_rules.load_official(iso2)
        except Exception as e:
            logger.warning('Official visa time for %s unavailable: %s', iso2, e)
    out = []
    for c in items:
        iso2 = (c.get('iso2') or ('GB' if c.get('id') == 'uk' else c.get('id') or '')).upper()
        parent = visa_rules.TERRITORIES.get(iso2, (iso2, None))[0]
        out.append(visa_rules.apply({**c, 'iso2': iso2}, official.get(parent)))
    return out


@router.get('')
async def list_countries(
    q: Optional[str] = Query(None, description='Search by country name'),
    visa_type: Optional[str] = Query(None, description='Filter by visa type'),
    delivery: Optional[str] = Query(None, description='any | standard | rush | same_day'),
    documents: Optional[str] = Query(None, description='any | minimal | standard'),
    no_visa: Optional[bool] = Query(None, description='Show only no-visa-required countries'),
    limit: Optional[int] = Query(None, ge=1, le=500),
) -> List[dict]:
    items = await _corrected(await _all_countries())
    if q:
        ql = q.lower().strip()
        items = [c for c in items if ql in (c.get('name') or '').lower()]
    if visa_type and visa_type.lower() not in ('', 'all', 'all visa types'):
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
        def _doc_count(c: dict) -> int:
            cats = c.get('categories') or {}
            counts = []
            for cat in cats.values():
                docs = cat.get('documents') if isinstance(cat, dict) else None
                if isinstance(docs, list):
                    counts.append(len(docs))
            return min(counts) if counts else len(c.get('documents', []))

        if documents == 'minimal':
            items = [c for c in items if _doc_count(c) <= 3]
        elif documents == 'standard':
            items = [c for c in items if 4 <= _doc_count(c) <= 6]
    if no_visa is True:
        items = [c for c in items if c.get('no_visa')]
    if limit:
        items = items[:limit]
    for c in items:
        c['application_fee'] = FLAT_APPLICATION_FEE_INR
        c['embassy_fee'] = round((c.get('fees_usd') or 0) * USD_TO_INR)
        c['fee_disclaimer'] = 'Fees may vary based on government regulations and service charges. Please verify current rates at the time of application.'
    return items


@router.get('/{country_id}')
async def country_detail(country_id: str):
    c = await _get_one(country_id)
    if not c:
        raise HTTPException(404, 'Country not found')
    c = (await _corrected([c]))[0]
    c['application_fee'] = FLAT_APPLICATION_FEE_INR
    c['embassy_fee'] = round((c.get('fees_usd') or 0) * USD_TO_INR)
    c['fee_disclaimer'] = 'Fees may vary based on government regulations and service charges. Please verify current rates at the time of application.'
    return _strip_mongo(c)


@router.get('/{country_id}/holiday-plan')
async def country_holiday_plan(country_id: str):
    c = await _get_one(country_id)
    if not c:
        raise HTTPException(404, 'Country not found')
    plan = get_holiday_plan(c.get('id') or country_id.lower(), country_meta=c)
    return {
        'country': _strip_mongo(c),
        'plan': plan,
    }
