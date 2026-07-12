"""Unified OTP service — generation, hashing, storage, rate limiting, resend cooldown."""
import hashlib
import os
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from core.db import db, otps

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = int(os.environ.get('OTP_EXPIRY_MINUTES', '10'))
RESEND_COOLDOWN = int(os.environ.get('OTP_RESEND_COOLDOWN_SECONDS', '60'))
MAX_ATTEMPTS = 5
MAX_RESENDS = 5

def generate_otp() -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(OTP_LENGTH))


def _salt() -> str:
    return secrets.token_hex(8)


def hash_otp(code: str, salt: str) -> str:
    return hashlib.sha256((code + salt).encode()).hexdigest()


def verify_otp_code(raw_code: str, stored_hash: str, salt: str) -> bool:
    return hash_otp(raw_code, salt) == stored_hash


async def store_otp(identifier: str, channel: str, otp_code: str, purpose: str = 'login') -> str:
    from core.db import otps
    salt = _salt()
    hashed = hash_otp(otp_code, salt)
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    await otps.delete_many({'identifier': identifier, 'channel': channel})

    await otps.insert_one({
        'identifier': identifier,
        'channel': channel,
        'code_hash': hashed,
        'salt': salt,
        'expires_at': expires_at,
        'attempts': 0,
        'purpose': purpose,
        'resend_count': 0,
        'last_resend_at': None,
        'created_at': datetime.utcnow(),
        'verified': False,
    })

    return otp_code


async def check_rate_limit(identifier: str) -> Optional[str]:
    from core.db import otps
    existing = await otps.find_one({'identifier': identifier}, sort=[('created_at', -1)])
    if not existing:
        return None
    if existing.get('resend_count', 0) >= MAX_RESENDS:
        return 'Too many resend attempts. Try again later.'
    if existing.get('last_resend_at'):
        elapsed = (datetime.utcnow() - existing['last_resend_at']).total_seconds()
        if elapsed < RESEND_COOLDOWN:
            remaining = int(RESEND_COOLDOWN - elapsed)
            return f'Please wait {remaining}s before requesting another code.'
    return None


async def consume_otp(identifier: str, code: str, channel: str) -> dict:
    from core.db import otps
    record = await otps.find_one({'identifier': identifier, 'channel': channel})
    if not record:
        return {'ok': False, 'error': 'No OTP requested or expired'}
    if record.get('verified'):
        return {'ok': False, 'error': 'OTP already used'}
    if record['expires_at'] < datetime.utcnow():
        await otps.delete_one({'_id': record['_id']})
        return {'ok': False, 'error': 'OTP expired. Request a new one.'}
    if record.get('attempts', 0) >= MAX_ATTEMPTS:
        return {'ok': False, 'error': 'Too many failed attempts. Request a new code.'}

    if not verify_otp_code(code, record['code_hash'], record['salt']):
        await otps.update_one({'_id': record['_id']}, {'$inc': {'attempts': 1}})
        remaining = MAX_ATTEMPTS - record.get('attempts', 0) - 1
        return {'ok': False, 'error': f'Invalid code. {remaining} attempt(s) remaining.'}

    await otps.delete_one({'_id': record['_id']})
    return {'ok': True, 'purpose': record.get('purpose', 'login')}


async def increment_resend(identifier: str, channel: str):
    from core.db import otps
    await otps.update_one(
        {'identifier': identifier, 'channel': channel},
        {'$inc': {'resend_count': 1}, '$set': {'last_resend_at': datetime.utcnow()}},
    )
