"""Admin back-office: contact-form leads inbox, payments ledger and the audit-log viewer.

Endpoints (all admin-only):
  GET   /api/admin/leads                 — paginated leads inbox (status, search)
  PATCH /api/admin/leads/{id}            — set status (new/contacted/closed) and/or append a note
  POST  /api/admin/leads                 — log an enquiry by hand (Social Studio: DMs, calls, walk-ins)
  GET   /api/admin/social-studio         — post-calendar status and branch phone numbers
  PUT   /api/admin/social-studio         — update either of them
  GET   /api/admin/export/leads.csv      — leads CSV
  GET   /api/admin/payments              — paginated payments with payer and totals
  GET   /api/admin/audit/log             — paginated audit trail (filter by entity type / admin)
"""
import re
import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex, require_role
from audit import audit_col, record as audit_record
from db import leads, payments, users
from routes_admin import _csv_response

router = APIRouter(prefix='/admin', tags=['admin-backoffice'])


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _rx(q: str) -> dict:
    return {'$regex': re.escape(q), '$options': 'i'}


# ---------- leads ----------
def _lead(d: dict) -> dict:
    return {
        'id': d['_id'],
        'name': ' '.join(p for p in (d.get('name'), d.get('surname')) if p),
        'email': d.get('email', ''),
        'phone': d.get('phone'),
        'type': d.get('type', 'contact'),
        'purpose': d.get('purpose'),
        'destination': d.get('destination'),
        'travel_date': d.get('travel_date'),
        'travellers': d.get('travellers'),
        'branch': d.get('branch'),
        'source': d.get('source'),
        'ref': d.get('ref'),
        'interest': d.get('interest'),
        'message': d.get('message', ''),
        'status': d.get('status', 'new'),
        'notes': [{**n, 'at': _iso(n.get('at'))} for n in d.get('notes', [])],
        'created_at': _iso(d.get('created_at')),
        'updated_at': _iso(d.get('updated_at')),
    }


def _lead_filter(status: Optional[str], q: Optional[str], purpose: Optional[str] = None,
                 branch: Optional[str] = None) -> dict:
    filt: dict = {}
    if purpose and purpose != 'all':
        filt['purpose'] = purpose
    if branch and branch != 'all':
        filt['branch'] = branch
    if status == 'new':
        filt['status'] = {'$in': [None, 'new']}  # leads created before statuses existed have none
    elif status and status != 'all':
        filt['status'] = status
    if q:
        filt['$or'] = [{'name': _rx(q)}, {'surname': _rx(q)}, {'email': _rx(q)}, {'message': _rx(q)},
                       {'phone': _rx(q)}, {'destination': _rx(q)}, {'ref': _rx(q)}]
    return filt


@router.get('/leads')
async def admin_list_leads(
    _=Depends(get_current_admin_flex),
    status: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=100),
    purpose: Optional[str] = Query(None, max_length=30),
    branch: Optional[str] = Query(None, max_length=30),
    limit: int = Query(25, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    filt = _lead_filter(status, q, purpose, branch)
    total = await leads.count_documents(filt)
    items = [_lead(d) async for d in leads.find(filt).sort('created_at', -1).skip(skip).limit(limit)]
    new_count = await leads.count_documents({'status': {'$in': [None, 'new']}})
    return {'items': items, 'total': total, 'new': new_count, 'limit': limit, 'skip': skip}


class LeadPatch(BaseModel):
    status: Optional[Literal['new', 'contacted', 'closed']] = None
    note: Optional[str] = Field(default=None, min_length=1, max_length=2000)


@router.patch('/leads/{lead_id}')
async def admin_update_lead(lead_id: str, patch: LeadPatch, admin=Depends(require_role(['manager', 'support']))):
    lead = await leads.find_one({'_id': lead_id})
    if not lead:
        raise HTTPException(404, 'Lead not found')
    if not patch.status and not patch.note:
        raise HTTPException(400, 'Nothing to update')
    now = datetime.utcnow()
    update: dict = {'$set': {'updated_at': now}}
    if patch.status:
        update['$set']['status'] = patch.status
    if patch.note:
        update['$push'] = {'notes': {'text': patch.note, 'at': now, 'by': admin.get('email') or admin['_id']}}
    await leads.update_one({'_id': lead_id}, update)
    await audit_record(admin, 'update', 'lead', lead_id,
                       before={'status': lead.get('status', 'new')}, after={'status': patch.status or lead.get('status', 'new')},
                       extra={'note_added': bool(patch.note)})
    return _lead(await leads.find_one({'_id': lead_id}))


class SocialLeadCreate(BaseModel):
    """An enquiry staff log by hand from a social post (DM, call or walk-in)."""
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=5, max_length=20)
    interest: str = Field(default='', max_length=60)
    destination: str = Field(default='', max_length=60)
    ref: str = Field(default='', max_length=20)        # post reference code, e.g. WH-1102
    platform: str = Field(default='', max_length=30)   # Instagram, WhatsApp, Walk-in…
    branch: Optional[Literal['miyapur', 'habsiguda', 'manikonda', 'ballari', 'anantapur', 'east-windsor']] = None
    status: Literal['new', 'contacted', 'closed'] = 'new'
    note: str = Field(default='', max_length=2000)


@router.post('/leads')
async def admin_create_lead(body: SocialLeadCreate, admin=Depends(require_role(['manager', 'support']))):
    now = datetime.utcnow()
    via = ' '.join(p for p in (body.platform, f'(ref {body.ref})' if body.ref else '') if p)
    rec = {
        '_id': str(uuid.uuid4()), 'type': 'social', 'name': body.name, 'email': '', 'phone': body.phone,
        'interest': body.interest, 'destination': body.destination, 'ref': body.ref.upper(),
        'source': body.platform or 'social', 'branch': body.branch, 'status': body.status,
        'message': ' · '.join(p for p in (f'Social enquiry via {via}' if via else 'Social enquiry', body.interest,
                                          body.destination, body.note) if p),
        'created_at': now, 'updated_at': now,
    }
    await leads.insert_one(rec)
    await audit_record(admin, 'create', 'lead', rec['_id'], extra={'ref': rec['ref'], 'source': rec['source']})
    return _lead(rec)


# ---------- social studio (post calendar status + branch phone numbers) ----------
class StudioPatch(BaseModel):
    calendar: Optional[dict[str, Literal['planned', 'designed', 'posted']]] = None
    branches: Optional[dict[str, str]] = None


@router.get('/social-studio')
async def admin_get_social_studio(_=Depends(get_current_admin_flex)):
    from settings_service import get_all
    cfg = await get_all('social_studio')
    return {'calendar': cfg.get('calendar', {}), 'branches': cfg.get('branches', {})}


@router.put('/social-studio')
async def admin_put_social_studio(body: StudioPatch, admin=Depends(require_role(['manager', 'support']))):
    from settings_service import get_all, set_all
    cfg = await get_all('social_studio')
    if body.calendar:
        cfg['calendar'] = {**cfg.get('calendar', {}), **body.calendar}
    if body.branches is not None:
        cfg['branches'] = {k: v[:20] for k, v in body.branches.items()}
    await set_all('social_studio', cfg)
    await audit_record(admin, 'update', 'settings', 'social_studio',
                       extra={'calendar': sorted(body.calendar or {}), 'branches': body.branches is not None})
    return {'calendar': cfg.get('calendar', {}), 'branches': cfg.get('branches', {})}


@router.get('/export/leads.csv')
async def export_leads_csv(_=Depends(get_current_admin_flex)):
    rows = [['id', 'type', 'name', 'email', 'phone', 'purpose', 'destination', 'travel_date', 'travellers', 'branch', 'status', 'message', 'created_at']]
    async for d in leads.find({}).sort('created_at', -1):
        x = _lead(d)
        rows.append([x['id'], x['type'], x['name'], x['email'], x['phone'] or '', x['purpose'] or '', x['destination'] or '',
                     x['travel_date'] or '', x['travellers'] or '', x['branch'] or '', x['status'], x['message'], x['created_at'] or ''])
    return _csv_response(rows, 'wehive-leads.csv')


# ---------- payments ----------
@router.get('/payments')
async def admin_list_payments(
    _=Depends(get_current_admin_flex),
    status: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=100),
    limit: int = Query(25, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    filt: dict = {}
    if status and status != 'all':
        filt['status'] = status
    if q:
        user_ids = [u['_id'] async for u in users.find({'$or': [{'email': _rx(q)}, {'name': _rx(q)}, {'phone': _rx(q)}]}, {'_id': 1}).limit(200)]
        filt['$or'] = [{'razorpay_order_id': _rx(q)}, {'razorpay_payment_id': _rx(q)}, {'user_id': {'$in': user_ids}}]

    total = await payments.count_documents(filt)
    items = []
    async for p in payments.find(filt).sort('created_at', -1).skip(skip).limit(limit):
        u = await users.find_one({'_id': p.get('user_id')}, {'name': 1, 'email': 1, 'phone': 1}) or {}
        items.append({
            'id': p['_id'],
            'user': {'id': p.get('user_id'), 'name': u.get('name'), 'email': u.get('email'), 'phone': u.get('phone')},
            'plan_id': p.get('plan_id'),
            'amount_inr': p.get('amount_inr', 0),
            'refunded_inr': p.get('refunded_inr', 0),
            'refunds': [{'amount_inr': r.get('amount_inr'), 'status': r.get('status'), 'reason': r.get('reason'),
                         'by': r.get('by'), 'at': _iso(r.get('at'))} for r in p.get('refunds', [])],
            'status': p.get('status'),
            'razorpay_order_id': p.get('razorpay_order_id'),
            'razorpay_payment_id': p.get('razorpay_payment_id'),
            'created_at': _iso(p.get('created_at')),
            'updated_at': _iso(p.get('updated_at')),
        })
    paid = [r async for r in payments.aggregate([
        {'$match': {'status': {'$in': ['paid', 'partially_refunded', 'refunded']}}},
        {'$group': {'_id': None, 'amount': {'$sum': '$amount_inr'}, 'refunded': {'$sum': {'$ifNull': ['$refunded_inr', 0]}},
                    'count': {'$sum': 1}}},
    ])]
    row = paid[0] if paid else {'amount': 0, 'refunded': 0, 'count': 0}
    # paid_inr is net of refunds
    totals = {'paid_inr': row['amount'] - row['refunded'], 'refunded_inr': row['refunded'], 'paid_count': row['count']}
    return {'items': items, 'total': total, 'totals': totals, 'limit': limit, 'skip': skip}


# ---------- audit log ----------
@router.get('/audit/log')
async def admin_audit_log(
    _=Depends(get_current_admin_flex),
    entity_type: Optional[str] = Query(None, max_length=50),
    q: Optional[str] = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    filt: dict = {}
    if entity_type and entity_type != 'all':
        filt['entity_type'] = entity_type
    if q:
        filt['$or'] = [{'admin_email': _rx(q)}, {'entity_id': _rx(q)}, {'action': _rx(q)}]
    total = await audit_col.count_documents(filt)
    items = []
    async for r in audit_col.find(filt).sort('at', -1).skip(skip).limit(limit):
        items.append({
            'id': str(r['_id']),
            'at': _iso(r.get('at')),
            'admin_email': r.get('admin_email'),
            'admin_name': r.get('admin_name'),
            'action': r.get('action'),
            'entity_type': r.get('entity_type'),
            'entity_id': r.get('entity_id'),
            'diff': r.get('diff'),
            'extra': r.get('extra'),
        })
    types = sorted(t for t in await audit_col.distinct('entity_type') if t)
    return {'items': items, 'total': total, 'entity_types': types, 'limit': limit, 'skip': skip}
