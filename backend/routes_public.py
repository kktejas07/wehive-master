"""Public read-only endpoints — pricing config + published events + tracking.

These let the SPA reflect admin changes (base fees / surcharge / GST / event
banners) without requiring an admin login.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from db import db
from pricing import load_pricing
from serializers import serialize_event

router = APIRouter(prefix='/public', tags=['public'])

settings_col = db['settings']
events_col = db['events']
applications_col = db['applications']
countries_col = db['countries_v2']


@router.get('/pricing')
async def public_pricing():
    cfg = await load_pricing()
    return {
        'base_fees': cfg['base_fees'],
        'surcharge_inr': cfg['surcharge_inr'],
        'gst_rate': cfg['gst_rate'],
        'currency': cfg['currency'],
    }


@router.get('/track/{application_id}')
async def track_application(application_id: str):
    """Public endpoint to track an application's status — no auth required."""
    app = await applications_col.find_one({'_id': application_id})
    if not app:
        raise HTTPException(404, 'Application not found')

    country = None
    cid = app.get('country_id', '')
    if cid:
        country = await countries_col.find_one({'id': cid}, {'_id': 0, 'name': 1})

    timeline = app.get('timeline') or []
    return {
        'id': str(app.get('_id')),
        'country_id': cid,
        'country_name': country.get('name') if country else cid.upper(),
        'visa_type': app.get('visa_type', 'Tourist'),
        'status': app.get('status', 'draft'),
        'timeline': timeline,
        'estimated_date': app.get('estimated_date'),
        'submitted_at': app.get('submitted_at'),
        'updated_at': app.get('updated_at'),
    }


@router.get('/events')
async def public_events(
    tag: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=200),
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
    items = [serialize_event(e) async for e in cur]
    return {'items': items, 'total': len(items)}


@router.get('/auth-config')
async def public_auth_config():
    """Public auth methods config — which login methods are enabled."""
    doc = await settings_col.find_one({'_id': 'auth_methods'}) or {}
    cfg = doc.get('config', {})
    return {
        'google_enabled': cfg.get('google_enabled', True),
        'email_password_enabled': cfg.get('email_password_enabled', True),
        'otp_enabled': cfg.get('otp_enabled', True),
    }


@router.get('/firebase-config')
async def public_firebase_config():
    """Public Firebase web config for the frontend — stored in DB via admin settings."""
    doc = await settings_col.find_one({'_id': 'firebase'}) or {}
    config = doc.get('config', {})
    if not config:
        return {
            'configured': False,
            'config': {},
        }
    return {
        'configured': True,
        'config': {
            'apiKey': config.get('apiKey', ''),
            'authDomain': config.get('authDomain', ''),
            'projectId': config.get('projectId', ''),
            'storageBucket': config.get('storageBucket', ''),
            'messagingSenderId': config.get('messagingSenderId', ''),
            'appId': config.get('appId', ''),
            'measurementId': config.get('measurementId', ''),
        },
    }


@router.get('/aggregator-status')
async def public_aggregator_status():
    """Public diagnostic endpoint to verify server time, DB counts, LLM key availability, and run logs."""
    import os
    from datetime import datetime

    def _has_key(k: str) -> bool:
        v = os.environ.get(k, '').strip()
        return bool(v) and len(v) > 5 and not v.startswith('mock')

    db_info = {}
    for col_name in ['global_blogs', 'global_news', 'global_events']:
        col = db[col_name]
        count = await col.count_documents({})
        latest = await col.find().sort('created_at', -1).limit(1).to_list(1)
        latest_ts = latest[0].get('created_at') if latest else None
        if isinstance(latest_ts, datetime):
            latest_ts = latest_ts.isoformat()
        db_info[col_name] = {
            'count': count,
            'latest_created_at': str(latest_ts) if latest_ts else None
        }

    recent_runs = []
    try:
        cursor = db['aggregator_runs'].find({}, {'_id': 0}).sort('ts', -1).limit(5)
        recent_runs = [doc async for doc in cursor]
    except Exception:
        pass

    return {
        'server_utc_time': datetime.utcnow().isoformat(),
        'keys_configured': {
            'GROQ_API_KEY': _has_key('GROQ_API_KEY'),
            'NVIDIA_API_KEY': _has_key('NVIDIA_API_KEY'),
            'GEMINI_API_KEY': _has_key('GEMINI_API_KEY'),
            'GOOGLE_API_KEY': _has_key('GOOGLE_API_KEY'),
            'OPENAI_API_KEY': _has_key('OPENAI_API_KEY'),
            'ANTHROPIC_API_KEY': _has_key('ANTHROPIC_API_KEY'),
        },
        'db_status': db_info,
        'recent_runs': recent_runs
    }


