"""Newsletter subscriptions with double opt-in.

Flow: subscribe → confirmation email → confirm link → active.
An optional WhatsApp number is stored as an opt-in for WhatsApp updates.
Every email carries an unsubscribe link. Responses never reveal whether an
address is already on the list.
"""
import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field, field_validator

from admin_auth import get_current_admin_flex
from auth_utils import normalize_phone
from config import FRONTEND_URL, IS_DEV
from db import newsletter_col
from rate_limit import RateLimit

router = APIRouter(prefix='/newsletter', tags=['newsletter'])
logger = logging.getLogger('wehive.newsletter')

CONFIRM_TTL = timedelta(hours=48)
RESEND_COOLDOWN = timedelta(minutes=2)
GENERIC_OK = 'Check your inbox and click the link to confirm your subscription.'
E164 = re.compile(r'^\+[1-9]\d{7,14}$')

_subscribe_limiter = RateLimit(max_calls=5, window_seconds=60)
_token_limiter = RateLimit(max_calls=20, window_seconds=60)


class SubscribeRequest(BaseModel):
    email: EmailStr
    consent: bool = Field(..., description='User agreed to receive updates')
    whatsapp: Optional[str] = Field(None, max_length=20, description='Optional WhatsApp number for updates')
    source: str = Field('website', max_length=40)

    @field_validator('whatsapp')
    @classmethod
    def _valid_whatsapp(cls, v):
        if v is None or not v.strip():
            return None
        number = normalize_phone(v)
        if not E164.match(number):
            raise ValueError('Enter a valid WhatsApp number with country code, e.g. +91 98765 43210')
        return number


class TokenRequest(BaseModel):
    token: str = Field(..., min_length=16, max_length=128)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _send_confirmation(email: str, confirm_token: str, unsubscribe_token: str) -> None:
    from email_service import build_newsletter_confirm_html, send_email

    confirm_url = f'{FRONTEND_URL}/newsletter/confirm?token={confirm_token}'
    unsubscribe_url = f'{FRONTEND_URL}/newsletter/unsubscribe?token={unsubscribe_token}'
    sent = await send_email(
        to_email=email,
        subject='Confirm your We Hive subscription',
        html_body=build_newsletter_confirm_html(confirm_url, unsubscribe_url),
        text_body=f'Confirm your We Hive subscription: {confirm_url}\nUnsubscribe: {unsubscribe_url}',
    )
    if not sent:
        logger.warning('Newsletter confirmation email could not be sent')
        if IS_DEV:
            logger.info('DEV newsletter confirm link: %s', confirm_url)


@router.post('/subscribe', dependencies=[Depends(_subscribe_limiter)])
async def subscribe(req: SubscribeRequest):
    if not req.consent:
        raise HTTPException(400, 'Please agree to receive emails to subscribe.')

    email = req.email.lower().strip()
    now = datetime.utcnow()
    existing = await newsletter_col.find_one({'email': email})

    if existing and existing.get('status') == 'active':
        if req.whatsapp and req.whatsapp != existing.get('whatsapp'):
            await newsletter_col.update_one(
                {'email': email}, {'$set': {'whatsapp': req.whatsapp, 'whatsapp_opt_in': True, 'updated_at': now}})
        return {'ok': True, 'message': GENERIC_OK}
    if existing and existing.get('status') == 'pending' and existing.get('last_sent_at') \
            and now - existing['last_sent_at'] < RESEND_COOLDOWN:
        return {'ok': True, 'message': GENERIC_OK}

    confirm_token = secrets.token_urlsafe(32)
    unsubscribe_token = (existing or {}).get('unsubscribe_token') or secrets.token_urlsafe(32)
    await newsletter_col.update_one(
        {'email': email},
        {
            '$set': {
                'status': 'pending',
                'source': req.source,
                'whatsapp': req.whatsapp,
                'whatsapp_opt_in': bool(req.whatsapp),
                'confirm_token_hash': _hash(confirm_token),
                'confirm_expires_at': now + CONFIRM_TTL,
                'unsubscribe_token': unsubscribe_token,
                'consent_at': now,
                'last_sent_at': now,
                'updated_at': now,
            },
            '$setOnInsert': {'email': email, 'created_at': now},
        },
        upsert=True,
    )
    await _send_confirmation(email, confirm_token, unsubscribe_token)
    return {'ok': True, 'message': GENERIC_OK}


@router.post('/confirm', dependencies=[Depends(_token_limiter)])
async def confirm(req: TokenRequest):
    sub = await newsletter_col.find_one({'confirm_token_hash': _hash(req.token)})
    if not sub:
        raise HTTPException(400, 'This confirmation link is invalid or has already been used.')
    if sub.get('confirm_expires_at') and sub['confirm_expires_at'] < datetime.utcnow():
        raise HTTPException(400, 'This confirmation link has expired. Please subscribe again.')
    now = datetime.utcnow()
    await newsletter_col.update_one(
        {'_id': sub['_id']},
        {'$set': {'status': 'active', 'confirmed_at': now, 'updated_at': now},
         '$unset': {'confirm_token_hash': '', 'confirm_expires_at': ''}},
    )
    return {'ok': True, 'status': 'active'}


@router.post('/unsubscribe', dependencies=[Depends(_token_limiter)])
async def unsubscribe(req: TokenRequest):
    sub = await newsletter_col.find_one({'unsubscribe_token': req.token})
    if not sub:
        raise HTTPException(400, 'This unsubscribe link is invalid.')
    now = datetime.utcnow()
    await newsletter_col.update_one(
        {'_id': sub['_id']},
        {'$set': {'status': 'unsubscribed', 'unsubscribed_at': now, 'updated_at': now},
         '$unset': {'confirm_token_hash': '', 'confirm_expires_at': ''}},
    )
    return {'ok': True, 'status': 'unsubscribed'}


@router.get('/subscribers')
async def list_subscribers(
    status: Optional[str] = Query(None, pattern='^(pending|active|unsubscribed)$'),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    _admin=Depends(get_current_admin_flex),
):
    query = {'status': status} if status else {}
    total = await newsletter_col.count_documents(query)
    cursor = newsletter_col.find(
        query, {'_id': 0, 'email': 1, 'whatsapp': 1, 'status': 1, 'source': 1, 'created_at': 1, 'confirmed_at': 1, 'unsubscribed_at': 1}
    ).sort('created_at', -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        for key in ('created_at', 'confirmed_at', 'unsubscribed_at'):
            if doc.get(key):
                doc[key] = doc[key].isoformat()
        items.append(doc)
    counts = {s: await newsletter_col.count_documents({'status': s}) for s in ('pending', 'active', 'unsubscribed')}
    return {'items': items, 'total': total, 'page': page, 'limit': limit,
            'pages': (total + limit - 1) // limit, 'counts': counts}
