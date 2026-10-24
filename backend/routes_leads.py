import html
import logging
import re
import uuid
from datetime import date, datetime
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator

from auth_utils import normalize_phone
from config import SUPPORT_EMAIL
from db import leads
from models import LeadCreate
from rate_limit import RateLimit

logger = logging.getLogger('wehive.leads')

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


# ---------- landing-page visa enquiry ----------
PURPOSES = {
    'tourist': 'Tourist / visit',
    'business': 'Business',
    'student_f1': 'Student (F-1 / study)',
    'work': 'Work / employment',
    'family': 'Family / spouse visit',
    'immigration': 'Immigration / PR',
    'transit': 'Transit',
    'other': 'Something else',
}
Purpose = Literal['tourist', 'business', 'student_f1', 'work', 'family', 'immigration', 'transit', 'other']
# Keep in sync with BRANCHES in frontend/src/data/mock.js.
BRANCHES = {
    'miyapur': 'Miyapur, Hyderabad',
    'habsiguda': 'Habsiguda, Hyderabad',
    'manikonda': 'Manikonda, Hyderabad',
    'ballari': 'Ballari',
    'anantapur': 'Anantapur',
    'east-windsor': 'East Windsor, NJ, USA',
}
Branch = Literal['miyapur', 'habsiguda', 'manikonda', 'ballari', 'anantapur', 'east-windsor']
_PHONE = re.compile(r'^\+[1-9]\d{7,14}$')


class EnquiryCreate(BaseModel):
    purpose: Purpose
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    destination: str = Field(min_length=2, max_length=60)
    travel_date: Optional[date] = None
    travellers: int = Field(default=1, ge=1, le=20)
    message: Optional[str] = Field(default=None, max_length=1000)
    consent: bool
    source: str = Field(default='landing', max_length=40)
    branch: Optional[Branch] = None  # which WeHive location referred this enquiry
    website: Optional[str] = Field(default=None, max_length=200)  # honeypot: humans never see or fill it

    @field_validator('phone')
    @classmethod
    def _phone(cls, v):
        number = normalize_phone(v)
        if not _PHONE.match(number):
            raise ValueError('Enter a valid phone number with country code, e.g. +91 98765 43210')
        return number

    @field_validator('name', 'destination')
    @classmethod
    def _strip(cls, v):
        return ' '.join(v.split())

    @field_validator('travel_date')
    @classmethod
    def _future(cls, v):
        if v and v < date.today():
            raise ValueError('Travel date must be today or later')
        return v


def enquiry_message(e: EnquiryCreate) -> str:
    """One readable summary, so the existing leads inbox, search and CSV export all show it."""
    lines = [f'{PURPOSES[e.purpose]} visa enquiry for {e.destination}',
             f'Phone: {e.phone}', f'Travellers: {e.travellers}']
    if e.travel_date:
        lines.append(f'Travel date: {e.travel_date.isoformat()}')
    if e.branch:
        lines.append(f'Referred by location: {BRANCHES[e.branch]}')
    if e.message and e.message.strip():
        lines += ['', e.message.strip()]
    return '\n'.join(lines)


async def _ack_email(e: EnquiryCreate) -> None:
    from email_service import _wrap_html, send_email
    try:
        await send_email(
            to_email=e.email,
            subject='We got your visa enquiry',
            html_body=_wrap_html('Enquiry received', (
                '<tr><td style="padding:0 32px;text-align:left">'
                f'<p style="font-size:15px;color:#0B1240;margin:0 0 14px 0">Hi {html.escape(e.name.split()[0])},</p>'
                f'<p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 14px 0">Thanks for your '
                f'<b>{html.escape(PURPOSES[e.purpose].lower())}</b> visa enquiry for <b>{html.escape(e.destination)}</b>. '
                'A We Hive consultant will call or WhatsApp you within one working day.</p>'
                f'<p style="font-size:12px;color:#6B7399;margin:0">Questions? Reply to this email or write to {html.escape(SUPPORT_EMAIL)}.</p>'
                '</td></tr>')),
            text_body=f'Thanks for your visa enquiry for {e.destination}. A We Hive consultant will contact you within one working day.',
        )
    except Exception:
        logger.warning('Enquiry acknowledgement email failed')


@router.post('/enquiry', status_code=201)
async def create_enquiry(req: EnquiryCreate, bg: BackgroundTasks, _=Depends(_lead_limiter)):
    if not req.consent:
        raise HTTPException(400, 'Please agree to be contacted about your enquiry.')
    if req.website:  # bot filled the hidden field: pretend success, store nothing
        return {'ok': True, 'id': None}
    now = datetime.utcnow()
    rec = {
        '_id': str(uuid.uuid4()),
        'type': 'enquiry',
        'status': 'new',
        'name': req.name,
        'surname': '',
        'email': req.email.lower(),
        'phone': req.phone,
        'purpose': req.purpose,
        'destination': req.destination,
        'travel_date': req.travel_date.isoformat() if req.travel_date else None,
        'travellers': req.travellers,
        'message': enquiry_message(req),
        'source': req.source,
        'branch': req.branch,
        'consent_at': now,
        'created_at': now,
    }
    await leads.insert_one(rec)
    bg.add_task(_ack_email, req)
    return {'ok': True, 'id': rec['_id']}
