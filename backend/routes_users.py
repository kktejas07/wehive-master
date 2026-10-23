from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Literal
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel

from models import UpdateProfileRequest, ApplicationCreate, Application, SavedPlanCreate, SavedPlan, PublicUser
from auth_utils import get_current_user, normalize_phone, mask
from agent_assignment import pick_agent
from admin_auth import hash_password, verify_password
from constants import AppStatus
from db import users, applications, holiday_plans, db
from serializers import serialize_doc
import uuid

router = APIRouter(prefix='/users', tags=['users'])


@router.put('/me')
async def update_me(req: UpdateProfileRequest, user=Depends(get_current_user)):
    """Update the profile. A new email or phone is held as pending until the user
    proves they own it with a code (/me/contact/send-code, /me/contact/confirm):
    an unproven address must never be attached to the account."""
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    pending = {}
    if 'email' in update:
        email = update.pop('email').lower()
        if email != (user.get('email') or '').lower():
            pending['pending_email'] = email
    if 'phone' in update:
        phone = normalize_phone(update.pop('phone'))
        if phone != (user.get('phone') or ''):
            pending['pending_phone'] = phone
    for field, value in pending.items():
        kind = field.split('_')[1]
        if await users.find_one({kind: value, '_id': {'$ne': user['_id']}}):
            raise HTTPException(409, f'That {kind} is already linked to another account.')
    update.update(pending)
    update['updated_at'] = datetime.utcnow()
    await users.update_one({'_id': user['_id']}, {'$set': update})
    fresh = await users.find_one({'_id': user['_id']})
    return {
        'id': fresh['_id'],
        'name': fresh.get('name'),
        'email': fresh.get('email'),
        'phone': fresh.get('phone'),
        'pending_email': fresh.get('pending_email'),
        'pending_phone': fresh.get('pending_phone'),
    }


class ContactCodeRequest(BaseModel):
    kind: Literal['email', 'phone']


class ContactConfirmRequest(BaseModel):
    kind: Literal['email', 'phone']
    code: str


@router.post('/me/contact/send-code')
async def send_contact_code(req: ContactCodeRequest, user=Depends(get_current_user)):
    """Send a code to the pending email/phone so the user can prove they own it."""
    import os
    from config import IS_DEV
    from otp_service import generate_otp, store_otp, check_rate_limit, increment_resend
    target = user.get(f'pending_{req.kind}')
    if not target:
        raise HTTPException(400, f'No new {req.kind} to verify.')
    error = await check_rate_limit(target)
    if error:
        raise HTTPException(429, error)
    mode = os.environ.get('OTP_CHANNEL', 'mock' if IS_DEV else '')
    if not mode or (mode == 'mock' and not IS_DEV):
        raise HTTPException(503, 'OTP service not configured')
    code = os.environ.get('MOCK_OTP_CODE', '123456') if mode == 'mock' else generate_otp()
    await store_otp(target, req.kind, code, purpose='contact_change')
    await increment_resend(target, req.kind)
    if mode != 'mock':
        from otp_providers import deliver_otp
        delivered, _, _ = await deliver_otp(target, req.kind, code)
        if not delivered:
            raise HTTPException(400, 'Could not send the code. Try again later.')
    return {'sent': True, 'masked': mask(target), 'dev_code': code if mode == 'mock' else None}


@router.post('/me/contact/confirm')
async def confirm_contact(req: ContactConfirmRequest, user=Depends(get_current_user)):
    from otp_service import consume_otp
    target = user.get(f'pending_{req.kind}')
    if not target:
        raise HTTPException(400, f'No new {req.kind} to verify.')
    result = await consume_otp(target, req.code.strip(), req.kind)
    if not result['ok']:
        raise HTTPException(400, result['error'])
    now = datetime.utcnow()
    try:
        await users.update_one({'_id': user['_id']}, {
            '$set': {req.kind: target, f'{req.kind}_verified': True, 'updated_at': now},
            '$unset': {f'pending_{req.kind}': ''}})
    except DuplicateKeyError:
        raise HTTPException(409, f'That {req.kind} is already linked to another account.')
    return {'ok': True, req.kind: target}


@router.post('/me/applications')
async def create_application(req: ApplicationCreate, user=Depends(get_current_user)):
    now = datetime.utcnow()
    primary = req.primary_applicant.model_dump() if req.primary_applicant else None

    agent_id = await pick_agent(db)

    app = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'agent_id': agent_id,
        'applicant_name': user.get('name') or (primary.get('full_name') if primary else ''),
        'country_id': req.country_id,
        'visa_type': req.visa_type,
        'travel_date': req.travel_date,
        'applicants': max(1, int(req.applicants or 1)),
        'primary_applicant': primary,
        'status': AppStatus.DRAFT.value,
        'notes': req.notes,
        'documents': [],
        'messages': [],
        'timeline': [
            {'id': str(uuid.uuid4()), 'status': AppStatus.DRAFT.value, 'label': 'Draft created', 'at': now,
             'note': f'{req.country_id.upper()} {req.visa_type} application opened. Upload your documents to continue.'},
        ],
        'created_at': now,
        'updated_at': now,
    }
    await applications.insert_one(app)
    if agent_id:
        await db.agents.update_one({'_id': agent_id}, {'$inc': {'applications_count': 1}})
    return serialize_doc(app)


@router.get('/me/applications')
async def list_applications(user=Depends(get_current_user)):
    cur = applications.find({'user_id': user['_id']}).sort('created_at', -1)
    return [serialize_doc(d) async for d in cur]


@router.post('/me/saved-plans')
async def save_plan(req: SavedPlanCreate, user=Depends(get_current_user)):
    rec = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'country_id': req.country_id,
        'duration_days': req.duration_days,
        'travel_date': req.travel_date,
        'created_at': datetime.utcnow(),
    }
    await holiday_plans.insert_one(rec)
    return serialize_doc(rec)


@router.get('/me/saved-plans')
async def list_saved_plans(user=Depends(get_current_user)):
    cur = holiday_plans.find({'user_id': user['_id']}).sort('created_at', -1)
    return [serialize_doc(d) async for d in cur]


# Premium is granted only by a verified payment (routes_payments.py) or an admin.
@router.post('/me/downgrade')
async def downgrade_from_premium(user=Depends(get_current_user)):
    now = datetime.utcnow()
    await users.update_one(
        {'_id': user['_id']},
        {'$set': {'is_premium': False, 'updated_at': now}, '$unset': {'premium_since': ''}},
    )
    return {'ok': True, 'is_premium': False}


# ---------- Password management ----------

class SetPasswordRequest(BaseModel):
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _validate_password_strength(pw: str):
    if len(pw) < 8:
        raise HTTPException(400, 'Password must be at least 8 characters.')
    if not any(c.isdigit() for c in pw):
        raise HTTPException(400, 'Password must contain at least one digit.')
    if not any(c.isupper() for c in pw):
        raise HTTPException(400, 'Password must contain at least one uppercase letter.')


@router.post('/me/set-password')
async def set_password(req: SetPasswordRequest, user=Depends(get_current_user)):
    """Set a password for users who signed up via OTP/OAuth and don't have one yet."""
    if user.get('password_hash'):
        raise HTTPException(409, 'Password already set. Use change-password instead.')
    _validate_password_strength(req.new_password)
    hashed = hash_password(req.new_password)
    await users.update_one(
        {'_id': user['_id']},
        {'$set': {'password_hash': hashed, 'updated_at': datetime.utcnow()}},
    )
    return {'ok': True}


@router.post('/me/change-password')
async def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    """Change password — requires current password for verification."""
    if not user.get('password_hash'):
        raise HTTPException(400, 'No password set. Use set-password first.')
    if not verify_password(req.current_password, user['password_hash']):
        raise HTTPException(401, 'Current password is incorrect.')
    _validate_password_strength(req.new_password)
    if req.current_password == req.new_password:
        raise HTTPException(400, 'New password must be different from the current password.')
    hashed = hash_password(req.new_password)
    await users.update_one(
        {'_id': user['_id']},
        {'$set': {'password_hash': hashed, 'updated_at': datetime.utcnow()}},
    )
    return {'ok': True}
