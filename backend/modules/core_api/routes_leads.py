from fastapi import APIRouter
from datetime import datetime
import uuid
from core.models import LeadCreate
from core.db import leads

router = APIRouter(prefix='/leads', tags=['leads'])


@router.post('')
async def create_lead(req: LeadCreate):
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
