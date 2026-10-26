"""Visa document requirements & per-application checklist."""
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from db import applications

router = APIRouter(tags=['visa-requirements'])

VISA_DOC_REQUIREMENTS = [
    {
        'id': 'us_f1',
        'country': 'United States',
        'visa_type': 'F-1 Student',
        'docs': [
            {'id': 'd1', 'name': 'Valid Passport', 'required': True, 'note': 'Must be valid 6 months beyond intended stay'},
            {'id': 'd2', 'name': 'I-20 Form', 'required': True, 'note': 'Issued by your US university'},
            {'id': 'd3', 'name': 'DS-160 Confirmation', 'required': True, 'note': 'Online non-immigrant visa application'},
            {'id': 'd4', 'name': 'SEVIS Fee Receipt', 'required': True, 'note': 'I-901 SEVIS fee payment ($350)'},
            {'id': 'd5', 'name': 'Bank Statements', 'required': True, 'note': '3 months showing sufficient funds'},
            {'id': 'd6', 'name': 'Admission Letter', 'required': True, 'note': 'University acceptance letter'},
            {'id': 'd7', 'name': 'Passport Photos', 'required': True, 'note': '2 x 2 inch, white background'},
            {'id': 'd8', 'name': 'Academic Transcripts', 'required': False, 'note': 'Previous school records'},
            {'id': 'd9', 'name': 'Test Scores (TOEFL/IELTS/GRE)', 'required': False, 'note': 'As required by university'},
        ],
    },
    {
        'id': 'us_b1b2',
        'country': 'United States',
        'visa_type': 'B-1/B-2 Tourist/Business',
        'docs': [
            {'id': 'd1', 'name': 'Valid Passport', 'required': True, 'note': 'Valid 6 months beyond intended stay'},
            {'id': 'd2', 'name': 'DS-160 Confirmation', 'required': True, 'note': 'Online non-immigrant visa application'},
            {'id': 'd3', 'name': 'Bank Statements', 'required': True, 'note': '3-6 months'},
            {'id': 'd4', 'name': 'Passport Photos', 'required': True, 'note': '2 x 2 inch, white background'},
            {'id': 'd5', 'name': 'Travel Itinerary', 'required': False, 'note': 'Flight and hotel bookings'},
            {'id': 'd6', 'name': 'Employment Proof', 'required': False, 'note': 'Employment letter or pay stubs'},
        ],
    },
    {
        'id': 'uk_student',
        'country': 'United Kingdom',
        'visa_type': 'Student Visa',
        'docs': [
            {'id': 'd1', 'name': 'Valid Passport', 'required': True, 'note': 'Must not be expired'},
            {'id': 'd2', 'name': 'CAS Number', 'required': True, 'note': 'Confirmation of Acceptance for Studies'},
            {'id': 'd3', 'name': 'Bank Statements', 'required': True, 'note': '28 consecutive days showing required funds'},
            {'id': 'd4', 'name': 'English Language Test', 'required': True, 'note': 'IELTS/TOEFL meeting CAS requirements'},
            {'id': 'd5', 'name': 'Academic Transcripts', 'required': True, 'note': 'Previous qualifications'},
            {'id': 'd6', 'name': 'Tuberculosis Test', 'required': False, 'note': 'Required for certain nationalities'},
        ],
    },
    {
        'id': 'ca_study',
        'country': 'Canada',
        'visa_type': 'Study Permit',
        'docs': [
            {'id': 'd1', 'name': 'Valid Passport', 'required': True, 'note': 'Valid for entire study period'},
            {'id': 'd2', 'name': 'Letter of Acceptance', 'required': True, 'note': 'From a Designated Learning Institution (DLI)'},
            {'id': 'd3', 'name': 'Bank Statements', 'required': True, 'note': 'Proof of funds for tuition + living expenses'},
            {'id': 'd4', 'name': 'Passport Photos', 'required': True, 'note': '35mm x 45mm, white background'},
            {'id': 'd5', 'name': 'English/French Proficiency', 'required': False, 'note': 'IELTS/TOEFL/TEF'},
            {'id': 'd6', 'name': 'Medical Examination', 'required': False, 'note': 'Required for stays over 6 months in certain countries'},
        ],
    },
    {
        'id': 'schengen_tourist',
        'country': 'Schengen Area',
        'visa_type': 'Short-Stay (Tourist/Business)',
        'docs': [
            {'id': 'd1', 'name': 'Valid Passport', 'required': True, 'note': 'Valid 3 months after departure + 2 blank pages'},
            {'id': 'd2', 'name': 'Visa Application Form', 'required': True, 'note': 'Completed and signed'},
            {'id': 'd3', 'name': 'Passport Photos', 'required': True, 'note': '35mm x 45mm, biometric'},
            {'id': 'd4', 'name': 'Travel Insurance', 'required': True, 'note': 'Min €30,000 coverage'},
            {'id': 'd5', 'name': 'Flight Itinerary', 'required': True, 'note': 'Round-trip booking'},
            {'id': 'd6', 'name': 'Hotel Reservations', 'required': True, 'note': 'Accommodation for entire stay'},
            {'id': 'd7', 'name': 'Bank Statements', 'required': True, 'note': '3 months, €50-100/day of stay'},
            {'id': 'd8', 'name': 'Employment/Income Proof', 'required': False, 'note': 'Leave approval letter'},
        ],
    },
]


@router.get('/visa-requirements')
async def list_visa_requirements():
    return VISA_DOC_REQUIREMENTS


@router.get('/users/me/applications/{application_id}/checklist')
async def application_checklist(application_id: str, user=Depends(get_current_user)):
    app = await applications.find_one({'_id': application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')

    country = (app.get('country_id') or app.get('country_name') or '').lower()
    visa_type = (app.get('visa_type') or '').lower()

    matched = None
    for req in VISA_DOC_REQUIREMENTS:
        rc = req['country'].lower().replace(' ', '')
        rv = req['visa_type'].lower()
        if country and rc in country.replace(' ', ''):
            matched = req
            break
        if visa_type and any(word in rv for word in visa_type.split()):
            matched = req
            break

    if not matched:
        matched = VISA_DOC_REQUIREMENTS[0]

    uploaded = {(d.get('doc_type') or '').lower() for d in app.get('documents', [])}
    filenames = {(d.get('filename') or '').lower() for d in app.get('documents', [])}

    items = []
    for doc in matched['docs']:
        name_lower = doc['name'].lower()
        first_word = name_lower.split()[0]
        uploaded_match = any(first_word in u or u in name_lower for u in (uploaded | filenames))
        items.append({**doc, 'uploaded': uploaded_match})

    return {
        'application_id': application_id,
        'requirements': matched,
        'items': items,
        'progress': {
            'total': len(items),
            'uploaded': sum(1 for i in items if i['uploaded']),
            'required_missing': sum(1 for i in items if i['required'] and not i['uploaded']),
        },
    }
