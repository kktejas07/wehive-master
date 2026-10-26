"""Admin case management: one application's full case, document review, staff messaging,
internal notes, staff assignment and deadline alerts.

Endpoints (all admin-only):
  GET   /api/admin/applications/{id}/case                       — everything about one application
  GET   /api/admin/applications/{id}/documents/{doc_id}/file     — view an uploaded document
  PATCH /api/admin/applications/{id}/documents/{doc_id}          — approve / reject / request re-upload
  POST  /api/admin/applications/{id}/messages                    — reply to the applicant
  POST  /api/admin/applications/{id}/internal-notes              — staff-only note (never shown to the applicant)
  PATCH /api/admin/applications/{id}/assign                      — assign to a staff member (or unassign)
  GET   /api/admin/staff/workload                                — assignable staff with open-case counts
  GET   /api/admin/alerts                                        — stale cases, appointments, expiring passports…
"""
import logging
import uuid
from datetime import date, datetime, timedelta

logger = logging.getLogger('wehive.admin_cases')
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

import storage as r2
from admin_auth import get_current_admin_flex
from audit import record as audit_record
from db import applications, db, notifications_col, scans, users
from routes_admin import _serialize_app

router = APIRouter(prefix='/admin', tags=['admin-cases'])

internal_notes = db['application_internal_notes']  # separate collection so applicant endpoints can never return it

OPEN_STATUSES = ['submitted', 'in_review', 'appointment_scheduled']
CLOSED_STATUSES = ['approved', 'rejected']
DOC_REVIEW = {
    'approved': ('Document approved', 'info'),
    'rejected': ('Document rejected', 'warning'),
    'reupload_requested': ('Please re-upload a document', 'warning'),
}


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _date(v) -> Optional[date]:
    """Parse 'YYYY-MM-DD…' strings or datetimes; None when missing or malformed."""
    if isinstance(v, datetime):
        return v.date()
    try:
        return date.fromisoformat(str(v)[:10]) if v else None
    except ValueError:
        return None


async def _app_or_404(application_id: str) -> dict:
    app = await applications.find_one({'_id': application_id})
    if not app:
        raise HTTPException(404, 'Application not found')
    return app


async def _notify(app: dict, kind: str, title: str, body: str, severity: str = 'info') -> None:
    if not app.get('user_id'):
        return
    doc = {
        '_id': str(uuid.uuid4()),
        'user_id': app['user_id'],
        'type': kind,
        'title': title,
        'body': body,
        'severity': severity,
        'application_id': app['_id'],
        'action_link': f"/account/applications/{app['_id']}",
        'read': False,
        'created_at': datetime.utcnow(),
    }
    await notifications_col.insert_one(doc)
    from notify import _publish
    _publish(app['user_id'], doc)


def _staff_public(u: Optional[dict]) -> Optional[dict]:
    return u and {'id': u['_id'], 'name': u.get('name'), 'email': u.get('email'), 'staff_role': u.get('staff_role')}


# ---------- case view ----------
@router.get('/applications/{application_id}/case')
async def admin_case(application_id: str, _=Depends(get_current_admin_flex)):
    app = await _app_or_404(application_id)
    applicant = await users.find_one({'_id': app.get('user_id')}, {'name': 1, 'email': 1, 'phone': 1, 'is_premium': 1, 'created_at': 1}) or {}
    assignee = await users.find_one({'_id': app['assigned_to']}) if app.get('assigned_to') else None
    agent = await db.agents.find_one({'_id': app['agent_id']}, {'name': 1, 'email': 1, 'agency_name': 1}) if app.get('agent_id') else None
    notes = [{'id': n['_id'], 'text': n['text'], 'by': n.get('by'), 'at': _iso(n.get('at'))}
             async for n in internal_notes.find({'application_id': application_id}).sort('at', -1).limit(200)]
    scan_rows = [{'id': s['_id'], 'kind': s.get('kind'), 'extracted': s.get('extracted') or {}, 'created_at': _iso(s.get('created_at'))}
                 async for s in scans.find({'application_id': application_id}, {'raw': 0}).sort('created_at', -1).limit(50)]
    out = _serialize_app(app)
    out.update({
        'applicant': {'id': app.get('user_id'), 'name': applicant.get('name'), 'email': applicant.get('email'),
                      'phone': applicant.get('phone'), 'is_premium': bool(applicant.get('is_premium')),
                      'joined_at': _iso(applicant.get('created_at'))},
        'assignee': _staff_public(assignee),
        'agent': agent and {'id': agent['_id'], 'name': agent.get('name'), 'email': agent.get('email'), 'agency_name': agent.get('agency_name')},
        'internal_notes': notes,
        'scans': scan_rows,
        'alerts': _case_alerts(app, date.today()),
    })
    return out


@router.get('/applications/{application_id}/documents/{doc_id}/file')
async def admin_document_file(application_id: str, doc_id: str, _=Depends(get_current_admin_flex)):
    app = await _app_or_404(application_id)
    doc = next((d for d in app.get('documents', []) if d.get('_id') == doc_id), None)
    if not doc:
        raise HTTPException(404, 'Document not found')
    if doc.get('storage') == 'r2' and doc.get('object_key'):
        return {'url': r2.signed_download_url(doc['object_key'], filename=doc.get('filename'))}
    p = Path(doc.get('storage_path', ''))
    if not p.is_file():
        raise HTTPException(410, 'File missing on storage')
    return FileResponse(str(p), media_type=doc.get('mime', 'application/octet-stream'), filename=doc.get('filename'))


# ---------- document review ----------
class DocReview(BaseModel):
    status: Literal['approved', 'rejected', 'reupload_requested']
    reason: Optional[str] = Field(default=None, max_length=1000)


@router.patch('/applications/{application_id}/documents/{doc_id}')
async def admin_review_document(application_id: str, doc_id: str, body: DocReview, admin=Depends(get_current_admin_flex)):
    if body.status != 'approved' and not (body.reason or '').strip():
        raise HTTPException(400, 'Give the applicant a reason')
    app = await _app_or_404(application_id)
    doc = next((d for d in app.get('documents', []) if d.get('_id') == doc_id), None)
    if not doc:
        raise HTTPException(404, 'Document not found')
    now = datetime.utcnow()
    reviewer = admin.get('email') or admin['_id']
    await applications.update_one(
        {'_id': application_id, 'documents._id': doc_id},
        {'$set': {
            'documents.$.status': body.status,
            'documents.$.review_reason': body.reason or '',
            'documents.$.reviewed_by': reviewer,
            'documents.$.reviewed_at': now,
            'updated_at': now,
        }, '$push': {'timeline': {
            'id': str(uuid.uuid4()), 'status': app.get('status'), 'label': DOC_REVIEW[body.status][0],
            'at': now, 'note': f"{doc.get('doc_type') or doc.get('filename')}" + (f": {body.reason}" if body.reason else ''),
        }}},
    )
    title, severity = DOC_REVIEW[body.status]
    name = doc.get('doc_type') or doc.get('filename') or 'document'
    await _notify(app, 'document_review', title, f"{name}" + (f" — {body.reason}" if body.reason else ' has been approved.'), severity)
    await audit_record(admin, body.status, 'document', doc_id,
                       before={'status': doc.get('status')}, after={'status': body.status},
                       extra={'application_id': application_id, 'reason': body.reason})
    user = await users.find_one({'_id': app.get('user_id')}, {'email': 1, 'name': 1}) if app.get('user_id') else None
    if user and user.get('email'):
        try:
            from viewmodels.email_viewmodel import send_document_action
            await send_document_action(app['user_id'], user['email'], user.get('name') or 'there',
                                       doc.get('doc_type') or doc.get('filename') or 'document',
                                       body.status, body.reason or '')
        except Exception as _e:
            logger.warning('doc action email failed: %s', _e)
    return {'ok': True, 'status': body.status}


# ---------- messages & internal notes ----------
class TextBody(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


@router.post('/applications/{application_id}/messages')
async def admin_send_message(application_id: str, body: TextBody, admin=Depends(get_current_admin_flex)):
    app = await _app_or_404(application_id)
    now = datetime.utcnow()
    msg = {'_id': str(uuid.uuid4()), 'from': 'consultant', 'name': admin.get('name') or 'We Hive team',
           'text': body.text.strip(), 'at': now, 'staff_id': admin['_id']}
    await applications.update_one({'_id': application_id}, {'$push': {'messages': msg}, '$set': {'updated_at': now}})
    await _notify(app, 'message', 'New message from your consultant', body.text.strip()[:140])
    await audit_record(admin, 'message', 'application', application_id)
    user = await users.find_one({'_id': app.get('user_id')}, {'email': 1, 'name': 1}) if app.get('user_id') else None
    if user and user.get('email'):
        try:
            from viewmodels.email_viewmodel import send_admin_message
            await send_admin_message(app['user_id'], user['email'], user.get('name') or 'there',
                                     body.text.strip()[:500], application_id)
        except Exception as _e:
            logger.warning('admin message email failed: %s', _e)
    return {'id': msg['_id'], 'from': 'consultant', 'name': msg['name'], 'text': msg['text'], 'at': now.isoformat()}


@router.post('/applications/{application_id}/internal-notes')
async def admin_add_internal_note(application_id: str, body: TextBody, admin=Depends(get_current_admin_flex)):
    await _app_or_404(application_id)
    note = {'_id': str(uuid.uuid4()), 'application_id': application_id, 'text': body.text.strip(),
            'by': admin.get('email') or admin['_id'], 'at': datetime.utcnow()}
    await internal_notes.insert_one(note)
    await audit_record(admin, 'note', 'application', application_id)
    return {'id': note['_id'], 'text': note['text'], 'by': note['by'], 'at': note['at'].isoformat()}


# ---------- assignment ----------
class AssignBody(BaseModel):
    staff_id: Optional[str] = None  # None unassigns


async def _assignable(user_id: str) -> Optional[dict]:
    return await users.find_one({'_id': user_id, '$or': [{'is_staff': True}, {'is_admin': True}]})


@router.patch('/applications/{application_id}/assign')
async def admin_assign(application_id: str, body: AssignBody, admin=Depends(get_current_admin_flex)):
    app = await _app_or_404(application_id)
    staff = None
    if body.staff_id:
        staff = await _assignable(body.staff_id)
        if not staff:
            raise HTTPException(404, 'Staff member not found')
    now = datetime.utcnow()
    await applications.update_one({'_id': application_id}, {'$set': {
        'assigned_to': body.staff_id, 'assigned_at': now if body.staff_id else None, 'updated_at': now}})
    await audit_record(admin, 'assign', 'application', application_id,
                       before={'assigned_to': app.get('assigned_to')}, after={'assigned_to': body.staff_id})
    return {'ok': True, 'assignee': _staff_public(staff)}


@router.get('/staff/workload')
async def admin_staff_workload(_=Depends(get_current_admin_flex)):
    counts = {r['_id']: r['n'] async for r in applications.aggregate([
        {'$match': {'assigned_to': {'$ne': None}, 'status': {'$nin': CLOSED_STATUSES}}},
        {'$group': {'_id': '$assigned_to', 'n': {'$sum': 1}}},
    ])}
    staff = [{**_staff_public(u), 'open_cases': counts.get(u['_id'], 0)}
             async for u in users.find({'$or': [{'is_staff': True}, {'is_admin': True}]}).sort('name', 1).limit(500)]
    unassigned = await applications.count_documents({'assigned_to': None, 'status': {'$in': OPEN_STATUSES}})
    return {'staff': staff, 'unassigned_open': unassigned}


# ---------- deadline alerts ----------
def _case_alerts(app: dict, today: date, stale_days: int = 7) -> list[dict]:
    """Everything about one case that needs attention, most urgent first."""
    status = app.get('status')
    if status in CLOSED_STATUSES:
        return []
    out = []
    updated = _date(app.get('updated_at')) or _date(app.get('created_at'))
    if status in OPEN_STATUSES and updated and (today - updated).days >= stale_days:
        out.append({'kind': 'stale', 'severity': 'warning', 'due': None,
                    'message': f'No update for {(today - updated).days} days'})
    appt = _date((app.get('visa_appointment') or {}).get('date'))
    if appt and 0 <= (appt - today).days <= 14:
        out.append({'kind': 'appointment', 'severity': 'critical' if (appt - today).days <= 3 else 'warning', 'due': appt.isoformat(),
                    'message': f'Embassy appointment in {(appt - today).days} day(s)'})
    travel = _date(app.get('travel_date'))
    if travel and 0 <= (travel - today).days <= 30 and status in ('draft', *OPEN_STATUSES):
        out.append({'kind': 'travel_soon', 'severity': 'critical' if (travel - today).days <= 10 else 'warning', 'due': travel.isoformat(),
                    'message': f'Travel in {(travel - today).days} day(s) but visa not approved'})
    expiry = _date((app.get('form_data') or {}).get('expiry_date'))
    if expiry and (expiry - (travel or today)).days < 180:
        out.append({'kind': 'passport_expiring', 'severity': 'critical' if expiry <= (travel or today) else 'warning', 'due': expiry.isoformat(),
                    'message': 'Passport expires within 6 months of travel'})
    pending = sum(1 for d in app.get('documents', []) if d.get('status') in (None, 'uploaded'))
    if pending:
        out.append({'kind': 'documents_pending', 'severity': 'info', 'due': None,
                    'message': f'{pending} document(s) awaiting review'})
    rank = {'critical': 0, 'warning': 1, 'info': 2}
    return sorted(out, key=lambda a: rank[a['severity']])


@router.get('/alerts')
async def admin_alerts(
    admin=Depends(get_current_admin_flex),
    stale_days: int = Query(7, ge=1, le=90),
    mine: bool = False,
):
    filt: dict = {'status': {'$nin': CLOSED_STATUSES}}
    if mine:
        filt['assigned_to'] = admin['_id']
    today = date.today()
    items, counts = [], {}
    proj = {'messages': 0, 'timeline': 0}
    async for app in applications.find(filt, proj).sort('updated_at', 1).limit(2000):
        for a in _case_alerts(app, today, stale_days):
            counts[a['kind']] = counts.get(a['kind'], 0) + 1
            items.append({**a, 'application_id': app['_id'], 'status': app.get('status'),
                          'country': app.get('country_name') or (app.get('country_id') or '').upper(),
                          'visa_type': app.get('visa_type'),
                          'applicant': (app.get('primary_applicant') or {}).get('name'),
                          'assigned_to': app.get('assigned_to')})
    rank = {'critical': 0, 'warning': 1, 'info': 2}
    items.sort(key=lambda a: (rank[a['severity']], a['due'] or '9999'))
    return {'items': items[:200], 'counts': counts, 'total': len(items)}
