"""Visa appointment scheduling routes."""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from auth_utils import get_current_user, get_current_user_optional
from admin_auth import get_current_admin_flex
from db import db

router = APIRouter(prefix='/visa-scheduling', tags=['visa-scheduling'])


class AppointmentSlot(BaseModel):
    date: str
    time_slots: List[str]


class BookAppointmentRequest(BaseModel):
    application_id: str
    slot_id: str
    date: str
    time: str
    embassy: str
    city: str


@router.get('/slots/{country_id}')
async def get_available_slots(country_id: str, date: Optional[str] = None):
    query = {'country_id': country_id, 'booked': False}
    if date:
        query['date'] = {'$gte': date}
    slots = await db.visa_slots.find(query).sort('date', 1).to_list(50)
    return slots


@router.post('/slots/generate')
async def generate_slots(data: dict = Body(...), _admin=Depends(get_current_admin_flex)):
    country_id = data.get('country_id')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    days = data.get('days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    times = data.get('times', ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'])
    embassy = data.get('embassy', '')

    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    DAY_MAP = {0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday'}
    
    created = 0
    current = start
    while current <= end:
        if DAY_MAP[current.weekday()] in days:
            for t in times:
                slot = {
                    '_id': str(uuid.uuid4()),
                    'country_id': country_id,
                    'embassy': embassy,
                    'date': current.strftime('%Y-%m-%d'),
                    'time': t,
                    'day': DAY_MAP[current.weekday()],
                    'booked': False,
                    'created_at': datetime.utcnow(),
                }
                await db.visa_slots.insert_one(slot)
                created += 1
        current += timedelta(days=1)
    
    return {'message': f'{created} slots generated', 'count': created}


@router.post('/book')
async def book_appointment(
    req: BookAppointmentRequest,
    user=Depends(get_current_user),
):
    app = await db.applications.find_one({'_id': req.application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    slot = await db.visa_slots.find_one({
        '_id': req.slot_id,
        'date': req.date,
        'time': req.time,
        'booked': False,
    })
    if not slot:
        raise HTTPException(400, 'Slot not available')

    await db.visa_slots.update_one({'_id': req.slot_id}, {'$set': {'booked': True, 'booked_by': user['_id'], 'application_id': req.application_id, 'booked_at': datetime.utcnow()}})
    await db.applications.update_one({'_id': req.application_id}, {'$set': {
        'visa_appointment': {'date': req.date, 'time': req.time, 'embassy': req.embassy, 'city': req.city, 'slot_id': req.slot_id},
        'status': 'appointment_scheduled',
        'updated_at': datetime.utcnow(),
    }})
    from routes_chatbot import notify_status_change
    await notify_status_change(user['_id'], req.application_id, 'appointment_scheduled')
    return {'message': 'Appointment booked', 'slot': {**slot, 'booked': True}}


@router.get('/my-appointments')
async def my_appointments(user=Depends(get_current_user)):
    apps = await db.applications.find({
        'user_id': user['_id'],
        'visa_appointment': {'$exists': True},
    }).to_list(50)
    return [{'application_id': a['_id'], 'country': a.get('country_name', ''), 'visa_type': a.get('visa_type', ''), **a.get('visa_appointment', {})} for a in apps]


@router.get('/embassies/{country_id}')
async def get_embassies(country_id: str):
    embassies = [
        {'id': 'delhi', 'name': 'New Delhi', 'address': f'{country_id.upper()} Embassy, Chanakyapuri, New Delhi'},
        {'id': 'mumbai', 'name': 'Mumbai', 'address': f'{country_id.upper()} Consulate, Mumbai'},
        {'id': 'kolkata', 'name': 'Kolkata', 'address': f'{country_id.upper()} Consulate, Kolkata'},
        {'id': 'chennai', 'name': 'Chennai', 'address': f'{country_id.upper()} Consulate, Chennai'},
        {'id': 'bangalore', 'name': 'Bangalore', 'address': f'{country_id.upper()} Consulate, Bangalore'},
        {'id': 'hyderabad', 'name': 'Hyderabad', 'address': f'{country_id.upper()} Consulate, Hyderabad'},
    ]
    return embassies


@router.get('/preparation/{country_id}')
async def get_interview_preparation(country_id: str):
    from data import get_country
    country = get_country(country_id)
    prep = {
        'country': country.get('name', country_id.upper()) if country else country_id.upper(),
        'flag': country.get('flag', '') if country else '',
        'common_questions': [
            'What is the purpose of your visit?',
            'How long do you plan to stay?',
            'Where will you be staying?',
            'Who is sponsoring your trip?',
            'What is your occupation?',
            'Have you traveled abroad before?',
            'Do you have family in this country?',
            'What ties do you have to your home country?',
        ],
        'required_documents': country.get('categories', {}).get('Tourist', {}).get('documents', []) if country else [],
        'tips': [
            'Dress formally',
            'Answer confidently and truthfully',
            'Carry all original documents',
            'Arrive 30 minutes early',
            'Do not use your phone inside the embassy',
            'Be prepared to show financial proof',
        ],
        'average_duration_minutes': 15,
        'success_rate': '85-90% for well-prepared applicants',
    }
    if country and country.get('student_meta'):
        prep['student_specific'] = country['student_meta']
    return prep
