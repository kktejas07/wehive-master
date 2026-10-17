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
import re

from fastapi import Depends, HTTPException, Header, Request

import config
from config import ADMIN_EMAILS, JWT_SECRET, JWT_ALG, ADMIN_JWT_EXPIRES_HOURS, RESET_TOKEN_TTL_MIN


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
def sign_admin_jwt(user_id: str, mfa: bool = False) -> str:
    payload = {
        'sub': user_id,
        'role': 'admin',
        'exp': datetime.utcnow() + timedelta(hours=ADMIN_JWT_EXPIRES_HOURS),
        'iat': datetime.utcnow(),
    }
    if mfa:
        payload['mfa'] = True  # issued after a second factor; required once 2FA is on
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


# The half-way token between password and 2FA code. Signed with a derived key so it can never be
# accepted as a user or admin session token.
MFA_TOKEN_MINUTES = 5


def _mfa_key() -> str:
    return hashlib.sha256(f'{JWT_SECRET}|admin-mfa'.encode()).hexdigest()


def sign_mfa_token(user_id: str) -> str:
    now = datetime.utcnow()
    return jwt.encode({'sub': user_id, 'purpose': 'admin_mfa', 'iat': now,
                       'exp': now + timedelta(minutes=MFA_TOKEN_MINUTES)}, _mfa_key(), algorithm='HS256')


def decode_mfa_token(token: str) -> str:
    try:
        payload = jwt.decode(token, _mfa_key(), algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='The sign-in took too long. Enter your password again.')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid sign-in session. Enter your password again.')
    if payload.get('purpose') != 'admin_mfa':
        raise HTTPException(status_code=401, detail='Invalid sign-in session.')
    return payload['sub']


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
    from email_service import _wrap_html
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
    """Send the reset email via the unified email service. Never returns the token."""
    from email_service import send_email
    reset_link = f'{frontend_url.rstrip("/")}/admin/reset-password?token={raw_token}'
    html = _build_reset_email_html(reset_link, raw_token)
    sent = await send_email(
        to_email=to_email,
        subject='Reset your We Hive admin password',
        html_body=html,
        text_body=f'Use this code to reset your password: {raw_token}\nOr click: {reset_link}',
    )
    return {'sent': sent}


# ---------- dependency ----------
# ---------- admin roles ----------
# Every admin can read everything in the panel; writes depend on the role. Super admins
# (ADMIN_EMAILS) and admins without a role ("manager", the pre-roles behaviour) can write anywhere
# their endpoint allows. Paths are relative to /api.
ADMIN_ROLES = {
    'manager': 'Full access (except super-admin settings)',
    'support': 'Applications, cases, leads, document review, profile requests',
    'finance': 'Payments, pricing and promo codes',
    'viewer': 'Read-only',
}
_ANY_ROLE_WRITES = re.compile(
    r'^/admin-auth/(change-password|2fa/|login)|^/admin/(me|change-password)$'
    r'|^/rag/(retrieve|query)$|^/newsletter/admin/campaigns/(preview|test)$'  # POSTs that only read
)
_ROLE_WRITES = {
    'support': re.compile(r'^/admin/(applications|leads|review-queue|profile-requests)(/|$)'),
    'finance': re.compile(r'^/admin/(payments|pricing)(/|$)|^/promotions/'),
}


def role_allows(role: Optional[str], method: str, path: str) -> bool:
    path = re.sub(r'^/api', '', path)
    if method in ('GET', 'HEAD', 'OPTIONS') or not role or role == 'manager':
        return True
    if _ANY_ROLE_WRITES.search(path):
        return True
    rx = _ROLE_WRITES.get(role)
    return bool(rx and rx.search(path))


TWO_FACTOR_SETUP_REQUIRED = 'Two-factor authentication is required. Turn it on in My security to continue.'
_ENROLMENT_PATHS = re.compile(r'^/admin-auth/(me|2fa/setup|2fa/enable|change-password)$|^/admin/me$')


def needs_2fa_enrolment(user: dict) -> bool:
    return config.ADMIN_REQUIRE_2FA and not user.get('totp_enabled')


async def get_current_admin_flex(
    authorization: Optional[str] = Header(default=None),
    request: Request = None,  # injected by FastAPI; None when called directly
):
    """Resolve the admin, then apply their role to this request (see ADMIN_ROLES)."""
    user = await _resolve_admin(authorization)
    if request is not None and needs_2fa_enrolment(user) and not _ENROLMENT_PATHS.search(re.sub(r'^/api', '', request.url.path)):
        raise HTTPException(403, TWO_FACTOR_SETUP_REQUIRED)
    if request is not None and not is_super_admin(user) and not role_allows(user.get('admin_role'), request.method, request.url.path):
        role = user.get('admin_role')
        raise HTTPException(403, f'Your admin role ({role}) can view this but not change it.')
    return user


async def _resolve_admin(authorization: Optional[str]):
    """Accept either:
       • an admin JWT (role=admin)
       • a regular user OTP JWT whose email is in ADMIN_EMAILS
       • or a user record with is_admin=true.
    """
    from db import users
    from auth_utils import decode_jwt as decode_user_jwt

    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ', 1)[1].strip()

    # Try admin JWT first. A valid admin token is judged on its own rules — its errors are final.
    try:
        payload = decode_admin_jwt(token)
    except HTTPException:
        payload = None
    if payload and payload.get('role') == 'admin':
        user = await users.find_one({'_id': payload['sub']})
        if not user:
            raise HTTPException(401, 'Admin account not found')
        if not user.get('is_admin'):
            raise HTTPException(403, 'Admin privileges revoked')
        if user.get('suspended'):
            raise HTTPException(403, 'Account suspended')
        if user.get('totp_enabled') and not payload.get('mfa'):
            raise HTTPException(401, 'Two-factor sign-in required — please log in again.')
        return user

    # Fall back to user OTP JWT + ADMIN_EMAILS allow-list
    try:
        payload = decode_user_jwt(token)
    except HTTPException:
        raise
    user = await users.find_one({'_id': payload['sub']})
    if not user:
        raise HTTPException(401, 'User not found')
    if user.get('suspended'):
        raise HTTPException(403, 'Account suspended')
    if user.get('totp_enabled'):
        # A student OTP session must not skip the admin second factor.
        raise HTTPException(403, 'Two-factor is on for this admin — sign in at /admin/login.')
    email = (user.get('email') or '').lower()
    # The allow-list only counts once the user has proven they own the address.
    if user.get('is_admin') or (email in ADMIN_EMAILS and user.get('email_verified') is True):
        return user
    raise HTTPException(status_code=403, detail='Admin access required')


def is_super_admin(user: dict) -> bool:
    """Super admins are the env-managed ADMIN_EMAILS accounts (bootstrapped on startup)."""
    return (user.get('email') or '').lower() in ADMIN_EMAILS


async def get_super_admin(user=Depends(get_current_admin_flex)):
    """Gate for secrets, admin management and destructive ops; invited admins get 403."""
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail='Only a super admin can do this.')
    return user
