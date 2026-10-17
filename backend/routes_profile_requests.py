"""Profile change request routes.

Users submit requests for profile updates or information; admins approve or reject them.
On approval the requested profile fields are applied automatically.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from auth_utils import get_current_user
from admin_auth import get_current_admin_flex
from db import users, profile_change_requests
from serializers import serialize_doc
from audit import record as audit_record

router = APIRouter(tags=['profile-requests'])


# ---------- models ----------

class ProfileRequestCreate(BaseModel):
    request_type: Literal['profile_update', 'info_request', 'document_request'] = 'profile_update'
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    message: Optional[str] = None  # free-text note to admin


class AdminReviewRequest(BaseModel):
    action: Literal['approve', 'reject']
    admin_note: Optional[str] = None


# ---------- helpers ----------

def _serialize(doc: dict) -> dict:
    out = serialize_doc(doc)
    for field in ('created_at', 'updated_at', 'reviewed_at'):
        if isinstance(out.get(field), datetime):
            out[field] = out[field].isoformat()
    return out


# ---------- user endpoints ----------

@router.post('/users/me/profile-requests', status_code=201)
async def submit_profile_request(req: ProfileRequestCreate, user=Depends(get_current_user)):
    requested_fields = {
        k: v for k, v in {
            'name': req.name,
            'email': req.email,
            'phone': req.phone,
            'gender': req.gender,
        }.items() if v is not None
    }
    if not requested_fields and req.request_type == 'profile_update':
        raise HTTPException(400, 'Provide at least one field to change.')

    now = datetime.utcnow()
    doc = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'user_name': user.get('name') or '',
        'user_email': user.get('email') or '',
        'user_phone': user.get('phone') or '',
        'request_type': req.request_type,
        'requested_fields': requested_fields,
        'message': req.message or '',
        'status': 'pending',
        'admin_note': '',
        'reviewed_by': None,
        'reviewed_at': None,
        'created_at': now,
        'updated_at': now,
    }
    await profile_change_requests.insert_one(doc)
    return _serialize(doc)


@router.get('/users/me/profile-requests')
async def list_my_requests(user=Depends(get_current_user)):
    cur = profile_change_requests.find({'user_id': user['_id']}).sort('created_at', -1)
    return [_serialize(d) async for d in cur]


# ---------- admin endpoints ----------

async def _get_admin(user=Depends(get_current_admin_flex)):
    return user


@router.get('/admin/profile-requests')
async def admin_list_requests(
    status: Optional[str] = None,
    admin=Depends(_get_admin),
):
    query = {}
    if status:
        query['status'] = status
    cur = profile_change_requests.find(query).sort('created_at', -1)
    return [_serialize(d) async for d in cur]


@router.put('/admin/profile-requests/{request_id}')
async def admin_review_request(request_id: str, body: AdminReviewRequest, admin=Depends(_get_admin)):
    doc = await profile_change_requests.find_one({'_id': request_id})
    if not doc:
        raise HTTPException(404, 'Request not found.')
    if doc['status'] != 'pending':
        raise HTTPException(409, 'Request has already been reviewed.')

    now = datetime.utcnow()
    new_status = 'approved' if body.action == 'approve' else 'rejected'

    # Apply the change before marking the request approved, so a conflict leaves it pending.
    if new_status == 'approved' and doc.get('requested_fields'):
        update_fields = {k: v for k, v in doc['requested_fields'].items() if v is not None}
        if update_fields:
            user = await users.find_one({'_id': doc['user_id']}, {'email': 1}) or {}
            if 'email' in update_fields and str(update_fields['email']).lower() != (user.get('email') or '').lower():
                update_fields['email_verified'] = False  # new address must be re-verified
            update_fields['updated_at'] = now
            try:
                await users.update_one({'_id': doc['user_id']}, {'$set': update_fields})
            except DuplicateKeyError:
                raise HTTPException(409, 'That email or phone already belongs to another account.')

    await profile_change_requests.update_one(
        {'_id': request_id},
        {'$set': {
            'status': new_status,
            'admin_note': body.admin_note or '',
            'reviewed_by': admin.get('_id') or admin.get('id') or '',
            'reviewed_at': now,
            'updated_at': now,
        }},
    )

    await audit_record(admin, new_status, 'profile_request', request_id,
                       extra={'user_id': doc['user_id'], 'fields': sorted(doc.get('requested_fields') or {})})
    updated = await profile_change_requests.find_one({'_id': request_id})
    return _serialize(updated)
