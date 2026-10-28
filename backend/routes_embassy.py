"""Embassy fee lookup and appointment booking."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth_utils import get_current_user
from db import applications

router = APIRouter(tags=['embassy'])

EMBASSY_FEES = [
    {
        'id': 'us_f1',
        'country': 'United States',
        'visa_type': 'F-1 Student',
        'currency': 'USD',
        'fees': [
            {'name': 'MRV Application Fee', 'amount': 185, 'required': True, 'note': 'Non-refundable visa application fee'},
            {'name': 'SEVIS Fee (I-901)', 'amount': 350, 'required': True, 'note': 'Student and Exchange Visitor Fee'},
        ],
        'total': 535,
        'booking_url': 'https://ais.usvisa-info.com',
        'notes': 'Book your appointment at the nearest US Embassy or Consulate.',
    },
    {
        'id': 'us_b1b2',
        'country': 'United States',
        'visa_type': 'B-1/B-2 Tourist/Business',
        'currency': 'USD',
        'fees': [
            {'name': 'MRV Application Fee', 'amount': 185, 'required': True, 'note': 'Non-refundable'},
        ],
        'total': 185,
        'booking_url': 'https://ais.usvisa-info.com',
        'notes': 'Book your appointment online.',
    },
    {
        'id': 'uk_student',
        'country': 'United Kingdom',
        'visa_type': 'Student Visa',
        'currency': 'GBP',
        'fees': [
            {'name': 'Visa Application Fee', 'amount': 363, 'required': True, 'note': 'For applications outside the UK'},
            {'name': 'Immigration Health Surcharge', 'amount': 776, 'required': True, 'note': 'Per year of study (£776/yr)'},
            {'name': 'Biometric Enrollment', 'amount': 0, 'required': True, 'note': 'Included in application fee'},
        ],
        'total': 1139,
        'booking_url': 'https://www.gov.uk/apply-uk-visa',
        'notes': 'Apply online; biometrics at a UKVCAS service point.',
    },
    {
        'id': 'ca_study',
        'country': 'Canada',
        'visa_type': 'Study Permit',
        'currency': 'CAD',
        'fees': [
            {'name': 'Study Permit Application Fee', 'amount': 150, 'required': True, 'note': 'Per applicant'},
            {'name': 'Biometrics Fee', 'amount': 85, 'required': True, 'note': 'Required for most nationalities'},
        ],
        'total': 235,
        'booking_url': 'https://ircc.canada.ca/english/information/applications/visa.asp',
        'notes': 'Apply online via the IRCC portal.',
    },
    {
        'id': 'schengen_tourist',
        'country': 'Schengen Area',
        'visa_type': 'Short-Stay Tourist',
        'currency': 'EUR',
        'fees': [
            {'name': 'Visa Application Fee', 'amount': 80, 'required': True, 'note': 'Standard Schengen short-stay fee'},
            {'name': 'VFS Service Charge', 'amount': 24, 'required': True, 'note': 'VFS Global service fee'},
        ],
        'total': 104,
        'booking_url': 'https://www.vfsglobal.com',
        'notes': 'Apply at the embassy of your primary destination country.',
    },
]


@router.get('/embassy-fees')
async def list_embassy_fees(country: Optional[str] = None, visa_type: Optional[str] = None):
    result = EMBASSY_FEES
    if country:
        result = [f for f in result if country.lower() in f['country'].lower()]
    if visa_type:
        result = [f for f in result if visa_type.lower() in f['visa_type'].lower()]
    return result


class _AppointmentBody(BaseModel):
    date: str = Field(..., description='ISO date YYYY-MM-DD')
    time: str = Field(default='', description='HH:MM')
    location: str = Field(..., min_length=1, max_length=200)
    reference_number: str = Field(default='', max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


@router.patch('/users/me/applications/{application_id}/appointment')
async def save_appointment(
    application_id: str,
    payload: _AppointmentBody,
    user=Depends(get_current_user),
):
    app = await applications.find_one({'_id': application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    appt = {
        'date': payload.date,
        'time': payload.time,
        'location': payload.location,
        'reference_number': payload.reference_number,
        'notes': payload.notes,
        'booked_at': datetime.utcnow(),
    }
    await applications.update_one(
        {'_id': application_id},
        {'$set': {'visa_appointment': appt, 'updated_at': datetime.utcnow()}},
    )
    return {'ok': True, 'appointment': appt}
