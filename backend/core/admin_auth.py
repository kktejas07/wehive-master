"""Password-based admin authentication.

Lives alongside the existing OTP auth — doesn't disturb it.
Powers /api/admin-auth/signup|login|forgot-password|reset-password|me.
Admin JWTs carry {"sub": uid, "role": "admin"} so `get_current_admin`
in routes_admin.py can accept either an admin token OR a user OTP token
whose email is listed in ADMIN_EMAILS.
"""
from __future__ import annotations

import os
import hashlib
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, Header

from core.config import ADMIN_EMAILS, JWT_SECRET, JWT_ALG, JWT_EXPIRES_HOURS, RESET_TOKEN_TTL_MIN


# ---------- passwords ----------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def password_strength_issue(pw: str) -> Optional[str]:
    if len(pw) < 8:
        return 'Password must be at least 8 characters.'
    if not any(c.isdigit() for c in pw):
        return 'Password must include at least one number.'
    if not any(c.isalpha() for c in pw):
        return 'Password must include at least one letter.'
    return None


# ---------- tokens ----------
def sign_admin_jwt(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'role': 'admin',
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_admin_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Session expired — please log in again.')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token.')


def generate_reset_token() -> tuple[str, str, datetime]:
    """Return (raw_token, sha256_hash, expires_at). Store only the hash."""
    raw = secrets.token_urlsafe(32)
    digest = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MIN)
    return raw, digest, expires


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


# ---------- lockout ----------
MAX_ATTEMPTS = 5
LOCKOUT_MIN = 15


async def is_locked_out(login_attempts, identifier: str) -> tuple[bool, int]:
    """Return (locked, seconds_remaining)."""
    doc = await login_attempts.find_one({'_id': identifier})
    if not doc:
        return False, 0
    attempts = doc.get('count', 0)
    locked_until = doc.get('locked_until')
    if attempts >= MAX_ATTEMPTS and locked_until and locked_until > datetime.utcnow():
        return True, int((locked_until - datetime.utcnow()).total_seconds())
    return False, 0


async def record_failed_attempt(login_attempts, identifier: str) -> None:
    now = datetime.utcnow()
    doc = await login_attempts.find_one({'_id': identifier})
    count = (doc.get('count', 0) if doc else 0) + 1
    update: dict = {'count': count, 'last_attempt_at': now}
    if count >= MAX_ATTEMPTS:
        update['locked_until'] = now + timedelta(minutes=LOCKOUT_MIN)
    await login_attempts.update_one(
        {'_id': identifier},
        {'$set': update},
        upsert=True,
    )


async def clear_attempts(login_attempts, identifier: str) -> None:
    await login_attempts.delete_one({'_id': identifier})


# ---------- email ----------
def _build_reset_email_html(reset_link: str, reset_code: str) -> str:
    from shared.email_service import _wrap_html
    minutes = RESET_TOKEN_TTL_MIN
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0">Hello,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">You (or someone using your email) requested a password reset for your We Hive admin account.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:16px 0;text-align:center">
        <p style="font-size:13px;color:#64748b;margin:0 0 12px 0">Reset code</p>
        <div style="font-size:24px;font-weight:800;color:#e0212c;letter-spacing:4px;margin:0 0 16px 0">{reset_code}</div>
        <a href="{reset_link}" style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Reset Password</a>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:12px 0 0 0;line-height:1.6">This link expires in {minutes} minutes.</p>
    </td></tr>
    """
    return _wrap_html('Password Reset Request', content)


async def send_reset_email_or_log(to_email: str, raw_token: str, frontend_url: str) -> dict:
    """Try unified email service. If not configured, return the token in the response (dev mode)."""
    from shared.email_service import send_email
    reset_link = f'{frontend_url.rstrip("/")}/admin/reset-password?token={raw_token}'
    html = _build_reset_email_html(reset_link, raw_token)
    sent = await send_email(
        to_email=to_email,
        subject='Reset your We Hive admin password',
        html_body=html,
        text_body=f'Use this code to reset your password: {raw_token}\nOr click: {reset_link}',
    )
    return {
        'sent': sent,
        'dev_token': None if sent else raw_token,
        'dev_link': None if sent else reset_link,
    }


# ---------- dependency ----------
async def get_current_admin_flex(
    authorization: Optional[str] = Header(default=None),
):
    """Accept either:
       • an admin JWT (role=admin)
       • a regular user OTP JWT whose email is in ADMIN_EMAILS
       • or a user record with is_admin=true.
    """
    from core.db import users
    from core.auth_utils import decode_jwt as decode_user_jwt

    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ', 1)[1].strip()

    # Try admin JWT first
    try:
        payload = decode_admin_jwt(token)
        if payload.get('role') == 'admin':
            user = await users.find_one({'_id': payload['sub']})
            if not user:
                raise HTTPException(401, 'Admin account not found')
            if not user.get('is_admin'):
                raise HTTPException(403, 'Admin privileges revoked')
            return user
    except HTTPException:
        pass

    # Fall back to user OTP JWT + ADMIN_EMAILS allow-list
    try:
        payload = decode_user_jwt(token)
    except HTTPException:
        raise
    user = await users.find_one({'_id': payload['sub']})
    if not user:
        raise HTTPException(401, 'User not found')
    email = (user.get('email') or '').lower()
    if user.get('is_admin') or email in ADMIN_EMAILS:
        return user
    raise HTTPException(status_code=403, detail='Admin access required')
