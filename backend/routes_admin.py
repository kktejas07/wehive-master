"""Super Admin dashboard routes.

All endpoints are gated by the `get_current_admin` dependency — a caller is
considered admin when either their email is listed in the `ADMIN_EMAILS`
environment variable OR when `users.is_admin == true` in the database.
"""
from __future__ import annotations

import base64 as _b64
import csv
import io
import os
import uuid
import threading
from datetime import datetime, timedelta
from typing import Optional, List, Literal

import json as _json

import httpx as _httpx

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
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
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    filt: dict = {}
    if q:
        rx = {'$regex': q, '$options': 'i'}
        filt['$or'] = [{'name': rx}, {'id': rx}, {'iso2': rx}]
    total = await countries_col.count_documents(filt)
    cur = countries_col.find(filt, {'_id': 0}).sort('name', 1).skip(skip).limit(limit)
    items = [doc async for doc in cur]
    return {'items': items, 'total': total, 'limit': limit, 'skip': skip}


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
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    filt: dict = {}
    if tag and tag != 'all':
        filt['tag'] = tag
    if q:
        rx = {'$regex': q, '$options': 'i'}
        filt['$or'] = [{'title': rx}, {'subtitle': rx}, {'description': rx}]
    total = await events_col.count_documents(filt)
    cur = events_col.find(filt).sort([('sort_order', 1), ('created_at', -1)]).skip(skip).limit(limit)
    items = [serialize_event(e) async for e in cur]
    return {'items': items, 'total': total, 'limit': limit, 'skip': skip}


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
    from settings_service import get_all as _get_settings
    overrides = await settings_col.find_one({'_id': 'integrations'}) or {}
    otp_channel = overrides.get('OTP_CHANNEL', os.environ.get('OTP_CHANNEL', 'mock'))

    # Check both DB settings and env vars for SMTP/Twilio config
    twilio_cfg = await _get_settings('twilio')
    smtp_cfg = await _get_settings('smtp')

    twilio_sid = twilio_cfg.get('account_sid') or os.environ.get('TWILIO_ACCOUNT_SID', '')
    twilio_token = twilio_cfg.get('auth_token') or os.environ.get('TWILIO_AUTH_TOKEN', '')
    twilio_wa = twilio_cfg.get('whatsapp_from') or os.environ.get('TWILIO_WHATSAPP_FROM', '')
    twilio_sms = twilio_cfg.get('sms_from') or os.environ.get('TWILIO_SMS_FROM', '')

    smtp_user = smtp_cfg.get('user') or os.environ.get('SMTP_USER', '')
    smtp_pwd = smtp_cfg.get('password') or os.environ.get('SMTP_PASSWORD', '')
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


ALLOWED_NAMESPACES = {'firebase', 'razorpay', 'smtp', 'twilio', 'general', 'notifications', 'r2', 'branding'}


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


# ---------- branding assets ----------

from fastapi import UploadFile, File
from settings_service import get_r2_config

BRANDING_BUCKET_KEY = 'branding'


def _r2_client_from_settings(r2_cfg: dict):
    """Build a boto3 S3 client for R2 from the stored settings."""
    import boto3
    from botocore.config import Config as BotoConfig
    endpoint = r2_cfg.get('endpoint') or f"https://{r2_cfg.get('account_id', '')}.r2.cloudflarestorage.com"
    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=r2_cfg.get('access_key_id', ''),
        aws_secret_access_key=r2_cfg.get('secret_access_key', ''),
        region_name='auto',
        config=BotoConfig(signature_version='s3v4'),
    )


@router.post('/branding/upload')
async def admin_upload_branding(
    file: UploadFile = File(...),
    key: str = 'logo',
    _=Depends(get_current_admin),
):
    """Upload a branding asset (logo, favicon, etc.) to R2 with SSE-S3 encryption."""
    allowed_keys = {'logo', 'favicon', 'og-image'}
    if key not in allowed_keys:
        raise HTTPException(400, f'Invalid key. Allowed: {", ".join(sorted(allowed_keys))}')
    r2_cfg = await get_r2_config()
    if not r2_cfg.get('access_key_id'):
        raise HTTPException(400, 'R2 is not configured')
    s3 = _r2_client_from_settings(r2_cfg)
    bucket = r2_cfg.get('bucket', '')
    ext = file.filename.rsplit('.', 1)[-1] if '.' in (file.filename or '') else 'png'
    obj_key = f'{BRANDING_BUCKET_KEY}/{key}.{ext}'
    content = await file.read()
    s3.put_object(
        Bucket=bucket,
        Key=obj_key,
        Body=content,
        ContentType=file.content_type or 'application/octet-stream',
        ServerSideEncryption='AES256',
    )
    public_url = (r2_cfg.get('public_url') or '').rstrip('/')
    return {
        'ok': True,
        'key': obj_key,
        'url': f'{public_url}/{obj_key}' if public_url else None,
    }


@router.get('/branding/asset/{key}')
async def admin_get_branding_asset(key: str, _=Depends(get_current_admin)):
    """Return a signed URL for a branding asset stored on R2."""
    r2_cfg = await get_r2_config()
    if not r2_cfg.get('access_key_id'):
        raise HTTPException(400, 'R2 is not configured')
    s3 = _r2_client_from_settings(r2_cfg)
    bucket = r2_cfg.get('bucket', '')
    try:
        resp = s3.head_object(Bucket=bucket, Key=f'{BRANDING_BUCKET_KEY}/{key}')
        ext = key.rsplit('.', 1)[-1] if '.' in key else 'png'
        content_type = resp.get('ContentType', f'image/{ext}')
    except Exception:
        # Try to find the file by listing matching keys
        try:
            objs = s3.list_objects_v2(Bucket=bucket, Prefix=f'{BRANDING_BUCKET_KEY}/{key}')
            if not objs.get('Contents'):
                raise HTTPException(404, f'No branding asset found for key: {key}')
            obj_key = objs['Contents'][0]['Key']
            ext = obj_key.rsplit('.', 1)[-1] if '.' in obj_key else 'png'
        except Exception:
            raise HTTPException(404, f'Branding asset not found: {key}')
    obj_key = f'{BRANDING_BUCKET_KEY}/{key}'
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': obj_key},
        ExpiresIn=86400,
    )
    return {'url': url}


@router.get('/branding')
async def admin_get_branding(_=Depends(get_current_admin)):
    """Return all branding asset URLs with signed links."""
    r2_cfg = await get_r2_config()
    if not r2_cfg.get('access_key_id'):
        return {'configured': False, 'assets': {}}
    s3 = _r2_client_from_settings(r2_cfg)
    bucket = r2_cfg.get('bucket', '')
    assets = {}
    try:
        objs = s3.list_objects_v2(Bucket=bucket, Prefix=f'{BRANDING_BUCKET_KEY}/')
        for obj in objs.get('Contents', []):
            name = obj['Key'].split('/')[-1]
            base = name.rsplit('.', 1)[0] if '.' in name else name
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': obj['Key']},
                ExpiresIn=86400,
            )
            assets[base] = {'key': obj['Key'], 'url': url, 'size': obj['Size']}
    except Exception:
        pass
    return {'configured': True, 'assets': assets}


MANIFEST_COLLECTION_ID = 'destinations_manifest'
R2_STATUS_CACHE_ID = 'destinations_r2_status'


async def _clear_r2_cache():
    """Clear the cached R2 status after mutations."""
    await settings_col.delete_one({'_id': R2_STATUS_CACHE_ID})


# ---------- destinations (destination images) ----------


def _find_manifest_file():
    base = os.path.dirname(os.path.abspath(__file__))
    for candidate in [
        os.path.join(base, '..', 'destination-illustrations', 'manifest.json'),
        os.path.join(base, '..', '..', 'destination-illustrations', 'manifest.json'),
        os.path.join(base, 'manifest.json'),
        '/app/destination-illustrations/manifest.json',
    ]:
        if os.path.exists(candidate):
            return candidate
    return None


async def _load_manifest():
    path = _find_manifest_file()
    if path:
        with open(path) as f:
            return _json.load(f)
    doc = await settings_col.find_one({'_id': MANIFEST_COLLECTION_ID})
    return (doc or {}).get('items', [])


@router.get('/destinations')
async def admin_list_destinations(_=Depends(get_current_admin)):
    """Return all destination images from the manifest."""
    items = await _load_manifest()
    return {'items': items, 'total': len(items)}


@router.post('/destinations/seed-manifest')
async def admin_seed_manifest(_=Depends(get_current_admin)):
    """Seed manifest into DB from local file for production environments where the file may not exist."""
    path = _find_manifest_file()
    if not path:
        raise HTTPException(404, 'manifest.json not found on server — upload it manually via the Destinations tab')
    with open(path) as f:
        items = _json.load(f)
    await settings_col.replace_one(
        {'_id': MANIFEST_COLLECTION_ID},
        {'_id': MANIFEST_COLLECTION_ID, 'items': items},
        upsert=True,
    )
    return {'seeded': len(items), 'source': path}


@router.post('/destinations/sync-to-r2-stream')
async def admin_sync_destinations_to_r2_stream(_=Depends(get_current_admin)):
    """Upload all destination images to R2 with real-time progress via SSE stream."""
    from settings_service import get_all as _get_settings
    from fastapi.responses import StreamingResponse

    cfg = await _get_settings('r2')
    if not cfg:
        raise HTTPException(400, 'R2 not configured — fill in R2 Storage settings first')

    account_id = cfg.get('account_id', '')
    access_key = cfg.get('access_key_id', '')
    secret_key = cfg.get('secret_access_key', '')
    bucket = cfg.get('bucket', '')
    public_url = (cfg.get('public_url') or '').rstrip('/')
    endpoint = cfg.get('endpoint') or f'https://{account_id}.r2.cloudflarestorage.com'

    if not all([account_id, access_key, secret_key, bucket]):
        raise HTTPException(400, 'Missing required R2 settings')

    import json as _json_stream
    import boto3 as _boto3
    from botocore.config import Config as _BotoConfig

    client = _boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name='auto',
        config=_BotoConfig(signature_version='s3v4', retries={'max_attempts': 3}),
    )

    manifest = await _load_manifest()

    async def event_stream():
        yield f"data: {_json_stream.dumps({'event': 'start', 'total': len(manifest)})}\n\n"

        uploaded = 0
        skipped = 0
        failed = 0

        for i, entry in enumerate(manifest):
            filename = entry['filename']
            key = f'destinations/{filename}'

            # Check if already on R2
            try:
                client.head_object(Bucket=bucket, Key=key)
                skipped += 1
                yield f"data: {_json_stream.dumps({'event': 'progress', 'index': i + 1, 'total': len(manifest), 'filename': filename, 'status': 'exists', 'uploaded': uploaded, 'skipped': skipped, 'failed': failed})}\n\n"
                continue
            except Exception:
                pass

            # Upload - try multiple sources
            source_urls = [
                f'https://wehive.co.in/images/destinations/{filename}',
                f'https://raw.githubusercontent.com/kktejas07/wehive-master/main/frontend/public/images/destinations/{filename}',
                f'https://raw.githubusercontent.com/kktejas07/wehive-master/dev-fixes/frontend/public/images/destinations/{filename}',
            ]
            uploaded_ok = False
            for src_url in source_urls:
                try:
                    resp = _httpx.get(src_url, timeout=30)
                    resp.raise_for_status()
                    client.put_object(
                        Bucket=bucket,
                        Key=key,
                        Body=resp.content,
                        ContentType='image/webp',
                        ServerSideEncryption='AES256',
                    )
                    uploaded += 1
                    url = f'{public_url}/{key}' if public_url else ''
                    yield f"data: {_json_stream.dumps({'event': 'progress', 'index': i + 1, 'total': len(manifest), 'filename': filename, 'status': 'uploaded', 'url': url, 'uploaded': uploaded, 'skipped': skipped, 'failed': failed})}\n\n"
                    uploaded_ok = True
                    break
                except Exception:
                    continue
            if not uploaded_ok:
                failed += 1
                yield f"data: {_json_stream.dumps({'event': 'progress', 'index': i + 1, 'total': len(manifest), 'filename': filename, 'status': 'failed', 'error': 'Image not found on any source', 'uploaded': uploaded, 'skipped': skipped, 'failed': failed})}\n\n"

        yield f"data: {_json_stream.dumps({'event': 'complete', 'total': len(manifest), 'uploaded': uploaded, 'skipped': skipped, 'failed': failed})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


@router.post('/destinations/sync-to-r2')
async def admin_sync_destinations_to_r2(_=Depends(get_current_admin)):
    """Upload all destination images to Cloudflare R2 (returns result at end)."""
    from settings_service import get_all as _get_settings

    cfg = await _get_settings('r2')
    if not cfg:
        raise HTTPException(400, 'R2 not configured — fill in R2 Storage settings first')

    account_id = cfg.get('account_id', '')
    access_key = cfg.get('access_key_id', '')
    secret_key = cfg.get('secret_access_key', '')
    bucket = cfg.get('bucket', '')
    public_url = (cfg.get('public_url') or '').rstrip('/')
    endpoint = cfg.get('endpoint') or f'https://{account_id}.r2.cloudflarestorage.com'

    if not all([account_id, access_key, secret_key, bucket]):
        raise HTTPException(400, 'Missing required R2 settings: account_id, access_key_id, secret_access_key, bucket')

    import boto3
    from botocore.config import Config

    client = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name='auto',
        config=Config(signature_version='s3v4', retries={'max_attempts': 3}),
    )

    manifest = await _load_manifest()
    results = []
    base_urls = [
        'https://wehive.co.in/images/destinations',
        'https://raw.githubusercontent.com/kktejas07/wehive-master/main/frontend/public/images/destinations',
        'https://raw.githubusercontent.com/kktejas07/wehive-master/dev-fixes/frontend/public/images/destinations',
    ]

    for entry in manifest:
        filename = entry['filename']
        key = f'destinations/{filename}'
        try:
            client.head_object(Bucket=bucket, Key=key)
            results.append({'filename': filename, 'status': 'exists'})
            continue
        except Exception:
            pass

        uploaded = False
        for base_url in base_urls:
            try:
                resp = _httpx.get(f'{base_url}/{filename}', timeout=30)
                resp.raise_for_status()
                client.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=resp.content,
                    ContentType='image/webp',
                    ServerSideEncryption='AES256',
                )
                url = f'{public_url}/{key}' if public_url else ''
                results.append({'filename': filename, 'status': 'uploaded', 'url': url, 'source': base_url})
                uploaded = True
                break
            except Exception:
                continue
        if not uploaded:
            results.append({'filename': filename, 'status': 'failed', 'error': 'Image not found on any source'})

    uploaded = sum(1 for r in results if r['status'] == 'uploaded')
    skipped = sum(1 for r in results if r['status'] == 'exists')
    failed = sum(1 for r in results if r['status'] == 'failed')

    return {
        'total': len(manifest),
        'uploaded': uploaded,
        'skipped': skipped,
        'failed': failed,
        'results': results,
    }


def _r2_client_from_cfg(cfg: dict):
    import boto3
    from botocore.config import Config
    account_id = cfg.get('account_id', '')
    endpoint = cfg.get('endpoint') or f'https://{account_id}.r2.cloudflarestorage.com'
    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=cfg.get('access_key_id', ''),
        aws_secret_access_key=cfg.get('secret_access_key', ''),
        region_name='auto',
        config=Config(signature_version='s3v4', retries={'max_attempts': 3}),
    ), cfg.get('bucket', ''), (cfg.get('public_url') or '').rstrip('/')


async def _get_r2_settings():
    from settings_service import get_all as _get_settings
    cfg = await _get_settings('r2')
    if not cfg:
        raise HTTPException(400, 'R2 not configured — fill in R2 Storage settings first')
    if not all([cfg.get('account_id'), cfg.get('access_key_id'), cfg.get('secret_access_key'), cfg.get('bucket')]):
        raise HTTPException(400, 'Missing required R2 settings')
    return cfg


@router.get('/destinations/r2-status')
async def admin_r2_status(
    _=Depends(get_current_admin),
    refresh: bool = Query(False, description='Force a fresh check against R2'),
):
    """Check which destination images exist on R2. Uses cached status unless refresh=true."""
    R2_STATUS_CACHE_ID = 'destinations_r2_status'

    if refresh:
        cfg = await _get_r2_settings()
        client, bucket, _ = _r2_client_from_cfg(cfg)
        manifest = await _load_manifest()
        results = []
        for entry in manifest:
            filename = entry['filename']
            key = f'destinations/{filename}'
            try:
                client.head_object(Bucket=bucket, Key=key)
                results.append({'filename': filename, 'country': entry['country'], 'onR2': True})
            except Exception:
                results.append({'filename': filename, 'country': entry['country'], 'onR2': False})
        await settings_col.update_one(
            {'_id': R2_STATUS_CACHE_ID},
            {'$set': {'items': results, 'updated_at': datetime.utcnow()}},
            upsert=True,
        )
        return {'items': results, 'total': len(results), 'onR2': sum(1 for r in results if r['onR2']), 'cached': False}

    doc = await settings_col.find_one({'_id': R2_STATUS_CACHE_ID})
    if doc and doc.get('items'):
        items = doc['items']
        return {'items': items, 'total': len(items), 'onR2': sum(1 for r in items if r['onR2']), 'cached': True, 'updated_at': str(doc.get('updated_at', ''))}

    return {'items': [], 'total': 0, 'onR2': 0, 'cached': True}


@router.get('/destinations/signed-url')
async def admin_destination_signed_url(filename: str = Query(...), _=Depends(get_current_admin)):
    """Return a signed URL for a destination image stored on R2."""
    cfg = await _get_r2_settings()
    client, bucket, public_url = _r2_client_from_cfg(cfg)
    key = f'destinations/{filename}'
    try:
        client.head_object(Bucket=bucket, Key=key)
    except Exception:
        raise HTTPException(404, f'Image {filename} not found on R2')
    url = client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=86400,
    )
    return {'filename': filename, 'url': url}


@router.post('/destinations/upload-image')
async def admin_upload_destination(
    country: str = Query(..., description='Country name'),
    file: UploadFile = File(...),
    _=Depends(get_current_admin),
):
    """Upload a single destination image to R2 (replaces existing if any)."""
    cfg = await _get_r2_settings()
    client, bucket, public_url = _r2_client_from_cfg(cfg)

    manifest = await _load_manifest()
    entry = next((e for e in manifest if e['country'].lower() == country.lower()), None)
    if not entry:
        raise HTTPException(404, f'Country "{country}" not found in manifest')

    filename = entry['filename']
    content = await file.read()
    key = f'destinations/{filename}'

    client.put_object(Bucket=bucket, Key=key, Body=content, ContentType=file.content_type or 'image/webp', ServerSideEncryption='AES256')
    url = f'{public_url}/{key}' if public_url else ''

    return {'filename': filename, 'country': country, 'url': url}


@router.post('/destinations/regenerate')
async def admin_regenerate_destination(
    country: str = Query(..., description='Country name'),
    _=Depends(get_current_admin),
):
    """Regenerate a destination image via Together AI and upload to R2."""
    manifest = await _load_manifest()
    entry = next((e for e in manifest if e['country'].lower() == country.lower()), None)
    if not entry:
        raise HTTPException(404, f'Country "{country}" not found in manifest')

    # Read R2 settings + Together key
    cfg = await _get_r2_settings()
    client, bucket, public_url = _r2_client_from_cfg(cfg)

    together_key = os.environ.get('TOGETHER_API_KEY', '')
    if not together_key:
        raise HTTPException(400, 'TOGETHER_API_KEY environment variable not set')

    # Build prompt
    style_suffix = (
        'Premium travel destination artwork in modern flat-vector style blended with semi-realistic digital painting. '
        'Golden hour warm sunlight, deep blue sky with soft white clouds, vibrant yet elegant color palette. '
        'Clean composition with the main landmark centered, plenty of breathing room around the subject. '
        'Highly detailed architecture and landscape elements. '
        'STRICT RULES: Absolutely NO text, NO letters, NO words, NO numbers, NO typography of any kind. '
        'NO flags, NO logos, NO watermarks, NO people crowds. '
        'Portrait 2:3 vertical orientation suitable for a luxury travel card.'
    )
    prompt = f'Premium travel illustration of {entry["country"]}: {entry["landmark"]}. {style_suffix}'

    # Call Together AI
    resp = _httpx.post(
        'https://api.together.xyz/v1/images/generations',
        json={
            'model': 'black-forest-labs/FLUX.1-schnell',
            'prompt': prompt,
            'width': 1024,
            'height': 1536,
            'steps': 8,
            'n': 1,
        },
        headers={'Authorization': f'Bearer {together_key}', 'Content-Type': 'application/json'},
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    item = data.get('data', [{}])[0]
    b64 = item.get('b64_json')
    if isinstance(b64, str):
        image_data = _b64.b64decode(b64)
    elif b64:
        image_data = b64
    elif item.get('url'):
        r = _httpx.get(item['url'], timeout=60)
        r.raise_for_status()
        image_data = r.content
    else:
        raise HTTPException(502, 'AI generation returned no image data')

    # Upload to R2
    filename = entry['filename']
    key = f'destinations/{filename}'
    client.put_object(Bucket=bucket, Key=key, Body=image_data, ContentType='image/webp', ServerSideEncryption='AES256')
    url = f'{public_url}/{key}' if public_url else ''

    # Also save locally
    local_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'images', 'destinations', filename)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, 'wb') as f:
        f.write(image_data)

    return {'filename': filename, 'country': country, 'url': url, 'size_kb': round(len(image_data) / 1024)}


@router.delete('/destinations/r2-image')
async def admin_delete_r2_destination(
    country: str = Query(..., description='Country name'),
    _=Depends(get_current_admin),
):
    """Delete a destination image from R2."""
    cfg = await _get_r2_settings()
    client, bucket, _ = _r2_client_from_cfg(cfg)

    manifest = await _load_manifest()
    entry = next((e for e in manifest if e['country'].lower() == country.lower()), None)
    if not entry:
        raise HTTPException(404, f'Country "{country}" not found in manifest')

    key = f'destinations/{entry["filename"]}'
    client.delete_object(Bucket=bucket, Key=key)
    return {'filename': entry['filename'], 'country': country, 'deleted': True}


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
