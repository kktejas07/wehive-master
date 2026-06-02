"""Public read-only endpoints — pricing config + published events.

These let the SPA reflect admin changes (base fees / surcharge / GST / event
banners) without requiring an admin login.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from db import db
from routes_admin import _load_pricing, _serialize_event

router = APIRouter(prefix='/public', tags=['public'])

events_col = db['events']


@router.get('/pricing')
async def public_pricing():
    cfg = await _load_pricing()
    return {
        'base_fees': cfg['base_fees'],
        'surcharge_inr': cfg['surcharge_inr'],
        'gst_rate': cfg['gst_rate'],
        'currency': cfg['currency'],
    }


@router.get('/events')
async def public_events(
    tag: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    now = datetime.utcnow()
    filt: dict = {'is_published': True}
    if tag and tag != 'all':
        filt['tag'] = tag
    # Optional time window
    filt['$and'] = [
        {'$or': [{'starts_at': None}, {'starts_at': {'$lte': now}}, {'starts_at': {'$exists': False}}]},
        {'$or': [{'ends_at': None}, {'ends_at': {'$gte': now}}, {'ends_at': {'$exists': False}}]},
    ]
    cur = events_col.find(filt).sort([('sort_order', 1), ('created_at', -1)]).limit(limit)
    items = [_serialize_event(e) async for e in cur]
    return {'items': items, 'total': len(items)}
