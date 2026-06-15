import os
import re
import jwt
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Header, status

JWT_SECRET = os.environ.get('JWT_SECRET', 'change_me')
JWT_ALG = os.environ.get('JWT_ALG', 'HS256')

if JWT_SECRET == 'change_me':
    import logging
    logging.getLogger('wehive').warning(
        'JWT_SECRET is set to the default value "change_me". '
        'Set a strong random secret in production.'
    )
JWT_EXPIRES_HOURS = int(os.environ.get('JWT_EXPIRES_HOURS', '720'))
OTP_LENGTH = int(os.environ.get('OTP_LENGTH', '6'))
OTP_TTL_MIN = int(os.environ.get('OTP_TTL_MINUTES', '10'))

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PHONE_RE = re.compile(r'^\+?\d{10,15}$')


def classify_identifier(identifier: str) -> str:
    s = identifier.strip()
    if EMAIL_RE.match(s):
        return 'email'
    if PHONE_RE.match(s):
        return 'phone'
    raise HTTPException(status_code=400, detail='Invalid email or phone number')


def normalize_phone(phone: str) -> str:
    p = phone.strip().replace(' ', '').replace('-', '')
    if not p.startswith('+'):
        # Default to India country code if missing
        p = '+91' + p.lstrip('0')
    return p


def gen_otp(length: int = OTP_LENGTH) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def sign_jwt(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')


def otp_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=OTP_TTL_MIN)


def mask(identifier: str) -> str:
    if '@' in identifier:
        local, _, domain = identifier.partition('@')
        if len(local) <= 2:
            return local[0] + '***@' + domain
        return local[0] + '***' + local[-1] + '@' + domain
    if identifier.startswith('+') and len(identifier) > 5:
        return identifier[:3] + '*****' + identifier[-2:]
    return identifier[:2] + '*****' + identifier[-2:]


async def get_current_user(authorization: Optional[str] = Header(default=None)):
    """FastAPI dependency: extract user from Bearer token."""
    from db import users
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ', 1)[1].strip()
    payload = decode_jwt(token)
    user_id = payload.get('sub')
    user = await users.find_one({'_id': user_id})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


async def get_current_user_optional(authorization: Optional[str] = Header(default=None)):
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


from admin_auth import hash_password, verify_password

def create_access_token(data: dict) -> str:
    return sign_jwt(data['sub'])
