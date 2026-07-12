from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from core.models import UniversityApplicationCreate, PrimaryApplicant
from core.auth_utils import get_current_user
from core.db import db, applications, universities_col
from shared.fee_calculator import compute_multi_university_fees
from core.serializers import serialize_doc
import uuid

router = APIRouter(prefix='/users/me', tags=['university-applications'])

programs_col = db['programs']
reviews_col = db['university_reviews']

UNIVERSITY_APP_STATUSES = ['draft', 'submitted', 'under_review', 'offered', 'accepted', 'rejected', 'enrolled']


@router.post('/applications/universities')
async def create_university_application(
    req: UniversityApplicationCreate,
    user=Depends(get_current_user),
):
    now = datetime.utcnow()
    primary = req.primary_applicant.model_dump() if req.primary_applicant else None

    if not req.universities:
        raise HTTPException(400, 'At least one university is required')
    if len(req.universities) > 20:
        raise HTTPException(400, 'Maximum 20 universities per application')

    uni_selections = []
    for sel in req.universities:
        doc = await universities_col.find_one(
            {'id': sel.university_id},
            {'_id': 0, 'name': 1, 'short_name': 1, 'country': 1, 'country_name': 1, 'flag': 1, 'rank': 1}
        )
        if not doc:
            raise HTTPException(400, f'University not found: {sel.university_id}')
        program = None
        if sel.program_id:
            program = await programs_col.find_one(
                {'id': sel.program_id, 'university_id': sel.university_id},
                {'_id': 0}
            )
        uni_selections.append({
            'university_id': sel.university_id,
            'program_id': sel.program_id,
            'program': program,
            'university': doc,
            'status': 'draft',
            'applied_at': None,
            'offered_at': None,
            'accepted_at': None,
            'deadline': None,
            'notes': '',
        })

    fees = compute_multi_university_fees(len(req.universities))

    agents = await db.agents.find({'status': 'active'}).to_list(100)
    agent_id = None
    if agents:
        agent_counts = []
        for a in agents:
            count = await db.applications.count_documents({'agent_id': a['_id']})
            agent_counts.append((a['_id'], count))
        agent_counts.sort(key=lambda x: x[1])
        agent_id = agent_counts[0][0] if agent_counts else None

    uni_names = [s['university']['name'] for s in uni_selections]

    app = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'agent_id': agent_id,
        'type': 'university',
        'applicant_name': user.get('name') or (primary.get('full_name') if primary else ''),
        'country_id': req.country_id,
        'visa_type': req.visa_type or 'Student',
        'travel_date': req.travel_date,
        'applicants': 1,
        'primary_applicant': primary,
        'university_selections': uni_selections,
        'university_count': len(req.universities),
        'status': 'draft',
        'fees': fees,
        'documents': [],
        'messages': [],
        'timeline': [
            {
                'id': str(uuid.uuid4()),
                'status': 'draft',
                'label': 'University application created',
                'at': now,
                'note': f'Application for {len(req.universities)} universit{"y" if len(req.universities) == 1 else "ies"}: {", ".join(uni_names)}',
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


# ── Update per-university status (offer accept/reject, enrollment) ──

class UniversityStatusUpdate(BaseModel):
    university_id: str
    status: str  # offered, accepted, rejected, enrolled
    deadline: Optional[str] = None
    notes: Optional[str] = None


@router.patch('/applications/universities/{app_id}/university-status')
async def update_university_status(
    app_id: str,
    body: UniversityStatusUpdate,
    user=Depends(get_current_user),
):
    if body.status not in UNIVERSITY_APP_STATUSES:
        raise HTTPException(400, f'Invalid status. Must be one of: {", ".join(UNIVERSITY_APP_STATUSES)}')

    app = await applications.find_one({'_id': app_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    selections = app.get('university_selections', [])
    idx = next((i for i, s in enumerate(selections) if s['university_id'] == body.university_id), None)
    if idx is None:
        raise HTTPException(404, 'University not found in this application')

    now = datetime.utcnow()
    update_fields = {
        f'university_selections.{idx}.status': body.status,
        f'university_selections.{idx}.updated_at': now,
    }
    if body.status == 'offered':
        update_fields[f'university_selections.{idx}.offered_at'] = now
    elif body.status == 'accepted':
        update_fields[f'university_selections.{idx}.accepted_at'] = now
    elif body.status == 'enrolled':
        update_fields[f'university_selections.{idx}.accepted_at'] = now

    if body.deadline:
        update_fields[f'university_selections.{idx}.deadline'] = body.deadline
    if body.notes:
        update_fields[f'university_selections.{idx}.notes'] = body.notes

    timeline_entry = {
        'id': str(uuid.uuid4()),
        'status': body.status,
        'label': f'University status: {body.status}',
        'at': now,
        'note': f'{selections[idx]["university"]["name"]}: {body.status}',
    }

    await applications.update_one(
        {'_id': app_id},
        {'$set': {**update_fields, 'updated_at': now}, '$push': {'timeline': timeline_entry}},
    )

    # ── Visa integration: when a student accepts an offer, auto-create visa app draft ──
    if body.status == 'accepted':
        uni_data = selections[idx]['university']
        existing_visa = await applications.find_one({
            'user_id': user['_id'],
            'type': 'student_visa',
            'university_id': body.university_id,
            'status': 'draft',
        })
        if not existing_visa:
            visa_app = {
                '_id': str(uuid.uuid4()),
                'user_id': user['_id'],
                'type': 'student_visa',
                'status': 'draft',
                'country_id': uni_data.get('country', '').lower(),
                'visa_type': 'Student',
                'university_id': body.university_id,
                'university_name': uni_data.get('name'),
                'university_app_id': app_id,
                'applicant_name': user.get('name') or '',
                'applicants': 1,
                'documents': [],
                'messages': [],
                'timeline': [
                    {
                        'id': str(uuid.uuid4()),
                        'status': 'draft',
                        'label': 'Visa application auto-created',
                        'at': now,
                        'note': f'Auto-generated after accepting offer from {uni_data.get("name")}',
                    },
                ],
                'created_at': now,
                'updated_at': now,
            }
            await applications.insert_one(visa_app)

    fresh = await applications.find_one({'_id': app_id})
    return serialize_doc(fresh)


# ── Get visa apps linked to university acceptances ──

@router.get('/visa-from-university')
async def list_visa_from_university_apps(user=Depends(get_current_user)):
    cur = applications.find(
        {'user_id': user['_id'], 'type': 'student_visa'}
    ).sort('created_at', -1)
    return [serialize_doc(doc) async for doc in cur]
