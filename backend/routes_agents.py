"""Agent portal routes — authentication, dashboard, student management."""
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File, Form, Header
import os
from pydantic import BaseModel
from auth_utils import decode_jwt, create_access_token, verify_password, hash_password
from admin_auth import get_current_admin_flex
from db import db
from config import SECRET_KEY, ACCESS_TOKEN_EXPIRE

router = APIRouter(prefix='/agent', tags=['agent'])


class AgentSignupRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    agency_name: Optional[str] = None

class AgentLoginRequest(BaseModel):
    email: str
    password: str

class AgentSendOTPRequest(BaseModel):
    phone: str

class AgentVerifyOTPRequest(BaseModel):
    phone: str
    otp: str


async def get_current_agent(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(401, 'Invalid agent credentials')
    token = authorization.split(' ', 1)[1].strip()
    payload = decode_jwt(token)
    email = payload.get('sub')
    if not email:
        raise HTTPException(401, 'Invalid agent credentials')
    agent = await db.agents.find_one({'email': email})
    if not agent:
        raise HTTPException(401, 'Invalid agent credentials')
    return agent


@router.post('/signup')
async def agent_signup(req: AgentSignupRequest):
    existing = await db.agents.find_one({'$or': [{'email': req.email}, {'phone': req.phone}]})
    if existing:
        raise HTTPException(400, 'Agent already exists with this email or phone')
    agent = {
        '_id': str(uuid.uuid4()),
        'name': req.name,
        'email': req.email,
        'phone': req.phone,
        'password': hash_password(req.password),
        'agency_name': req.agency_name or '',
        'role': 'agent',
        'status': 'active',
        'commission_rate': 10,
        'students_count': 0,
        'applications_count': 0,
        'total_revenue': 0,
        'verified': False,
        'blacklisted': False,
        'fine': 0,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    await db.agents.insert_one(agent)
    token = create_access_token({'sub': agent['email'], 'role': 'agent'})
    return {'token': token, 'agent': {k: v for k, v in agent.items() if k != 'password'}}


@router.post('/login')
async def agent_login(req: AgentLoginRequest):
    agent = await db.agents.find_one({'email': req.email})
    if not agent or not verify_password(req.password, agent['password']):
        raise HTTPException(401, 'Invalid email or password')
    if agent.get('blacklisted'):
        raise HTTPException(403, 'Account is suspended')
    token = create_access_token({'sub': agent['email'], 'role': 'agent'})
    return {'token': token, 'agent': {k: v for k, v in agent.items() if k != 'password'}}


@router.post('/send-otp')
async def agent_send_otp(req: AgentSendOTPRequest):
    from config import IS_DEV
    if not IS_DEV:
        # No SMS provider is wired for agents; never hand the code back in production.
        raise HTTPException(503, 'OTP service not configured')
    otp = f'{secrets.randbelow(10**6):06d}'
    await db.agent_otps.update_one(
        {'phone': req.phone},
        {'$set': {'otp': otp, 'expires_at': datetime.utcnow() + timedelta(minutes=5)}},
        upsert=True,
    )
    return {'message': 'OTP sent', 'otp': otp}


@router.post('/verify-otp')
async def agent_verify_otp(req: AgentVerifyOTPRequest):
    record = await db.agent_otps.find_one({'phone': req.phone, 'otp': req.otp})
    if not record or record['expires_at'] < datetime.utcnow():
        raise HTTPException(400, 'Invalid or expired OTP')
    await db.agent_otps.delete_one({'_id': record['_id']})
    return {'verified': True}


@router.get('/dashboard')
async def agent_dashboard(agent=Depends(get_current_agent)):
    students = await db.agent_students.find({'agent_id': agent['_id']}).to_list(999)
    applications = await db.applications.find({'agent_id': agent['_id']}).to_list(999)
    upcoming = [a for a in applications if a.get('visa_appointment') and a['visa_appointment'] >= datetime.utcnow()]
    return {
        'stats': {
            'total_students': len(students),
            'total_applications': len(applications),
            'pending_applications': len([a for a in applications if a.get('status') == 'draft']),
            'approved_applications': len([a for a in applications if a.get('status') == 'approved']),
            'upcoming_appointments': len(upcoming),
            'total_revenue': agent.get('total_revenue', 0),
            'commission_rate': agent.get('commission_rate', 10),
        },
        'recent_applications': sorted(applications, key=lambda a: a.get('created_at', ''), reverse=True)[:10],
        'recent_students': sorted(students, key=lambda s: s.get('created_at', ''), reverse=True)[:10],
    }


@router.get('/students')
async def agent_students(
    search: Optional[str] = None,
    agent=Depends(get_current_agent),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    query = {'agent_id': agent['_id']}
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
        ]
    total = await db.agent_students.count_documents(query)
    students = await db.agent_students.find(query).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    return {'items': students, 'total': total, 'limit': limit, 'skip': skip}


@router.post('/students')
async def add_student(data: dict = Body(...), agent=Depends(get_current_agent)):
    student = {
        '_id': str(uuid.uuid4()),
        'agent_id': agent['_id'],
        'name': data.get('name', ''),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'country': data.get('country', ''),
        'course': data.get('course', ''),
        'education_level': data.get('education_level', ''),
        'notes': data.get('notes', ''),
        'status': 'active',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    await db.agent_students.insert_one(student)
    await db.agents.update_one({'_id': agent['_id']}, {'$inc': {'students_count': 1}})
    return student


@router.get('/applications')
async def agent_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    agent=Depends(get_current_agent),
):
    query = {'agent_id': agent['_id']}
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'applicant_name': {'$regex': search, '$options': 'i'}},
            {'application_id': {'$regex': search, '$options': 'i'}},
        ]
    apps = await db.applications.find(query).sort('created_at', -1).to_list(999)
    result = []
    for a in apps:
        user_info = None
        if a.get('user_id'):
            u = await db.users.find_one({'_id': a['user_id']}, {'name': 1, 'email': 1, 'phone': 1})
            if u:
                user_info = {'name': u.get('name', ''), 'email': u.get('email', ''), 'phone': u.get('phone', '')}
            else:
                user_info = a.get('primary_applicant')
        a['applicant'] = user_info or a.get('primary_applicant', {})
        result.append(a)
    return result


@router.get('/applications/{application_id}')
async def agent_application_detail(
    application_id: str,
    agent=Depends(get_current_agent),
):
    app = await db.applications.find_one({'_id': application_id, 'agent_id': agent['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')
    user_info = None
    if app.get('user_id'):
        u = await db.users.find_one({'_id': app['user_id']}, {'name': 1, 'email': 1, 'phone': 1})
        if u:
            user_info = {'name': u.get('name', ''), 'email': u.get('email', ''), 'phone': u.get('phone', '')}
    app['applicant'] = user_info or app.get('primary_applicant', {})
    return app


@router.post('/applications/transfer')
async def transfer_application(
    data: dict = Body(...),
    agent=Depends(get_current_agent),
):
    app_id = data.get('application_id')
    target_agent_id = data.get('target_agent_id')
    app = await db.applications.find_one({'_id': app_id, 'agent_id': agent['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')
    await db.applications.update_one(
        {'_id': app_id},
        {'$set': {'agent_id': target_agent_id, 'transferred_at': datetime.utcnow()}},
    )
    return {'message': 'Application transferred'}


@router.get('/students/{student_id}/documents')
async def list_student_documents(student_id: str, agent=Depends(get_current_agent)):
    student = await db.agent_students.find_one({'_id': student_id, 'agent_id': agent['_id']})
    if not student:
        raise HTTPException(404, 'Student not found')
    docs = await db.agent_documents.find({'student_id': student_id}).sort('uploaded_at', -1).to_list(100)
    return docs


@router.post('/students/{student_id}/documents')
async def upload_student_document(
    student_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form('Other'),
    note: str = Form(''),
    agent=Depends(get_current_agent),
):
    student = await db.agent_students.find_one({'_id': student_id, 'agent_id': agent['_id']})
    if not student:
        raise HTTPException(404, 'Student not found')
    content = await file.read()
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'agent_docs')
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, 'wb') as f:
        f.write(content)
    doc = {
        '_id': str(uuid.uuid4()),
        'student_id': student_id,
        'agent_id': agent['_id'],
        'doc_type': doc_type,
        'note': note,
        'filename': file.filename,
        'stored_filename': filename,
        'status': 'pending',
        'uploaded_at': datetime.utcnow(),
    }
    await db.agent_documents.insert_one(doc)
    return doc


@router.get('/settings')
async def agent_settings(agent=Depends(get_current_agent)):
    return {k: v for k, v in agent.items() if k not in ('password', '_id')}


@router.put('/settings')
async def update_agent_settings(data: dict = Body(...), agent=Depends(get_current_agent)):
    allowed = {'name', 'agency_name', 'phone'}
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        updates['updated_at'] = datetime.utcnow()
        await db.agents.update_one({'_id': agent['_id']}, {'$set': updates})
    return {'message': 'Settings updated'}


# ── Admin Endpoints ──────────────────────────────────────────────────────────

@router.get('/admin/agents')
async def admin_list_agents(
    status: Optional[str] = None,
    _admin=Depends(get_current_admin_flex),
):
    query = {}
    if status:
        query['status'] = status
    agents = await db.agents.find(query, {'password': 0}).sort('created_at', -1).to_list(500)
    for a in agents:
        a['id'] = str(a.get('_id', ''))
    return agents


@router.patch('/admin/agents/{agent_id}')
async def admin_update_agent(
    agent_id: str,
    data: dict = Body(...),
    _admin=Depends(get_current_admin_flex),
):
    allowed = {'status', 'tier', 'commission_rate', 'verified', 'blacklisted', 'fine', 'specializations'}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(400, 'No valid fields to update')
    updates['updated_at'] = datetime.utcnow()
    result = await db.agents.update_one({'_id': agent_id}, {'$set': updates})
    if result.matched_count == 0:
        raise HTTPException(404, 'Agent not found')
    return {'message': 'Agent updated'}


@router.post('/admin/agents/{agent_id}/commissions')
async def admin_record_commission(
    agent_id: str,
    data: dict = Body(...),
    _admin=Depends(get_current_admin_flex),
):
    commission = {
        '_id': str(uuid.uuid4()),
        'agent_id': agent_id,
        'university_name': data.get('university_name', ''),
        'amount_inr': int(data.get('amount_inr', 0)),
        'commission_type': data.get('commission_type', 'enrollment'),
        'note': data.get('note', ''),
        'recorded_at': datetime.utcnow(),
    }
    await db.agent_commissions.insert_one(commission)
    await db.agents.update_one(
        {'_id': agent_id},
        {'$inc': {'total_revenue': commission['amount_inr']}, '$set': {'updated_at': datetime.utcnow()}},
    )
    return {'message': 'Commission recorded', 'commission': commission}


# ---------- Agent Portal AI Assistant ---------- #

@router.get('/ai/students-needing-attention')
async def ai_students_attention(agent=Depends(get_current_agent)):
    """AI: find students who need agent attention."""
    from agents.portal_ai import get_students_needing_attention
    students = await get_students_needing_attention(db, agent['_id'])
    return {'students': students, 'count': len(students)}


@router.get('/ai/commission-summary')
async def ai_commission_summary(agent=Depends(get_current_agent)):
    """AI: get commission summary and forecasts."""
    from agents.portal_ai import get_commission_summary
    summary = await get_commission_summary(db, agent['_id'])
    return summary


class StatusUpdateRequest(BaseModel):
    student_email: str


@router.post('/ai/status-update')
async def ai_status_update(req: StatusUpdateRequest, agent=Depends(get_current_agent)):
    """AI: generate a natural-language status update for a student."""
    from agents.portal_ai import generate_status_update
    update = await generate_status_update(db, agent['_id'], req.student_email)
    return {'update': update}


@router.get('/ai/next-actions')
async def ai_next_actions(agent=Depends(get_current_agent)):
    """AI: suggest next actions for the agent's students."""
    from agents.portal_ai import suggest_next_actions
    actions = await suggest_next_actions(db, agent['_id'])
    return {'actions': actions, 'count': len(actions)}
