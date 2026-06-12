from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import json

from models import (
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest, AuthTokens, PublicUser,
    FirebaseSyncRequest, FirebasePhoneSyncRequest,
)
from auth_utils import (
    classify_identifier, normalize_phone, gen_otp, otp_expiry, sign_jwt, mask,
    get_current_user,
)
from otp_providers import deliver_otp
from db import users, otps
from constants import REFERRAL_REWARD_INR
import os
import uuid

from config import ADMIN_EMAILS, MOCK_CODE, OTP_TTL_MIN, FIREBASE_PROJECT_ID, FIREBASE_CREDENTIALS

router = APIRouter(prefix='/auth', tags=['auth'])


def _is_admin(u: dict) -> bool:
    if u.get('is_admin'):
        return True
    email = (u.get('email') or '').lower()
    return email in ADMIN_EMAILS


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
        is_premium=bool(u.get('is_premium', False)),
        premium_since=u.get('premium_since'),
        is_admin=_is_admin(u),
        is_staff=bool(u.get('is_staff', False)),
        staff_role=u.get('staff_role'),
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
        if req.referral_code:
            referrer = await db['referrals'].find_one({'code': req.referral_code.strip().upper()})
            if referrer and referrer['user_id'] != user['_id']:
                user['referred_by'] = referrer['user_id']
                await db['referral_transactions'].update_one(
                    {'_id': f'pending-{user["_id"]}'},
                    {'$setOnInsert': {
                        '_id': f'pending-{user["_id"]}',
                        'referrer_id': referrer['user_id'],
                        'referred_id': user['_id'],
                        'referred_email': identifier if kind == 'email' else '',
                        'amount_inr': REFERRAL_REWARD_INR,
                        'status': 'pending',
                        'created_at': now,
                    }},
                    upsert=True,
                )
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


@router.post('/firebase-sync', response_model=AuthTokens)
async def firebase_sync(req: FirebaseSyncRequest):
    if not FIREBASE_PROJECT_ID:
        raise HTTPException(status_code=503, detail='Firebase not configured')

    import firebase_admin
    from firebase_admin import credentials, auth

    if not firebase_admin._apps:
        if FIREBASE_CREDENTIALS:
            cred_dict = json.loads(FIREBASE_CREDENTIALS)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {'projectId': FIREBASE_PROJECT_ID})
        else:
            raise HTTPException(status_code=503, detail='Firebase credentials not configured')

    try:
        decoded = auth.verify_id_token(req.id_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Invalid Firebase token: {str(e)}')

    firebase_uid = decoded['uid']
    email = decoded.get('email')
    name = decoded.get('name', '')
    picture = decoded.get('picture')

    now = datetime.utcnow()

    if email:
        user = await users.find_one({'email': email})
        if not user:
            user = {
                '_id': str(uuid.uuid4()),
                'name': name,
                'email': email,
                'email_verified': decoded.get('email_verified', False),
                'firebase_uid': firebase_uid,
                'avatar_url': picture,
                'created_at': now,
                'updated_at': now,
            }
            await users.insert_one(user)
        else:
            update = {'updated_at': now, 'firebase_uid': firebase_uid}
            if picture:
                update['avatar_url'] = picture
            if name and not user.get('name'):
                update['name'] = name
            await users.update_one({'_id': user['_id']}, {'$set': update})
            user = await users.find_one({'_id': user['_id']})
    else:
        user = await users.find_one({'firebase_uid': firebase_uid})
        if not user:
            raise HTTPException(status_code=400, detail='No email associated with Firebase account')

    token = sign_jwt(user['_id'])
    return AuthTokens(access_token=token, user=_public(user))


@router.post('/firebase-phone-sync', response_model=AuthTokens)
async def firebase_phone_sync(req: FirebasePhoneSyncRequest):
    from firebase_utils import verify_firebase_token

    decoded = await verify_firebase_token(req.id_token)

    phone = decoded.get('phone_number')
    if not phone:
        raise HTTPException(status_code=400, detail='No phone number in Firebase token')

    now = datetime.utcnow()
    user = await users.find_one({'phone': phone})

    if not user:
        user = {
            '_id': str(uuid.uuid4()),
            'name': req.name or '',
            'phone': phone,
            'phone_verified': True,
            'created_at': now,
            'updated_at': now,
        }
        if req.referral_code:
            referrer = await db['referrals'].find_one({'code': req.referral_code.strip().upper()})
            if referrer and referrer['user_id'] != user['_id']:
                user['referred_by'] = referrer['user_id']
                await db['referral_transactions'].update_one(
                    {'_id': f'pending-{user["_id"]}'},
                    {'$setOnInsert': {
                        '_id': f'pending-{user["_id"]}',
                        'referrer_id': referrer['user_id'],
                        'referred_id': user['_id'],
                        'referred_email': '',
                        'amount_inr': REFERRAL_REWARD_INR,
                        'status': 'pending',
                        'created_at': now,
                    }},
                    upsert=True,
                )
        await users.insert_one(user)
    else:
        update = {'phone_verified': True, 'updated_at': now}
        if req.name and not user.get('name'):
            update['name'] = req.name
        await users.update_one({'_id': user['_id']}, {'$set': update})
        user = await users.find_one({'_id': user['_id']})

    token = sign_jwt(user['_id'])
    return AuthTokens(access_token=token, user=_public(user))
