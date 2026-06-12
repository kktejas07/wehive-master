from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import List

from models import UniversityApplicationCreate, PrimaryApplicant
from auth_utils import get_current_user
from db import db, applications, universities_col
from fee_calculator import compute_multi_university_fees
from serializers import serialize_doc
import uuid

router = APIRouter(prefix='/users/me', tags=['university-applications'])

UNIVERSITY_APPS_COUNT_KEY = 'university_applications_count'


@router.post('/applications/universities')
async def create_university_application(
    req: UniversityApplicationCreate,
    user=Depends(get_current_user),
):
    now = datetime.utcnow()
    primary = req.primary_applicant.model_dump() if req.primary_applicant else None

    uni_ids = list(dict.fromkeys([u.strip().lower() for u in req.university_ids if u.strip()]))
    if not uni_ids:
        raise HTTPException(400, 'At least one university is required')
    if len(uni_ids) > 20:
        raise HTTPException(400, 'Maximum 20 universities per application')

    unis = []
    for uid in uni_ids:
        doc = await universities_col.find_one({'id': uid}, {'_id': 0, 'name': 1, 'short_name': 1, 'country': 1, 'country_name': 1, 'flag': 1})
        if not doc:
            raise HTTPException(400, f'University not found: {uid}')
        unis.append(doc)

    fees = compute_multi_university_fees(len(uni_ids))

    agents = await db.agents.find({'status': 'active'}).to_list(100)
    agent_id = None
    if agents:
        agent_counts = []
        for a in agents:
            count = await db.applications.count_documents({'agent_id': a['_id']})
            agent_counts.append((a['_id'], count))
        agent_counts.sort(key=lambda x: x[1])
        agent_id = agent_counts[0][0] if agent_counts else None

    uni_names = [u['name'] for u in unis]

    app = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'agent_id': agent_id,
        'type': 'university',
        'applicant_name': user.get('name') or (primary.get('full_name') if primary else ''),
        'country_id': req.country_id,
        'visa_type': req.visa_type,
        'travel_date': req.travel_date,
        'applicants': 1,
        'primary_applicant': primary,
        'university_ids': uni_ids,
        'universities': unis,
        'university_count': len(uni_ids),
        'status': 'draft',
        'fees': fees,
        'documents': [],
        'messages': [],
        'timeline': [
            {
                'id': str(uuid.uuid4()),
                'status': 'draft',
                'label': 'Multi-university application created',
                'at': now,
                'note': f'Application for {len(uni_ids)} universit{"y" if len(uni_ids) == 1 else "ies"}: {", ".join(uni_names)}',
            },
        ],
        'created_at': now,
        'updated_at': now,
    }
    await applications.insert_one(app)
    if agent_id:
        await db.agents.update_one({'_id': agent_id}, {'$inc': {'applications_count': 1}})
    return serialize_doc(app)


@router.get('/applications/universities')
async def list_university_applications(user=Depends(get_current_user)):
    cur = applications.find({'user_id': user['_id'], 'type': 'university'}).sort('created_at', -1)
    return [serialize_doc(d) async for d in cur]
