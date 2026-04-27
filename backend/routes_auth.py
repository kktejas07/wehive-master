from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from models import (
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest, AuthTokens, PublicUser,
)
from auth_utils import (
    classify_identifier, normalize_phone, gen_otp, otp_expiry, sign_jwt, mask,
    get_current_user,
)
from otp_providers import deliver_otp
from db import users, otps
import os
import uuid

router = APIRouter(prefix='/auth', tags=['auth'])

MOCK_CODE = os.environ.get('MOCK_OTP_CODE', '').strip()
OTP_TTL_MIN = int(os.environ.get('OTP_TTL_MINUTES', '10'))


def _public(u: dict) -> PublicUser:
    return PublicUser(
        id=u['_id'],
        name=u.get('name'),
        email=u.get('email'),
        phone=u.get('phone'),
        email_verified=u.get('email_verified', False),
        phone_verified=u.get('phone_verified', False),
        gender=u.get('gender'),
        avatar_seed=u.get('avatar_seed'),
        avatar_style=u.get('avatar_style'),
        created_at=u.get('created_at', datetime.utcnow()),
    )


@router.post('/send-otp', response_model=SendOtpResponse)
async def send_otp(req: SendOtpRequest):
    kind = classify_identifier(req.identifier)
    identifier = normalize_phone(req.identifier) if kind == 'phone' else req.identifier.lower()

    code = MOCK_CODE if MOCK_CODE and os.environ.get('OTP_CHANNEL', 'mock') == 'mock' else gen_otp()
    expires = otp_expiry()

    # Replace any existing OTP for this identifier+kind
    await otps.delete_many({'identifier': identifier, 'channel': kind})
    await otps.insert_one({
        '_id': str(uuid.uuid4()),
        'identifier': identifier,
        'channel': kind,
        'code': code,
        'attempts': 0,
        'expires_at': expires,
        'purpose': req.purpose,
        'created_at': datetime.utcnow(),
    })

    delivered, channel_used, is_mock = deliver_otp(identifier, kind, code)
    if not delivered:
        raise HTTPException(status_code=502, detail='Failed to deliver OTP')

    return SendOtpResponse(
        sent=True,
        channel=channel_used,
        masked=mask(identifier),
        dev_code=code if is_mock else None,
        ttl_seconds=OTP_TTL_MIN * 60,
    )


@router.post('/verify-otp', response_model=AuthTokens)
async def verify_otp(req: VerifyOtpRequest):
    kind = classify_identifier(req.identifier)
    identifier = normalize_phone(req.identifier) if kind == 'phone' else req.identifier.lower()
    record = await otps.find_one({'identifier': identifier, 'channel': kind})
    if not record:
        raise HTTPException(status_code=400, detail='OTP not requested or expired')
    if record['expires_at'] < datetime.utcnow():
        await otps.delete_one({'_id': record['_id']})
        raise HTTPException(status_code=400, detail='OTP expired')
    if record.get('attempts', 0) >= 5:
        raise HTTPException(status_code=429, detail='Too many attempts. Request a new code.')
    if record['code'] != req.code.strip():
        await otps.update_one({'_id': record['_id']}, {'$inc': {'attempts': 1}})
        raise HTTPException(status_code=400, detail='Invalid code')

    # OTP valid \u2014 consume it
    await otps.delete_one({'_id': record['_id']})

    # Find or create user
    field = 'email' if kind == 'email' else 'phone'
    user = await users.find_one({field: identifier})
    now = datetime.utcnow()
    if not user:
        user = {
            '_id': str(uuid.uuid4()),
            'name': req.name or '',
            'email_verified': kind == 'email',
            'phone_verified': kind == 'phone',
            'created_at': now,
            'updated_at': now,
        }
        # Only set email or phone field if it has a value
        if kind == 'email':
            user['email'] = identifier
        else:
            user['phone'] = identifier
        await users.insert_one(user)
    else:
        update = {f'{kind}_verified': True, 'updated_at': now}
        if req.name and not user.get('name'):
            update['name'] = req.name
        await users.update_one({'_id': user['_id']}, {'$set': update})
        user = await users.find_one({'_id': user['_id']})

    token = sign_jwt(user['_id'])
    return AuthTokens(access_token=token, user=_public(user))


@router.get('/me', response_model=PublicUser)
async def me(user=Depends(get_current_user)):
    return _public(user)
