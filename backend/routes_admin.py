"""Super Admin dashboard routes.

All endpoints are gated by the `get_current_admin` dependency — a caller is
considered admin when either their email is listed in the `ADMIN_EMAILS`
environment variable OR when `users.is_admin == true` in the database.
"""
from __future__ import annotations

import csv
import io
import os
import uuid
import threading
from datetime import datetime, timedelta
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from config import ADMIN_EMAILS
from constants import AppStatus, BILLABLE_STATUSES, STATUS_LABELS
from audit import record as audit_record, recent as audit_recent
from db import db, users, applications, holiday_plans, leads, otps
from serializers import public_user, serialize_event
from pricing import load_pricing, invalidate_pricing_cache
from seed_universities import seed as seed_universities

router = APIRouter(prefix='/admin', tags=['admin'])

countries_col = db['countries_v2']
settings_col = db['settings']
events_col = db['events']


# ---------- auth ----------
async def get_current_admin(user=Depends(get_current_admin_flex)):
    """Admin gate — accepts admin JWT (role=admin) OR user OTP token with email in ADMIN_EMAILS.

    Delegates to admin_auth.get_current_admin_flex so the rules stay centralised.
    """
    return user


def _public_user(u: dict) -> dict:
    return public_user(u, include_admin_flag=True)


def _serialize_app(a: dict) -> dict:
    out = {}
    for k, v in a.items():
        if k == '_id':
            out['id'] = v
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif k == 'timeline' and isinstance(v, list):
            out[k] = [
                {**e, 'at': e['at'].isoformat() if isinstance(e.get('at'), datetime) else e.get('at')}
                for e in v
            ]
        elif k in ('documents', 'messages') and isinstance(v, list):
            out[k] = [
                {
                    **{kk: (vv.isoformat() if isinstance(vv, datetime) else vv) for kk, vv in it.items()}
                }
                for it in v
            ]
        else:
            out[k] = v
    return out


from fee_calculator import (
    DEFAULT_BASE_FEE_BY_TYPE, DEFAULT_SURCHARGE_INR, DEFAULT_GST_RATE,
    revenue_for as _revenue_for_shared,
)


async def _revenue_for(app: dict, country: Optional[dict]) -> int:
    """Return estimated revenue (INR) for a single application."""
    pricing = await load_pricing()
    return await _revenue_for_shared(app, country, pricing)


# ---------- me ----------
@router.get('/me')
async def admin_me(user=Depends(get_current_admin)):
    return _public_user(user)


# ---------- metrics ----------
@router.get('/metrics')
async def admin_metrics(_=Depends(get_current_admin)):
    now = datetime.utcnow()
    since_30 = now - timedelta(days=30)
    since_7 = now - timedelta(days=7)

    total_users = await users.count_documents({})
    premium_users = await users.count_documents({'is_premium': True})
    staff_users = await users.count_documents({'is_staff': True})
    new_users_30 = await users.count_documents({'created_at': {'$gte': since_30}})
    new_users_7 = await users.count_documents({'created_at': {'$gte': since_7}})

    total_apps = await applications.count_documents({})
    drafts = await applications.count_documents({'status': AppStatus.DRAFT.value})
    submitted = await applications.count_documents({'status': AppStatus.SUBMITTED.value})
    in_review = await applications.count_documents({'status': AppStatus.IN_REVIEW.value})
    approved = await applications.count_documents({'status': AppStatus.APPROVED.value})
    rejected = await applications.count_documents({'status': AppStatus.REJECTED.value})
    new_apps_30 = await applications.count_documents({'created_at': {'$gte': since_30}})

    total_countries = await countries_col.count_documents({})
    no_visa_countries = await countries_col.count_documents({'no_visa': True})
    total_leads = await leads.count_documents({})
    total_plans = await holiday_plans.count_documents({})

    # revenue: iterate billable apps and compute
    revenue_total = 0
    revenue_30 = 0
    # Build a lookup of countries we care about by id
    cache: dict = {}
    cur = applications.find({'status': {'$in': [s.value for s in BILLABLE_STATUSES]}})
    async for a in cur:
        cid = (a.get('country_id') or '').lower()
        country = cache.get(cid)
        if country is None:
            country = await countries_col.find_one({'id': cid}, {'_id': 0}) or {}
            cache[cid] = country
        amount = await _revenue_for(a, country)
        revenue_total += amount
        created = a.get('created_at')
        if isinstance(created, datetime) and created >= since_30:
            revenue_30 += amount

    # Trend: new apps/users per day for the last 14 days
    trend_days = 14
    days: List[dict] = []
    for i in range(trend_days - 1, -1, -1):
        day_start = datetime(now.year, now.month, now.day) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        u = await users.count_documents({'created_at': {'$gte': day_start, '$lt': day_end}})
        a_ = await applications.count_documents({'created_at': {'$gte': day_start, '$lt': day_end}})
        days.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'users': u,
            'applications': a_,
        })

    # Top-5 countries by application count
    pipeline = [
        {'$group': {'_id': '$country_id', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 5},
    ]
    top_countries = []
    async for row in applications.aggregate(pipeline):
        cid = (row.get('_id') or '').lower()
        country = await countries_col.find_one({'id': cid}, {'_id': 0, 'name': 1, 'flag': 1})
        top_countries.append({
            'id': cid,
            'name': (country or {}).get('name') or cid.upper(),
            'flag': (country or {}).get('flag') or '',
            'count': row['count'],
        })

    return {
        'users': {
            'total': total_users,
            'premium': premium_users,
            'staff': staff_users,
            'new_30d': new_users_30,
            'new_7d': new_users_7,
        },
        'applications': {
            'total': total_apps,
            'draft': drafts,
            'submitted': submitted,
            'in_review': in_review,
            'approved': approved,
            'rejected': rejected,
            'new_30d': new_apps_30,
        },
        'revenue': {
            'total_inr': revenue_total,
            'last_30d_inr': revenue_30,
            'currency': 'INR',
        },
        'countries': {
            'total': total_countries,
            'no_visa': no_visa_countries,
        },
        'leads': {'total': total_leads},
        'saved_plans': {'total': total_plans},
        'trend': days,
        'top_countries': top_countries,
        'recent_activity': await audit_recent(8),
        'generated_at': now.isoformat(),
    }


# ---------- users ----------
@router.get('/users')
async def admin_list_users(
    _=Depends(get_current_admin),
    q: Optional[str] = Query(None),
    role: Optional[Literal['all', 'premium', 'staff', 'admin']] = 'all',
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    filt: dict = {}
    if q:
        rx = {'$regex': q, '$options': 'i'}
        filt['$or'] = [{'email': rx}, {'phone': rx}, {'name': rx}]
    if role == 'premium':
        filt['is_premium'] = True
    elif role == 'staff':
        filt['is_staff'] = True
    elif role == 'admin':
        filt['$or'] = (filt.get('$or') or []) + [
            {'is_admin': True},
            {'email': {'$in': list(ADMIN_EMAILS)}},
        ]

    total = await users.count_documents(filt)
    cur = users.find(filt).sort('created_at', -1).skip(skip).limit(limit)
    items = [_public_user(u) async for u in cur]
    return {'total': total, 'items': items, 'limit': limit, 'skip': skip}


class UserPatch(BaseModel):
    name: Optional[str] = None
    is_premium: Optional[bool] = None
    is_staff: Optional[bool] = None
    is_admin: Optional[bool] = None
    staff_role: Optional[str] = None


@router.patch('/users/{user_id}')
async def admin_update_user(user_id: str, patch: UserPatch, admin=Depends(get_current_admin)):
    u = await users.find_one({'_id': user_id})
    if not u:
        raise HTTPException(404, 'User not found')
    update = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    now = datetime.utcnow()
    update['updated_at'] = now
    if update.get('is_premium') is True and not u.get('premium_since'):
        update['premium_since'] = now
    if update.get('is_premium') is False:
        await users.update_one({'_id': user_id}, {'$unset': {'premium_since': ''}})
    await users.update_one({'_id': user_id}, {'$set': update})
    fresh = await users.find_one({'_id': user_id})
    await audit_record(
        admin, 'update', 'user', user_id,
        before={k: u.get(k) for k in patch.model_dump(exclude_none=True).keys()},
        after={k: fresh.get(k) for k in patch.model_dump(exclude_none=True).keys()},
        extra={'email': u.get('email')},
    )
    return _public_user(fresh)


@router.delete('/users/{user_id}')
async def admin_delete_user(user_id: str, admin=Depends(get_current_admin)):
    if user_id == admin['_id']:
        raise HTTPException(400, 'You cannot delete your own admin account')
    u = await users.find_one({'_id': user_id})
    if not u:
        raise HTTPException(404, 'User not found')
    await users.delete_one({'_id': user_id})
    await applications.delete_many({'user_id': user_id})
    await holiday_plans.delete_many({'user_id': user_id})
    await audit_record(admin, 'delete', 'user', user_id, extra={'email': u.get('email'), 'name': u.get('name')})
    return {'ok': True}


# ---------- staff ----------
class StaffCreate(BaseModel):
    email: str
    name: str
    staff_role: str = Field(default='consultant')


@router.post('/staff')
async def admin_create_staff(payload: StaffCreate, _=Depends(get_current_admin)):
    email = payload.email.strip().lower()
    now = datetime.utcnow()
    existing = await users.find_one({'email': email})
    if existing:
        await users.update_one(
            {'_id': existing['_id']},
            {'$set': {'is_staff': True, 'staff_role': payload.staff_role,
                      'name': existing.get('name') or payload.name, 'updated_at': now}},
        )
        fresh = await users.find_one({'_id': existing['_id']})
        return _public_user(fresh)

    new_user = {
        '_id': str(uuid.uuid4()),
        'email': email,
        'name': payload.name,
        'is_staff': True,
        'staff_role': payload.staff_role,
        'email_verified': False,
        'phone_verified': False,
        'is_premium': False,
        'created_at': now,
        'updated_at': now,
    }
    await users.insert_one(new_user)
    return _public_user(new_user)


# ---------- applications ----------
@router.get('/applications')
async def admin_list_applications(
    _=Depends(get_current_admin),
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    filt: dict = {}
    if status and status != 'all':
        filt['status'] = status
    if q:
        rx = {'$regex': q, '$options': 'i'}
        filt['$or'] = [{'country_id': rx}, {'visa_type': rx}, {'_id': rx}]

    total = await applications.count_documents(filt)
    cur = applications.find(filt).sort('created_at', -1).skip(skip).limit(limit)
    out = []
    async for a in cur:
        user = await users.find_one({'_id': a.get('user_id')}, {'_id': 0, 'name': 1, 'email': 1, 'phone': 1})
        country = await countries_col.find_one(
            {'id': (a.get('country_id') or '').lower()},
            {'_id': 0, 'name': 1, 'flag': 1},
        )
        revenue = await _revenue_for(a, country)
        out.append({
            **_serialize_app(a),
            'user': user or {},
            'country': country or {'name': (a.get('country_id') or '').upper()},
            'revenue_inr': revenue,
        })
    return {'total': total, 'items': out, 'limit': limit, 'skip': skip}


class AppPatch(BaseModel):
    status: Optional[Literal['draft', 'submitted', 'in_review', 'approved', 'rejected']] = None
    note: Optional[str] = None


@router.patch('/applications/{application_id}')
async def admin_update_application(application_id: str, patch: AppPatch, admin=Depends(get_current_admin)):
    app = await applications.find_one({'_id': application_id})
    if not app:
        raise HTTPException(404, 'Application not found')
    now = datetime.utcnow()
    update: dict = {'updated_at': now}
    events = list(app.get('timeline') or [])
    if patch.status and patch.status != app.get('status'):
        update['status'] = patch.status
        label_map = STATUS_LABELS
        events.append({
            'id': str(uuid.uuid4()),
            'status': patch.status,
            'label': label_map.get(patch.status, patch.status.title()),
            'at': now,
            'note': patch.note or f"Status updated by admin {admin.get('email') or admin.get('phone') or ''}".strip(),
        })
        update['timeline'] = events
    elif patch.note:
        events.append({
            'id': str(uuid.uuid4()),
            'status': app.get('status') or AppStatus.DRAFT.value,
            'label': 'Admin note',
            'at': now,
            'note': patch.note,
        })
        update['timeline'] = events

    await applications.update_one({'_id': application_id}, {'$set': update})
    fresh = await applications.find_one({'_id': application_id})
    if 'status' in update or patch.note:
        await audit_record(
            admin, 'update', 'application', application_id,
            before={'status': app.get('status')},
            after={'status': fresh.get('status')},
            extra={'country_id': app.get('country_id'), 'visa_type': app.get('visa_type'), 'note': patch.note},
        )
    return _serialize_app(fresh)


# ---------- countries ----------
@router.get('/countries')
async def admin_list_countries(
    _=Depends(get_current_admin),
    q: Optional[str] = None,
    limit: int = Query(500, ge=1, le=1000),
):
    filt: dict = {}
    if q:
        rx = {'$regex': q, '$options': 'i'}
        filt['$or'] = [{'name': rx}, {'id': rx}, {'iso2': rx}]
    cur = countries_col.find(filt, {'_id': 0}).sort('name', 1).limit(limit)
    items = [doc async for doc in cur]
    return {'items': items, 'total': len(items)}


class CountryPatch(BaseModel):
    name: Optional[str] = None
    visa_required: Optional[bool] = None
    no_visa: Optional[bool] = None
    requires_appointment: Optional[bool] = None
    appointment_fee_inr: Optional[int] = None
    delivery: Optional[dict] = None
    categories: Optional[dict] = None
    holiday_default_days: Optional[int] = None
    highlights: Optional[list] = None


@router.patch('/countries/{country_id}')
async def admin_update_country(country_id: str, patch: CountryPatch, admin=Depends(get_current_admin)):
    cid = country_id.lower()
    existing = await countries_col.find_one({'id': cid})
    if not existing:
        raise HTTPException(404, 'Country not found')
    update = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    if 'no_visa' in update:
        update['visa_required'] = not update['no_visa']
    # Keep visa_types in sync with categories so the public /countries API
    # and filter dropdowns reflect admin changes immediately.
    if 'categories' in update and isinstance(update['categories'], dict):
        update['visa_types'] = list(update['categories'].keys())
    update['updated_at'] = datetime.utcnow()
    await countries_col.update_one({'id': cid}, {'$set': update})
    fresh = await countries_col.find_one({'id': cid}, {'_id': 0})
    await audit_record(
        admin, 'update', 'country', cid,
        before={k: existing.get(k) for k in patch.model_dump(exclude_none=True).keys()},
        after={k: fresh.get(k) for k in patch.model_dump(exclude_none=True).keys()},
        extra={'name': existing.get('name')},
    )
    return fresh


# ---------- pricing (admin-editable global pricing) ----------
class PricingPatch(BaseModel):
    base_fees: Optional[dict] = None    # {VisaType: int}
    surcharge_inr: Optional[int] = None
    gst_rate: Optional[float] = None
    currency: Optional[str] = None


@router.get('/pricing')
async def admin_get_pricing(_=Depends(get_current_admin)):
    cfg = await load_pricing()
    return {
        'base_fees': cfg['base_fees'],
        'surcharge_inr': cfg['surcharge_inr'],
        'gst_rate': cfg['gst_rate'],
        'currency': cfg['currency'],
        'updated_at': cfg['updated_at'].isoformat() if isinstance(cfg.get('updated_at'), datetime) else cfg.get('updated_at'),
        'defaults': {
            'base_fees': DEFAULT_BASE_FEE_BY_TYPE,
            'surcharge_inr': DEFAULT_SURCHARGE_INR,
            'gst_rate': DEFAULT_GST_RATE,
        },
    }


@router.patch('/pricing')
async def admin_update_pricing(patch: PricingPatch, admin=Depends(get_current_admin)):
    before = await load_pricing()
    update = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    if 'gst_rate' in update:
        if update['gst_rate'] < 0 or update['gst_rate'] > 1:
            raise HTTPException(400, 'gst_rate must be a decimal between 0 and 1 (e.g. 0.18 = 18%)')
    if 'base_fees' in update and isinstance(update['base_fees'], dict):
        clean = {}
        for k, v in update['base_fees'].items():
            try:
                clean[str(k)] = max(0, int(v))
            except (TypeError, ValueError):
                raise HTTPException(400, f'base_fees.{k} must be an integer')
        update['base_fees'] = clean
    update['updated_at'] = datetime.utcnow()
    await settings_col.update_one(
        {'_id': 'pricing'}, {'$set': update}, upsert=True,
    )
    invalidate_pricing_cache()
    after = await load_pricing()
    await audit_record(
        admin, 'update', 'pricing', 'global',
        before={k: before.get(k) for k in update.keys() if k != 'updated_at'},
        after={k: after.get(k) for k in update.keys() if k != 'updated_at'},
    )
    return await admin_get_pricing(_=None)


# ---------- events / promotions (admin-managed) ----------
class EventCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    country_id: Optional[str] = None
    visa_type: Optional[str] = None
    cta_label: Optional[str] = 'Explore'
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    accent_color: Optional[str] = '#e1212c'
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_published: bool = True
    sort_order: int = 0
    tag: Optional[str] = None              # e.g. 'tourist', 'student', 'work', 'holiday'


class EventPatch(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    country_id: Optional[str] = None
    visa_type: Optional[str] = None
    cta_label: Optional[str] = None
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    accent_color: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_published: Optional[bool] = None
    sort_order: Optional[int] = None
    tag: Optional[str] = None


@router.get('/events')
async def admin_list_events(
    _=Depends(get_current_admin),
    tag: Optional[str] = None,
    q: Optional[str] = None,
):
    filt: dict = {}
    if tag and tag != 'all':
        filt['tag'] = tag
    if q:
        rx = {'$regex': q, '$options': 'i'}
        filt['$or'] = [{'title': rx}, {'subtitle': rx}, {'description': rx}]
    cur = events_col.find(filt).sort([('sort_order', 1), ('created_at', -1)])
    items = [serialize_event(e) async for e in cur]
    return {'items': items, 'total': len(items)}


@router.post('/events')
async def admin_create_event(payload: EventCreate, admin=Depends(get_current_admin)):
    now = datetime.utcnow()
    doc = {
        '_id': str(uuid.uuid4()),
        **payload.model_dump(exclude_none=False),
        'created_at': now,
        'updated_at': now,
    }
    await events_col.insert_one(doc)
    await audit_record(admin, 'create', 'event', doc['_id'], after={'title': doc.get('title'), 'tag': doc.get('tag'), 'is_published': doc.get('is_published')})
    return serialize_event(doc)


@router.patch('/events/{event_id}')
async def admin_update_event(event_id: str, payload: EventPatch, admin=Depends(get_current_admin)):
    existing = await events_col.find_one({'_id': event_id})
    if not existing:
        raise HTTPException(404, 'Event not found')
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    update['updated_at'] = datetime.utcnow()
    await events_col.update_one({'_id': event_id}, {'$set': update})
    fresh = await events_col.find_one({'_id': event_id})
    await audit_record(
        admin, 'update', 'event', event_id,
        before={k: existing.get(k) for k in update.keys() if k != 'updated_at'},
        after={k: fresh.get(k) for k in update.keys() if k != 'updated_at'},
        extra={'title': existing.get('title')},
    )
    return serialize_event(fresh)


@router.delete('/events/{event_id}')
async def admin_delete_event(event_id: str, admin=Depends(get_current_admin)):
    existing = await events_col.find_one({'_id': event_id})
    if not existing:
        raise HTTPException(404, 'Event not found')
    await events_col.delete_one({'_id': event_id})
    await audit_record(admin, 'delete', 'event', event_id, extra={'title': existing.get('title')})
    return {'ok': True}


# ---------- audit log ----------
@router.get('/audit')
async def admin_audit_recent(
    _=Depends(get_current_admin),
    limit: int = Query(50, ge=1, le=200),
):
    items = await audit_recent(limit)
    return {'items': items, 'total': len(items)}


# ---------- integrations ----------
def _mask(value: str, keep: int = 4) -> str:
    if not value:
        return ''
    if len(value) <= keep:
        return '***'
    return value[:keep] + '•' * max(4, len(value) - keep - 2) + value[-2:]


@router.get('/integrations')
async def admin_integrations(_=Depends(get_current_admin)):
    overrides = await settings_col.find_one({'_id': 'integrations'}) or {}
    otp_channel = overrides.get('OTP_CHANNEL', os.environ.get('OTP_CHANNEL', 'mock'))

    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    twilio_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
    twilio_wa = os.environ.get('TWILIO_WHATSAPP_FROM', '')

    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pwd = os.environ.get('SMTP_PASSWORD', '')
    smtp_ok = bool(smtp_user) and smtp_pwd and 'REPLACE' not in smtp_pwd

    # AI Marketplace — counts any connected provider as 'configured'
    ai_doc = await db['ai_settings'].find_one({}) or {}
    ai_providers = ai_doc.get('providers', {})
    ai_active = ai_doc.get('active_provider', '')
    ai_configured = len(ai_providers) > 0

    return {
        'otp_channel': otp_channel,
        'services': [
            {
                'id': 'twilio',
                'name': 'Twilio (WhatsApp + SMS OTP)',
                'status': 'configured' if twilio_sid and twilio_token else 'mock',
                'details': {
                    'account_sid': _mask(twilio_sid, 6),
                    'whatsapp_from': twilio_wa or '—',
                },
                'action': 'Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env',
            },
            {
                'id': 'smtp',
                'name': 'SMTP (Email OTP)',
                'status': 'configured' if smtp_ok else 'mock',
                'details': {
                    'host': os.environ.get('SMTP_HOST', ''),
                    'user': smtp_user or '—',
                    'password': _mask(smtp_pwd, 0) if smtp_pwd and 'REPLACE' not in smtp_pwd else 'not set',
                },
                'action': 'Generate a Gmail App Password and update backend/.env::SMTP_PASSWORD',
            },
            {
                'id': 'ai_marketplace',
                'name': 'AI Marketplace',
                'status': 'configured' if ai_configured else 'missing',
                'details': {
                    'active_provider': ai_active,
                    'connected_count': len(ai_providers),
                    'providers': list(ai_providers.keys()),
                },
                'action': 'Connect an AI provider in Settings → AI Marketplace.',
            },
        ],
    }


class IntegrationSettings(BaseModel):
    OTP_CHANNEL: Optional[Literal['mock', 'twilio_sms', 'twilio_whatsapp', 'email', 'auto']] = None


@router.patch('/integrations')
async def admin_update_integrations(payload: IntegrationSettings, _=Depends(get_current_admin)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    await settings_col.update_one(
        {'_id': 'integrations'},
        {'$set': {**update, 'updated_at': datetime.utcnow()}},
        upsert=True,
    )
    # Apply to process env so new OTPs use the new channel without a restart
    for k, v in update.items():
        os.environ[k] = str(v)
    return {'ok': True, **update}


ALLOWED_NAMESPACES = {'firebase', 'razorpay', 'smtp', 'twilio', 'general', 'notifications'}


@router.get('/settings/{namespace}')
async def admin_get_settings(namespace: str, _=Depends(get_current_admin)):
    if namespace not in ALLOWED_NAMESPACES:
        raise HTTPException(400, f'Invalid namespace. Allowed: {", ".join(sorted(ALLOWED_NAMESPACES))}')
    from settings_service import get_all
    config = await get_all(namespace)
    return {'configured': bool(config), 'config': config}


class NamespaceSettings(BaseModel):
    config: dict


@router.put('/settings/{namespace}')
async def admin_update_settings(namespace: str, payload: NamespaceSettings, _=Depends(get_current_admin)):
    if namespace not in ALLOWED_NAMESPACES:
        raise HTTPException(400, f'Invalid namespace. Allowed: {", ".join(sorted(ALLOWED_NAMESPACES))}')
    from settings_service import set_all
    if not payload.config:
        raise HTTPException(400, 'Nothing to update')
    await set_all(namespace, payload.config)
    return {'ok': True}


# ---------- exports ----------
def _csv_response(rows: List[List[str]], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf)
    for r in rows:
        writer.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/export/users.csv')
async def export_users_csv(_=Depends(get_current_admin)):
    rows = [['id', 'name', 'email', 'phone', 'is_premium', 'is_staff', 'is_admin', 'staff_role', 'created_at']]
    async for u in users.find({}).sort('created_at', -1):
        email = (u.get('email') or '').lower()
        rows.append([
            u.get('_id', ''),
            u.get('name') or '',
            u.get('email') or '',
            u.get('phone') or '',
            'yes' if u.get('is_premium') else 'no',
            'yes' if u.get('is_staff') else 'no',
            'yes' if (u.get('is_admin') or email in ADMIN_EMAILS) else 'no',
            u.get('staff_role') or '',
            u.get('created_at').isoformat() if isinstance(u.get('created_at'), datetime) else str(u.get('created_at') or ''),
        ])
    return _csv_response(rows, 'wehive-users.csv')


@router.get('/export/applications.csv')
async def export_applications_csv(_=Depends(get_current_admin)):
    rows = [[
        'id', 'user_id', 'user_email', 'country', 'visa_type', 'status',
        'applicants', 'travel_date', 'revenue_inr', 'created_at',
    ]]
    cache: dict = {}
    async for a in applications.find({}).sort('created_at', -1):
        cid = (a.get('country_id') or '').lower()
        country = cache.get(cid)
        if country is None:
            country = await countries_col.find_one({'id': cid}, {'_id': 0}) or {}
            cache[cid] = country
        user = await users.find_one({'_id': a.get('user_id')}, {'_id': 0, 'email': 1}) or {}
        rows.append([
            a.get('_id') or '',
            a.get('user_id') or '',
            user.get('email') or '',
            country.get('name') or (a.get('country_id') or '').upper(),
            a.get('visa_type') or '',
            a.get('status') or '',
            str(a.get('applicants') or 1),
            a.get('travel_date') or '',
            str(await _revenue_for(a, country)),
            a.get('created_at').isoformat() if isinstance(a.get('created_at'), datetime) else str(a.get('created_at') or ''),
        ])
    return _csv_response(rows, 'wehive-applications.csv')


@router.get('/export/countries.csv')
async def export_countries_csv(_=Depends(get_current_admin)):
    rows = [[
        'id', 'iso2', 'name', 'region', 'visa_required', 'no_visa',
        'requires_appointment', 'appointment_fee_inr',
        'standard_days', 'rush_days', 'same_day', 'visa_types',
    ]]
    async for c in countries_col.find({}, {'_id': 0}).sort('name', 1):
        d = c.get('delivery') or {}
        rows.append([
            c.get('id') or '',
            c.get('iso2') or '',
            c.get('name') or '',
            c.get('region') or '',
            'yes' if c.get('visa_required') else 'no',
            'yes' if c.get('no_visa') else 'no',
            'yes' if c.get('requires_appointment') else 'no',
            str(c.get('appointment_fee_inr') or 0),
            str(d.get('standard_days') or 0),
            str(d.get('rush_days') or 0),
            'yes' if d.get('same_day') else 'no',
            '|'.join(c.get('visa_types') or []),
        ])
    return _csv_response(rows, 'wehive-countries.csv')


@router.get('/export/revenue.csv')
async def export_revenue_csv(_=Depends(get_current_admin)):
    rows = [['date', 'application_id', 'country', 'visa_type', 'applicants', 'status', 'revenue_inr']]
    billable = [s.value for s in BILLABLE_STATUSES]
    cache: dict = {}
    async for a in applications.find({'status': {'$in': billable}}).sort('created_at', -1):
        cid = (a.get('country_id') or '').lower()
        country = cache.get(cid)
        if country is None:
            country = await countries_col.find_one({'id': cid}, {'_id': 0}) or {}
            cache[cid] = country
        created = a.get('created_at')
        date_str = created.strftime('%Y-%m-%d') if isinstance(created, datetime) else str(created or '')
        rows.append([
            date_str,
            a.get('_id') or '',
            country.get('name') or (a.get('country_id') or '').upper(),
            a.get('visa_type') or '',
            str(a.get('applicants') or 1),
            a.get('status') or '',
            str(await _revenue_for(a, country)),
        ])
    return _csv_response(rows, 'wehive-revenue.csv')


@router.post('/re-seed-universities')
async def admin_re_seed_universities(admin=Depends(get_current_admin_flex)):
    try:
        result = await seed_universities()
        return {'ok': True, 'result': result}
    except Exception as e:
        raise HTTPException(500, f'Re-seed failed: {e}')
