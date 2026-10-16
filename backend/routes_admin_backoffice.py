"""Admin back-office: contact-form leads inbox, payments ledger and the audit-log viewer.

Endpoints (all admin-only):
  GET   /api/admin/leads                 — paginated leads inbox (status, search)
  PATCH /api/admin/leads/{id}            — set status (new/contacted/closed) and/or append a note
  GET   /api/admin/export/leads.csv      — leads CSV
  GET   /api/admin/payments              — paginated payments with payer and totals
  GET   /api/admin/audit/log             — paginated audit trail (filter by entity type / admin)
"""
import re
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
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
        'message': d.get('message', ''),
        'status': d.get('status', 'new'),
        'notes': [{**n, 'at': _iso(n.get('at'))} for n in d.get('notes', [])],
        'created_at': _iso(d.get('created_at')),
        'updated_at': _iso(d.get('updated_at')),
    }


def _lead_filter(status: Optional[str], q: Optional[str]) -> dict:
    filt: dict = {}
    if status == 'new':
        filt['status'] = {'$in': [None, 'new']}  # leads created before statuses existed have none
    elif status and status != 'all':
        filt['status'] = status
    if q:
        filt['$or'] = [{'name': _rx(q)}, {'surname': _rx(q)}, {'email': _rx(q)}, {'message': _rx(q)}]
    return filt


@router.get('/leads')
async def admin_list_leads(
    _=Depends(get_current_admin_flex),
    status: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=100),
    limit: int = Query(25, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    filt = _lead_filter(status, q)
    total = await leads.count_documents(filt)
    items = [_lead(d) async for d in leads.find(filt).sort('created_at', -1).skip(skip).limit(limit)]
    new_count = await leads.count_documents({'status': {'$in': [None, 'new']}})
    return {'items': items, 'total': total, 'new': new_count, 'limit': limit, 'skip': skip}


class LeadPatch(BaseModel):
    status: Optional[Literal['new', 'contacted', 'closed']] = None
    note: Optional[str] = Field(default=None, min_length=1, max_length=2000)


@router.patch('/leads/{lead_id}')
async def admin_update_lead(lead_id: str, patch: LeadPatch, admin=Depends(get_current_admin_flex)):
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


@router.get('/export/leads.csv')
async def export_leads_csv(_=Depends(get_current_admin_flex)):
    rows = [['id', 'name', 'email', 'status', 'message', 'created_at']]
    async for d in leads.find({}).sort('created_at', -1):
        x = _lead(d)
        rows.append([x['id'], x['name'], x['email'], x['status'], x['message'], x['created_at'] or ''])
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
            'status': p.get('status'),
            'razorpay_order_id': p.get('razorpay_order_id'),
            'razorpay_payment_id': p.get('razorpay_payment_id'),
            'created_at': _iso(p.get('created_at')),
            'updated_at': _iso(p.get('updated_at')),
        })
    paid = [r async for r in payments.aggregate([
        {'$match': {'status': 'paid'}},
        {'$group': {'_id': None, 'amount': {'$sum': '$amount_inr'}, 'count': {'$sum': 1}}},
    ])]
    totals = {'paid_inr': paid[0]['amount'] if paid else 0, 'paid_count': paid[0]['count'] if paid else 0}
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
