from fastapi import APIRouter, Depends
from rate_limit import RateLimit
from datetime import datetime
import uuid
from models import LeadCreate
from db import leads

router = APIRouter(prefix='/leads', tags=['leads'])


_lead_limiter = RateLimit(max_calls=5, window_seconds=600)


@router.post('')
async def create_lead(req: LeadCreate, _=Depends(_lead_limiter)):
    rec = {
        '_id': str(uuid.uuid4()),
        'name': req.name,
        'surname': req.surname or '',
        'email': req.email,
        'message': req.message,
        'created_at': datetime.utcnow(),
    }
    await leads.insert_one(rec)
    return {'id': rec['_id'], 'ok': True}
