from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel

from models import UpdateProfileRequest, ApplicationCreate, Application, SavedPlanCreate, SavedPlan, PublicUser
from auth_utils import get_current_user
from admin_auth import hash_password, verify_password
from constants import AppStatus
from db import users, applications, holiday_plans, db
from serializers import serialize_doc
import uuid

router = APIRouter(prefix='/users', tags=['users'])


@router.put('/me')
async def update_me(req: UpdateProfileRequest, user=Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    update['updated_at'] = datetime.utcnow()
    try:
        await users.update_one({'_id': user['_id']}, {'$set': update})
    except DuplicateKeyError as e:
        field = 'email' if 'email' in str(e).lower() else 'phone'
        raise HTTPException(409, f'That {field} is already linked to another account.')
    fresh = await users.find_one({'_id': user['_id']})
    return {
        'id': fresh['_id'],
        'name': fresh.get('name'),
        'email': fresh.get('email'),
        'phone': fresh.get('phone'),
    }


@router.post('/me/applications')
async def create_application(req: ApplicationCreate, user=Depends(get_current_user)):
    now = datetime.utcnow()
    primary = req.primary_applicant.model_dump() if req.primary_applicant else None

    agents = await db.agents.find({'status': 'active'}).to_list(100)
    agent_id = None
    if agents:
        agent_counts = []
        for a in agents:
            count = await db.applications.count_documents({'agent_id': a['_id']})
            agent_counts.append((a['_id'], count))
        agent_counts.sort(key=lambda x: x[1])
        agent_id = agent_counts[0][0] if agent_counts else None

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


# ---------- Premium (demo: self-toggle, replace with Stripe checkout later) ----------
@router.post('/me/upgrade')
async def upgrade_to_premium(user=Depends(get_current_user)):
    """Flip the user's premium flag. Demo endpoint — in production this should
    be driven by a successful Stripe/Razorpay webhook rather than a direct call.
    """
    now = datetime.utcnow()
    await users.update_one(
        {'_id': user['_id']},
        {'$set': {'is_premium': True, 'premium_since': now, 'updated_at': now}},
    )
    return {'ok': True, 'is_premium': True, 'premium_since': now.isoformat()}


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
