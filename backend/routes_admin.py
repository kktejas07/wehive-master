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
from datetime import datetime, timedelta
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth_utils import get_current_user
from db import db, users, applications, holiday_plans, leads, otps

router = APIRouter(prefix='/admin', tags=['admin'])

countries_col = db['countries_v2']
settings_col = db['settings']

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get('ADMIN_EMAILS', '').split(',')
    if e.strip()
}


# ---------- auth ----------
async def get_current_admin(user=Depends(get_current_user)):
    email = (user.get('email') or '').lower()
    if user.get('is_admin') or email in ADMIN_EMAILS:
        return user
    raise HTTPException(status_code=403, detail='Admin access required')


def _public_user(u: dict) -> dict:
    email = (u.get('email') or '').lower()
    return {
        'id': u.get('_id'),
        'name': u.get('name'),
        'email': u.get('email'),
        'phone': u.get('phone'),
        'is_premium': bool(u.get('is_premium', False)),
        'is_staff': bool(u.get('is_staff', False)),
        'is_admin': bool(u.get('is_admin', False)) or email in ADMIN_EMAILS,
        'staff_role': u.get('staff_role'),
        'premium_since': u.get('premium_since').isoformat() if isinstance(u.get('premium_since'), datetime) else u.get('premium_since'),
        'created_at': u.get('created_at').isoformat() if isinstance(u.get('created_at'), datetime) else u.get('created_at'),
        'updated_at': u.get('updated_at').isoformat() if isinstance(u.get('updated_at'), datetime) else u.get('updated_at'),
    }


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


# ---------- fee logic (mirrored from the front-end) ----------
BASE_FEE_BY_TYPE = {
    'Tourist': 3500,
    'Business': 4500,
    'Student': 5500,
    'Work': 7500,
    'Transit': 2500,
    'Medical': 4500,
}
SURCHARGE_INR = 350
GST_RATE = 0.18


def _revenue_for(app: dict, country: Optional[dict]) -> int:
    """Return estimated revenue (INR) for a single application."""
    applicants = max(1, int(app.get('applicants') or 1))
    visa_type = app.get('visa_type') or 'Tourist'
    base = BASE_FEE_BY_TYPE.get(visa_type, 3500)
    govt_inr = 0
    appt = 0
    if country:
        cats = country.get('categories') or {}
        cat = cats.get(visa_type) if isinstance(cats, dict) else None
        if isinstance(cat, dict):
            govt_inr = int(cat.get('fees_inr') or 0)
        if country.get('requires_appointment'):
            appt = int(country.get('appointment_fee_inr') or 0)
    taxable = base + SURCHARGE_INR + appt
    gst = round(taxable * GST_RATE)
    per = govt_inr + base + SURCHARGE_INR + appt + gst
    return per * applicants


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
    drafts = await applications.count_documents({'status': 'draft'})
    submitted = await applications.count_documents({'status': 'submitted'})
    in_review = await applications.count_documents({'status': 'in_review'})
    approved = await applications.count_documents({'status': 'approved'})
    rejected = await applications.count_documents({'status': 'rejected'})
    new_apps_30 = await applications.count_documents({'created_at': {'$gte': since_30}})

    total_countries = await countries_col.count_documents({})
    no_visa_countries = await countries_col.count_documents({'no_visa': True})
    total_leads = await leads.count_documents({})
    total_plans = await holiday_plans.count_documents({})

    # revenue: iterate billable apps and compute
    revenue_total = 0
    revenue_30 = 0
    # Build a lookup of countries we care about by id
    billable_statuses = ['submitted', 'in_review', 'approved']
    cache: dict = {}
    cur = applications.find({'status': {'$in': billable_statuses}})
    async for a in cur:
        cid = (a.get('country_id') or '').lower()
        country = cache.get(cid)
        if country is None:
            country = await countries_col.find_one({'id': cid}, {'_id': 0}) or {}
            cache[cid] = country
        amount = _revenue_for(a, country)
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
async def admin_update_user(user_id: str, patch: UserPatch, _=Depends(get_current_admin)):
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
        revenue = _revenue_for(a, country)
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
        label_map = {
            'submitted': 'Submitted to embassy',
            'in_review': 'In consular review',
            'approved': 'Visa approved',
            'rejected': 'Visa rejected',
            'draft': 'Moved back to draft',
        }
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
            'status': app.get('status') or 'draft',
            'label': 'Admin note',
            'at': now,
            'note': patch.note,
        })
        update['timeline'] = events

    await applications.update_one({'_id': application_id}, {'$set': update})
    fresh = await applications.find_one({'_id': application_id})
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
async def admin_update_country(country_id: str, patch: CountryPatch, _=Depends(get_current_admin)):
    cid = country_id.lower()
    existing = await countries_col.find_one({'id': cid})
    if not existing:
        raise HTTPException(404, 'Country not found')
    update = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    if 'no_visa' in update:
        update['visa_required'] = not update['no_visa']
    update['updated_at'] = datetime.utcnow()
    await countries_col.update_one({'id': cid}, {'$set': update})
    fresh = await countries_col.find_one({'id': cid}, {'_id': 0})
    return fresh


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

    emergent_llm = os.environ.get('EMERGENT_LLM_KEY', '')

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
                'id': 'emergent_llm',
                'name': 'Emergent Universal LLM key',
                'status': 'configured' if emergent_llm else 'missing',
                'details': {'key': _mask(emergent_llm, 6)},
                'action': 'Powers chatbot, passport vision scan and flight suggestions.',
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
            str(_revenue_for(a, country)),
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
    billable = ['submitted', 'in_review', 'approved']
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
            str(_revenue_for(a, country)),
        ])
    return _csv_response(rows, 'wehive-revenue.csv')
