import os
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from datetime import datetime, timedelta
import json
from pydantic import BaseModel, Field

from models import (
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest, AuthTokens, PublicUser,
    FirebaseSyncRequest, FirebasePhoneSyncRequest,
)
import premium
from auth_utils import (
    claim_contact, classify_identifier, normalize_phone, sign_jwt, mask,
    get_current_user,
)
from admin_auth import verify_password
from db import db, users
from constants import REFERRAL_REWARD_INR
from rate_limit import RateLimit
import uuid

from config import ADMIN_EMAILS, OTP_TTL_MIN, IS_DEV, SUPPORT_EMAIL, FRONTEND_URL

router = APIRouter(prefix='/auth', tags=['auth'])

# 5 OTP requests per IP per 10 minutes; 10 login attempts per IP per minute.
_otp_limiter = RateLimit(max_calls=5, window_seconds=600)
_login_limiter = RateLimit(max_calls=10, window_seconds=60)
_verify_limiter = RateLimit(max_calls=10, window_seconds=600)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post('/login', response_model=AuthTokens)
async def user_login(req: LoginRequest, request: Request, _=Depends(_login_limiter)):
    email = req.email.lower().strip()
    user = await users.find_one({'email': email})
    if not user or not user.get('password_hash'):
        raise HTTPException(401, 'Invalid email or password')
    if not verify_password(req.password, user['password_hash']):
        raise HTTPException(401, 'Invalid email or password')
    token = sign_jwt(user['_id'])
    return AuthTokens(access_token=token, user=_public(user))


def _is_admin(u: dict) -> bool:
    if u.get('is_admin'):
        return True
    email = (u.get('email') or '').lower()
    return email in ADMIN_EMAILS and u.get('email_verified') is True


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
        plan_id=u.get('plan_id'),
        premium_since=u.get('premium_since'),
        is_admin=_is_admin(u),
        is_staff=bool(u.get('is_staff', False)),
        staff_role=u.get('staff_role'),
        notify_email=u.get('notify_email', True),
        notify_whatsapp=bool(u.get('notify_whatsapp', False)),
        premium_free_left=premium.free_left(u),
        pending_email=u.get('pending_email'),
        pending_phone=u.get('pending_phone'),
        created_at=u.get('created_at', datetime.utcnow()),
    )


async def _find_or_create_user(identifier: str, kind: str, name: str = '', referral_code: str = ''):
    field = 'email' if kind == 'email' else 'phone'
    user = await claim_contact(users, field, identifier)
    now = datetime.utcnow()
    is_new = False
    if not user:
        is_new = True
        user = {
            '_id': str(uuid.uuid4()),
            'name': name or '',
            'email_verified': kind == 'email',
            'phone_verified': kind == 'phone',
            'created_at': now,
            'updated_at': now,
        }
        if referral_code:
            referrer = await db['referrals'].find_one({'code': referral_code.strip().upper()})
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
        if name and not user.get('name'):
            update['name'] = name
        await users.update_one({'_id': user['_id']}, {'$set': update})
        user = await users.find_one({'_id': user['_id']})
    return user, is_new


@router.post('/send-otp', response_model=SendOtpResponse)
async def send_otp(req: SendOtpRequest, request: Request, _=Depends(_otp_limiter)):
    from otp_service import generate_otp, store_otp, check_rate_limit, increment_resend

    kind = req.channel or classify_identifier(req.identifier)
    identifier = normalize_phone(req.identifier) if kind == 'phone' else req.identifier.lower()

    # Mock OTP (fixed code echoed back) is only allowed in development/test.
    channel_mode = os.environ.get('OTP_CHANNEL', 'mock' if IS_DEV else '')
    if not channel_mode or (channel_mode == 'mock' and not IS_DEV):
        raise HTTPException(status_code=503, detail='OTP service not configured')

    rate_limit_error = await check_rate_limit(identifier)
    if rate_limit_error:
        raise HTTPException(status_code=429, detail=rate_limit_error)

    otp_code = generate_otp()
    await store_otp(identifier, kind, otp_code, purpose=req.purpose)
    await increment_resend(identifier, kind)

    delivered = False
    channel_used = kind

    dev_code = None
    if channel_mode == 'mock':
        delivered = True
        channel_used = 'mock'
        dev_code = os.environ.get('MOCK_OTP_CODE', '123456')
        from otp_service import store_otp as store_mock
        await store_mock(identifier, kind, dev_code, purpose=req.purpose)
    elif kind in ('email', 'sms', 'phone', 'whatsapp'):
        from otp_providers import deliver_otp
        delivered, channel_used, _ = await deliver_otp(identifier, kind, otp_code)
    else:
        raise HTTPException(status_code=400, detail=f'Unsupported OTP channel: {kind}')

    if not delivered:
        raise HTTPException(status_code=400, detail=f'Failed to deliver OTP via {channel_used}. Check provider configuration.')

    return SendOtpResponse(
        sent=True,
        channel=channel_used,
        masked=mask(identifier),
        dev_code=dev_code,
        ttl_seconds=OTP_TTL_MIN * 60,
    )


SUSPENDED_DETAIL = f'This account has been suspended. Contact {SUPPORT_EMAIL} if you think this is a mistake.'


def _ensure_not_suspended(user: dict) -> None:
    if user.get('suspended'):
        raise HTTPException(status_code=403, detail=SUSPENDED_DETAIL)


@router.post('/verify-otp', response_model=AuthTokens)
async def verify_otp(req: VerifyOtpRequest, bg: BackgroundTasks, _=Depends(_verify_limiter)):
    from otp_service import consume_otp

    kind = req.channel or classify_identifier(req.identifier)
    identifier = normalize_phone(req.identifier) if kind in ('phone', 'sms', 'whatsapp') else req.identifier.lower()
    channel = 'email' if kind == 'email' else kind

    result = await consume_otp(identifier, req.code.strip(), channel)
    if not result['ok']:
        raise HTTPException(status_code=400, detail=result['error'])

    user, is_new = await _find_or_create_user(identifier, channel, req.name or '', req.referral_code or '')
    _ensure_not_suspended(user)
    token = sign_jwt(user['_id'])

    if is_new and result.get('purpose') == 'signup':
        user_email = user.get('email')
        if user_email:
            from email_service import build_welcome_html, send_email
            bg.add_task(
                send_email,
                to_email=user_email,
                subject='Our Ambition. Our Guidance. No Frontiers',
                html_body=build_welcome_html(user.get('name', '')),
                text_body=f'Our Ambition. Our Guidance. No Frontiers. Hello {user.get("name", "there")}! Explore 190+ countries, apply to universities, and track your applications.',
            )

    return AuthTokens(access_token=token, user=_public(user))


@router.get('/me', response_model=PublicUser)
async def me(user=Depends(get_current_user)):
    return _public(user)


# ---------- backend-owned email verification (Postal/SMTP, not Firebase) ----------

EMAIL_VERIFY_TTL_HOURS = 24


class RequestEmailVerificationRequest(BaseModel):
    id_token: str  # Firebase ID token: binds the verification to this Firebase UID


class VerifyEmailRequest(BaseModel):
    token: str


async def _backend_email_verified(firebase_uid: str, email: str) -> bool:
    rec = await db['email_verifications'].find_one({
        'firebase_uid': firebase_uid,
        'email': (email or '').lower(),
        'used_at': {'$ne': None},
    })
    return rec is not None


@router.post('/request-email-verification')
async def request_email_verification(req: RequestEmailVerificationRequest, _=Depends(_verify_limiter)):
    """Send the signup verification email via Postal/SMTP instead of Firebase."""
    import hashlib
    import secrets
    from firebase_utils import _get_firebase_creds, init_firebase_admin, verify_firebase_token
    import firebase_admin

    project_id, creds_json = await _get_firebase_creds()
    if not project_id or not creds_json:
        raise HTTPException(status_code=503, detail='Firebase not configured.')
    if not firebase_admin._apps:
        init_firebase_admin(project_id, creds_json)
    try:
        decoded = await verify_firebase_token(req.id_token)
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid session. Sign in again.')

    email = (decoded.get('email') or '').lower().strip()
    firebase_uid = decoded.get('uid')
    if not email or not firebase_uid:
        raise HTTPException(status_code=400, detail='No email on this account.')

    raw = secrets.token_urlsafe(32)
    digest = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    now = datetime.utcnow()
    await db['email_verifications'].delete_many({'firebase_uid': firebase_uid, 'used_at': None})
    await db['email_verifications'].insert_one({
        '_id': digest,
        'firebase_uid': firebase_uid,
        'email': email,
        'name': decoded.get('name', ''),
        'created_at': now,
        'expires_at': now + timedelta(hours=EMAIL_VERIFY_TTL_HOURS),
        'used_at': None,
    })

    from email_service import build_email_verification_html, send_email
    verify_url = f'{FRONTEND_URL}/verify-email?token={raw}'
    name = decoded.get('name', '')
    sent = await send_email(
        to_email=email,
        subject='Verify your We Hive email',
        html_body=build_email_verification_html(name, verify_url),
        text_body=f'Hi {name or "there"}, verify your We Hive email: {verify_url}',
    )
    if not sent:
        raise HTTPException(status_code=502, detail='Could not send the verification email. Try again later.')
    return {'sent': True, 'masked': mask(email)}


@router.post('/verify-email')
async def verify_email(req: VerifyEmailRequest):
    """Consume a verification link token and mark the address verified."""
    import hashlib
    digest = hashlib.sha256((req.token or '').strip().encode('utf-8')).hexdigest()
    doc = await db['email_verifications'].find_one({'_id': digest})
    if not doc or doc.get('used_at'):
        raise HTTPException(status_code=400, detail='This link has expired or already been used.')
    if doc.get('expires_at') and doc['expires_at'] < datetime.utcnow():
        raise HTTPException(status_code=400, detail='This link has expired. Request a new one.')
    now = datetime.utcnow()
    await db['email_verifications'].update_one({'_id': digest}, {'$set': {'used_at': now}})
    email = doc['email']
    user = await users.find_one({'email': email})
    if user:
        await users.update_one({'_id': user['_id']}, {'$set': {'email_verified': True, 'updated_at': now}})
    else:
        await users.insert_one({
            '_id': str(uuid.uuid4()),
            'name': doc.get('name', ''),
            'email': email,
            'email_verified': True,
            'created_at': now,
            'updated_at': now,
        })
    return {'ok': True, 'email': mask(email)}


@router.post('/firebase-sync', response_model=AuthTokens)
async def firebase_sync(req: FirebaseSyncRequest, request: Request, _=Depends(_verify_limiter)):
    from firebase_utils import _get_firebase_creds, init_firebase_admin, verify_firebase_token
    import firebase_admin

    project_id, creds_json = await _get_firebase_creds()
    if not project_id:
        raise HTTPException(status_code=503, detail='Firebase not configured. Set Firebase settings in Admin → Settings → Firebase.')
    if not creds_json:
        raise HTTPException(status_code=503, detail='Firebase Service Account Key not configured. Add it in Admin → Settings → Firebase.')

    if not firebase_admin._apps:
        init_firebase_admin(project_id, creds_json)

    decoded = await verify_firebase_token(req.id_token)

    firebase_uid = decoded['uid']
    email = decoded.get('email')
    # Anyone can create a Firebase password account for any address, so an unverified
    # Firebase token alone never claims an account. Trust it only when Firebase says
    # the email is verified, or when this exact Firebase UID completed our own
    # Postal verification link (request-email-verification → verify-email).
    verified = decoded.get('email_verified') is True
    if email and not verified:
        verified = await _backend_email_verified(firebase_uid, email)
    if email and not verified:
        raise HTTPException(status_code=403, detail='Email not verified. Check your inbox for the verification link.')
    name = decoded.get('name', '')
    picture = decoded.get('picture')

    now = datetime.utcnow()

    if email:
        user = await claim_contact(users, 'email', email)
        if not user:
            user = {
                '_id': str(uuid.uuid4()),
                'name': name,
                'email': email,
                'email_verified': True if verified else decoded.get('email_verified', False),
                'firebase_uid': firebase_uid,
                'avatar_url': picture,
                'created_at': now,
                'updated_at': now,
            }
            await users.insert_one(user)
        else:
            update = {'updated_at': now, 'firebase_uid': firebase_uid, 'email_verified': True}
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

    _ensure_not_suspended(user)
    token = sign_jwt(user['_id'])
    return AuthTokens(access_token=token, user=_public(user))


@router.post('/firebase-phone-sync', response_model=AuthTokens)
async def firebase_phone_sync(req: FirebasePhoneSyncRequest, _=Depends(_verify_limiter)):
    from firebase_utils import _get_firebase_creds, init_firebase_admin, verify_firebase_token
    import firebase_admin

    if not firebase_admin._apps:
        project_id, creds_json = await _get_firebase_creds()
        if project_id and creds_json:
            init_firebase_admin(project_id, creds_json)

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
