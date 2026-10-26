"""Admin monitoring: dashboard health, inactive users, bulk reminders, pipeline kanban.

Endpoints (all admin-only):
  GET  /admin/monitoring/dashboard        — stale_cases, pending_docs, inactive_users, email_bounces, system_health
  GET  /admin/monitoring/inactive-users   — paginated inactive users with recommended_action
  POST /admin/monitoring/bulk-remind      — send reminders to up to 50 users
  GET  /admin/monitoring/application-pipeline  — kanban grouped by stage, sorted by days_in_stage desc
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from audit import record as audit_record
from db import applications, db, users

router = APIRouter(prefix='/admin/monitoring', tags=['admin-monitoring'])
logger = logging.getLogger('wehive.admin_monitoring')

email_log = db['email_log']
OPEN_STATUSES = ['submitted', 'in_review', 'appointment_scheduled']


def _days_since(dt) -> Optional[int]:
    if not isinstance(dt, datetime):
        return None
    return (datetime.utcnow() - dt).days


def _drop_off_action(days: Optional[int]) -> str:
    if days is None:
        return 'none'
    if days > 30:
        return 'call_user'
    if days > 14:
        return 'assign_agent'
    if days > 7:
        return 'send_reminder'
    return 'none'


@router.get('/dashboard')
async def monitoring_dashboard(_=Depends(get_current_admin_flex)):
    now = datetime.utcnow()
    stale_cutoff = now - timedelta(days=7)
    inactive_cutoff = now - timedelta(days=7)
    bounce_cutoff = now - timedelta(days=30)

    stale_cases = await applications.count_documents({
        'status': {'$in': OPEN_STATUSES},
        'updated_at': {'$lt': stale_cutoff},
    })
    pending_docs = await applications.count_documents({
        'documents': {'$elemMatch': {'status': {'$in': [None, 'uploaded']}}},
        'status': {'$in': OPEN_STATUSES},
    })
    inactive_users = await users.count_documents({
        'suspended': {'$ne': True},
        '$or': [
            {'last_login_at': {'$lt': inactive_cutoff}},
            {'last_login_at': {'$exists': False}},
        ],
    })
    email_bounces = await email_log.count_documents({
        'status': 'bounced',
        'sent_at': {'$gte': bounce_cutoff},
    })

    # System health: quick ping
    try:
        await db.command('ping')
        db_status = 'ok'
    except Exception:
        db_status = 'error'

    return {
        'stale_cases': stale_cases,
        'pending_docs': pending_docs,
        'inactive_users': inactive_users,
        'email_bounces': email_bounces,
        'system_health': {'database': db_status},
        'checked_at': now.isoformat(),
    }


@router.get('/inactive-users')
async def monitoring_inactive_users(
    _=Depends(get_current_admin_flex),
    days: int = Query(7, ge=1, le=365),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    filt = {
        'suspended': {'$ne': True},
        '$or': [
            {'last_login_at': {'$lt': cutoff}},
            {'last_login_at': {'$exists': False}},
        ],
    }
    total = await users.count_documents(filt)
    rows = []
    async for u in users.find(filt, {'name': 1, 'email': 1, 'last_login_at': 1, 'created_at': 1}).sort(
        'last_login_at', 1
    ).skip(skip).limit(limit):
        d = _days_since(u.get('last_login_at') or u.get('created_at'))
        rows.append({
            'id': u['_id'],
            'name': u.get('name'),
            'email': u.get('email'),
            'days_inactive': d,
            'recommended_action': _drop_off_action(d),
        })
    return {'total': total, 'skip': skip, 'limit': limit, 'users': rows}


class BulkRemindBody(BaseModel):
    user_ids: list[str] = Field(min_length=1, max_length=50)
    template: str = Field(default='generic', max_length=50)
    note: Optional[str] = Field(default=None, max_length=500)


@router.post('/bulk-remind')
async def monitoring_bulk_remind(body: BulkRemindBody, admin=Depends(get_current_admin_flex)):
    if len(body.user_ids) > 50:
        raise HTTPException(400, 'Maximum 50 users per bulk remind')
    sent, failed = [], []
    from viewmodels.email_viewmodel import send_reminder
    for uid in body.user_ids:
        u = await users.find_one({'_id': uid}, {'email': 1, 'name': 1})
        if not u or not u.get('email'):
            failed.append(uid)
            continue
        try:
            await send_reminder(uid, u['email'], u.get('name') or 'there', body.template, body.note or '')
            await audit_record(admin, 'bulk_reminder_sent', 'user', uid,
                               extra={'template': body.template})
            sent.append(uid)
        except Exception as e:
            logger.warning('bulk remind failed for %s: %s', uid, e)
            failed.append(uid)
    return {'sent': len(sent), 'failed': len(failed), 'sent_ids': sent, 'failed_ids': failed}


@router.get('/application-pipeline')
async def monitoring_application_pipeline(_=Depends(get_current_admin_flex)):
    now = datetime.utcnow()
    columns: dict[str, list] = {s: [] for s in OPEN_STATUSES}
    async for app in applications.find(
        {'status': {'$in': OPEN_STATUSES}},
        {'country_name': 1, 'visa_type': 1, 'status': 1, 'primary_applicant': 1,
         'assigned_to': 1, 'updated_at': 1, 'created_at': 1},
    ).limit(500):
        status = app.get('status', 'submitted')
        ref_date = app.get('updated_at') or app.get('created_at') or now
        days_in_stage = (now - ref_date).days if isinstance(ref_date, datetime) else 0
        columns.setdefault(status, []).append({
            'id': app['_id'],
            'country': app.get('country_name'),
            'visa_type': app.get('visa_type'),
            'applicant': (app.get('primary_applicant') or {}).get('name'),
            'assigned_to': app.get('assigned_to'),
            'days_in_stage': days_in_stage,
        })
    # Sort each column by days_in_stage descending (most stale first)
    for col in columns.values():
        col.sort(key=lambda x: x['days_in_stage'], reverse=True)
    return {
        'columns': [
            {'status': s, 'label': s.replace('_', ' ').title(), 'items': columns.get(s, [])}
            for s in OPEN_STATUSES
        ],
        'total': sum(len(v) for v in columns.values()),
    }
