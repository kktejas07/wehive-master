from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from models import UpdateProfileRequest, ApplicationCreate, Application, SavedPlanCreate, SavedPlan, PublicUser
from auth_utils import get_current_user
from db import users, applications, holiday_plans
import uuid

router = APIRouter(prefix='/users', tags=['users'])


@router.put('/me')
async def update_me(req: UpdateProfileRequest, user=Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, 'Nothing to update')
    update['updated_at'] = datetime.utcnow()
    await users.update_one({'_id': user['_id']}, {'$set': update})
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
    app = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'country_id': req.country_id,
        'visa_type': req.visa_type,
        'travel_date': req.travel_date,
        'applicants': max(1, int(req.applicants or 1)),
        'primary_applicant': primary,
        'status': 'draft',
        'notes': req.notes,
        'documents': [],
        'messages': [],
        'timeline': [
            {'id': str(uuid.uuid4()), 'status': 'draft', 'label': 'Draft created', 'at': now,
             'note': f'{req.country_id.upper()} {req.visa_type} application opened. Upload your documents to continue.'},
        ],
        'created_at': now,
        'updated_at': now,
    }
    await applications.insert_one(app)
    return _serialize(app)


@router.get('/me/applications')
async def list_applications(user=Depends(get_current_user)):
    cur = applications.find({'user_id': user['_id']}).sort('created_at', -1)
    return [_serialize(d) async for d in cur]


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
    return _serialize(rec)


@router.get('/me/saved-plans')
async def list_saved_plans(user=Depends(get_current_user)):
    cur = holiday_plans.find({'user_id': user['_id']}).sort('created_at', -1)
    return [_serialize(d) async for d in cur]


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


def _serialize(d: dict) -> dict:
    out = dict(d)
    out['id'] = out.pop('_id')
    if 'created_at' in out and hasattr(out['created_at'], 'isoformat'):
        out['created_at'] = out['created_at'].isoformat()
    return out
