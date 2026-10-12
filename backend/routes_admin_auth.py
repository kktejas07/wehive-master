"""Password-based admin authentication routes.

Endpoints (all mounted under /api/admin-auth):
  POST /signup            — only allowed if email ∈ ADMIN_EMAILS
  POST /login             — returns admin JWT
  POST /forgot-password   — sends reset token (SMTP or dev response)
  POST /reset-password    — consumes reset token
  GET  /me                — returns current admin profile
  POST /change-password   — authenticated, requires current password
  GET  /admins            — list admins (admin only)
  POST /admins            — promote a user or invite a new email (admin only)
  DELETE /admins/{id}     — revoke admin access (admin only)
"""
from __future__ import annotations

import hmac
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field

from admin_auth import (
    MAX_ATTEMPTS,
    hash_password, verify_password, password_strength_issue,
    sign_admin_jwt, decode_admin_jwt,
    generate_reset_token, hash_token,
    is_locked_out, record_failed_attempt, clear_attempts,
    send_reset_email_or_log,
    get_current_admin_flex,
)
from audit import record as audit_record
from config import ADMIN_EMAILS, IS_DEV, FRONTEND_URL as SITE_URL
from db import users, db

router = APIRouter(prefix='/admin-auth', tags=['admin-auth'])
logger = logging.getLogger('wehive.admin_auth')

login_attempts = db['login_attempts']
password_reset_tokens = db['password_reset_tokens']


FRONTEND_URL = os.environ.get('FRONTEND_URL') or os.environ.get('PUBLIC_APP_URL') or ''


def _public_admin(u: dict) -> dict:
    return {
        'id': u['_id'],
        'name': u.get('name'),
        'email': u.get('email'),
        'phone': u.get('phone'),
        'is_admin': bool(u.get('is_admin', False)),
        'is_staff': bool(u.get('is_staff', False)),
        'staff_role': u.get('staff_role'),
        'is_premium': bool(u.get('is_premium', False)),
        'has_password': bool(u.get('password_hash')),
        'password_updated_at': u.get('password_updated_at').isoformat() if isinstance(u.get('password_updated_at'), datetime) else u.get('password_updated_at'),
        'created_at': u.get('created_at').isoformat() if isinstance(u.get('created_at'), datetime) else u.get('created_at'),
    }


# ---------- seed ----------
async def _seed_one(email: str, pwd: str, name: str) -> None:
    """Upsert a single admin account with the given credentials.

    Always re-hashes the password on boot so that rotating it in .env is
    immediately reflected, and the seeded admin can never get locked out
    of the dashboard."""
    email = email.strip().lower()
    pwd = pwd.strip()
    if not email or not pwd:
        return
    now = datetime.utcnow()
    # Clear stale lockouts so the seed account is always reachable.
    try:
        await login_attempts.delete_one({'_id': f'admin:{email}'})
    except Exception:
        pass
    pwd_hash = hash_password(pwd)
    existing = await users.find_one({'email': email})
    if existing is None:
        await users.insert_one({
            '_id': str(uuid.uuid4()),
            'email': email,
            'name': name or 'Admin',
            'is_admin': True,
            'is_staff': False,
            'is_premium': False,
            'email_verified': True,
            'phone_verified': False,
            'password_hash': pwd_hash,
            'password_updated_at': now,
            'created_at': now,
            'updated_at': now,
        })
    else:
        await users.update_one(
            {'_id': existing['_id']},
            {'$set': {
                'is_admin': True,
                'name': existing.get('name') or name,
                'password_hash': pwd_hash,
                'password_updated_at': now,
                'updated_at': now,
            }},
        )


async def ensure_seed_admin() -> None:
    """Bootstrap super-admin accounts from env on startup.

    1. ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD + ADMIN_SEED_NAME — primary.
    2. ADMIN_SEEDS_JSON — JSON array of additional {email,password,name}.
    All seeds are re-hashed every boot so password rotations in .env take
    effect immediately.
    """
    # Primary
    await _seed_one(
        os.environ.get('ADMIN_SEED_EMAIL', ''),
        os.environ.get('ADMIN_SEED_PASSWORD', ''),
        os.environ.get('ADMIN_SEED_NAME', 'Super Admin'),
    )
    # Additional
    extra_raw = os.environ.get('ADMIN_SEEDS_JSON', '').strip()
    if extra_raw:
        import json
        try:
            extras = json.loads(extra_raw)
            if isinstance(extras, list):
                for e in extras:
                    if not isinstance(e, dict):
                        continue
                    await _seed_one(
                        e.get('email', ''),
                        e.get('password', ''),
                        e.get('name', 'Admin'),
                    )
        except json.JSONDecodeError as ex:
            import logging
            logging.getLogger('wehive.seed').warning('ADMIN_SEEDS_JSON parse failed: %s', ex)


# ---------- schemas ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=2)
    bootstrap_token: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ---------- signup ----------
@router.post('/signup')
async def admin_signup(req: SignupRequest, bg: BackgroundTasks = None,
                       authorization: Optional[str] = Header(default=None)):
    # Signup requires an authenticated admin, or a one-time bootstrap when no
    # password-holding admin exists yet and ADMIN_BOOTSTRAP_TOKEN matches.
    if authorization:
        await get_current_admin_flex(authorization)
    else:
        bootstrap = os.environ.get('ADMIN_BOOTSTRAP_TOKEN', '')
        if not (bootstrap and req.bootstrap_token
                and hmac.compare_digest(bootstrap, req.bootstrap_token)
                and await users.count_documents({'is_admin': True, 'password_hash': {'$nin': [None, '']}}) == 0):
            raise HTTPException(403, 'Admin signup requires an existing admin.')

    email = req.email.lower().strip()
    if email not in ADMIN_EMAILS:
        raise HTTPException(403, 'This email is not authorised for admin signup. Contact your super admin.')
    issue = password_strength_issue(req.password)
    if issue:
        raise HTTPException(400, issue)

    now = datetime.utcnow()
    existing = await users.find_one({'email': email})
    is_new_admin = False
    if existing and existing.get('password_hash'):
        raise HTTPException(409, 'An admin account already exists for this email. Use login or forgot password.')

    if existing:
        await users.update_one(
            {'_id': existing['_id']},
            {'$set': {
                'name': req.name.strip(),
                'password_hash': hash_password(req.password),
                'password_updated_at': now,
                'is_admin': True,
                'email_verified': True,
                'updated_at': now,
            }},
        )
        uid = existing['_id']
    else:
        is_new_admin = True
        uid = str(uuid.uuid4())
        await users.insert_one({
            '_id': uid,
            'email': email,
            'name': req.name.strip(),
            'password_hash': hash_password(req.password),
            'password_updated_at': now,
            'is_admin': True,
            'is_staff': False,
            'is_premium': False,
            'email_verified': True,
            'phone_verified': False,
            'created_at': now,
            'updated_at': now,
        })

    fresh = await users.find_one({'_id': uid})
    token = sign_admin_jwt(uid)

    if is_new_admin:
        from email_service import build_welcome_html, send_email
        bg.add_task(
            send_email,
            to_email=email,
            subject='Our Ambition. Our Guidance. No Frontiers (Admin)',
            html_body=build_welcome_html(req.name.strip()),
            text_body=f'Our Ambition. Our Guidance. No Frontiers. Your admin account is ready.',
        )

    return {'access_token': token, 'token_type': 'bearer', 'user': _public_admin(fresh)}


# ---------- login ----------
@router.post('/login')
async def admin_login(req: LoginRequest):
    email = req.email.lower().strip()
    identifier = f'admin:{email}'

    locked, seconds = await is_locked_out(login_attempts, identifier)
    if locked:
        raise HTTPException(
            429,
            f'Too many failed attempts. Try again in {max(1, seconds // 60)} minute(s).',
        )

    user = await users.find_one({'email': email})
    pw_hash = user.get('password_hash') if user else None
    if not user or not pw_hash:
        await record_failed_attempt(login_attempts, identifier)
        raise HTTPException(401, 'Invalid email or password.')

    if not verify_password(req.password, pw_hash):
        await record_failed_attempt(login_attempts, identifier)
        attempts_left = MAX_ATTEMPTS - ((await login_attempts.find_one({'_id': identifier}) or {}).get('count', 0))
        if attempts_left <= 0:
            raise HTTPException(429, 'Too many failed attempts. Your account is locked for 15 minutes.')
        raise HTTPException(401, f'Invalid email or password. {attempts_left} attempt(s) remaining.')

    if not user.get('is_admin') and email not in ADMIN_EMAILS:
        raise HTTPException(403, 'This account is not authorised for admin access.')

    # Promote to admin if email is allow-listed but flag wasn't set
    if not user.get('is_admin'):
        await users.update_one({'_id': user['_id']}, {'$set': {'is_admin': True}})
        user['is_admin'] = True

    await clear_attempts(login_attempts, identifier)
    token = sign_admin_jwt(user['_id'])
    return {'access_token': token, 'token_type': 'bearer', 'user': _public_admin(user)}


# ---------- forgot password ----------
@router.post('/forgot-password')
async def admin_forgot(req: ForgotRequest):
    email = req.email.lower().strip()
    # Always respond the same way to avoid email enumeration
    ok_response = {'ok': True, 'message': 'If an admin account exists for this email, a reset link has been sent.'}

    user = await users.find_one({'email': email})
    if not user or not (user.get('is_admin') or email in ADMIN_EMAILS):
        return ok_response

    raw, digest, expires = generate_reset_token()
    await password_reset_tokens.insert_one({
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'email': email,
        'token_hash': digest,
        'expires_at': expires,
        'used_at': None,
        'created_at': datetime.utcnow(),
    })

    # Best-effort frontend URL for the reset link
    front = FRONTEND_URL or SITE_URL
    result = await send_reset_email_or_log(email, raw, front)
    if not result['sent']:
        logger.warning('Admin password reset email could not be sent (email service unavailable)')
    return ok_response


# ---------- reset password ----------
@router.post('/reset-password')
async def admin_reset(req: ResetRequest):
    issue = password_strength_issue(req.new_password)
    if issue:
        raise HTTPException(400, issue)

    digest = hash_token(req.token.strip())
    rec = await password_reset_tokens.find_one({'token_hash': digest})
    if not rec:
        raise HTTPException(400, 'Invalid or already-used reset token.')
    if rec.get('used_at') is not None:
        raise HTTPException(400, 'This reset link has already been used.')
    if rec['expires_at'] < datetime.utcnow():
        raise HTTPException(400, 'Reset link has expired. Request a new one.')

    now = datetime.utcnow()
    await users.update_one(
        {'_id': rec['user_id']},
        {'$set': {
            'password_hash': hash_password(req.new_password),
            'password_updated_at': now,
            'updated_at': now,
        }},
    )
    await password_reset_tokens.update_one(
        {'_id': rec['_id']},
        {'$set': {'used_at': now}},
    )
    # Invalidate lockout for this account
    await clear_attempts(login_attempts, f'admin:{rec["email"]}')

    user = await users.find_one({'_id': rec['user_id']})
    token = sign_admin_jwt(user['_id'])
    return {'access_token': token, 'token_type': 'bearer', 'user': _public_admin(user)}


# ---------- change password ----------
@router.post('/change-password')
async def admin_change_password(req: ChangePasswordRequest, admin=Depends(get_current_admin_flex)):
    pw_hash = admin.get('password_hash')
    if not pw_hash:
        raise HTTPException(400, 'No password set on this account. Use forgot-password to create one.')
    if not verify_password(req.current_password, pw_hash):
        raise HTTPException(401, 'Current password is incorrect.')
    issue = password_strength_issue(req.new_password)
    if issue:
        raise HTTPException(400, issue)
    now = datetime.utcnow()
    await users.update_one(
        {'_id': admin['_id']},
        {'$set': {
            'password_hash': hash_password(req.new_password),
            'password_updated_at': now,
            'updated_at': now,
        }},
    )
    return {'ok': True}


# ---------- me ----------
@router.get('/me')
async def admin_me(admin=Depends(get_current_admin_flex)):
    return _public_admin(admin)


# ---------- manage admins ----------
INVITE_TTL = timedelta(hours=72)


class AdminInviteRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = Field(None, max_length=80)


def _admin_row(u: dict) -> dict:
    # env_managed admins come from ADMIN_EMAILS and can only be removed there.
    return {**_public_admin(u), 'env_managed': (u.get('email') or '').lower() in ADMIN_EMAILS}


async def _send_admin_invite(email: str, raw_token: str, inviter: str) -> tuple[bool, str]:
    from email_service import _wrap_html, send_email

    link = f'{(FRONTEND_URL or SITE_URL).rstrip("/")}/admin/reset-password?token={raw_token}&invite=1'
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#0B1220;margin:0 0 16px 0">Hello,</p>
      <p style="font-size:14px;color:#4A5568;margin:0 0 20px 0;line-height:1.6">{inviter} has made you an admin on We Hive. Set a password to sign in to the admin dashboard.</p>
      <p style="text-align:center;margin:0 0 20px 0"><a href="{link}" style="display:inline-block;background:#B31942;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Set your password</a></p>
      <p style="font-size:12px;color:#4A5568;margin:0;line-height:1.6">This link works once and expires in 72 hours.</p>
    </td></tr>
    """
    sent = await send_email(
        to_email=email,
        subject='You have been made a We Hive admin',
        html_body=_wrap_html('Admin invitation', content),
        text_body=f'{inviter} has made you a We Hive admin. Set your password: {link}',
    )
    return sent, link


@router.get('/admins')
async def list_admins(_admin=Depends(get_current_admin_flex)):
    cur = users.find({'$or': [{'is_admin': True}, {'email': {'$in': list(ADMIN_EMAILS)}}]}).sort('created_at', 1)
    return {'items': [_admin_row(u) async for u in cur]}


@router.post('/admins')
async def add_admin(req: AdminInviteRequest, admin=Depends(get_current_admin_flex)):
    """Promote an existing account, or create one, and email a set-password
    invite when the account has no password yet. Calling it again for an
    admin who hasn't set a password re-sends the invite."""
    email = req.email.lower().strip()
    now = datetime.utcnow()
    user = await users.find_one({'email': email})
    if user and user.get('is_admin') and user.get('password_hash'):
        raise HTTPException(409, 'This person is already an admin.')

    if user:
        uid = user['_id']
        await users.update_one({'_id': uid}, {'$set': {'is_admin': True, 'updated_at': now}})
    else:
        uid = str(uuid.uuid4())
        await users.insert_one({
            '_id': uid,
            'email': email,
            'name': (req.name or '').strip() or email.split('@')[0],
            'is_admin': True,
            'is_staff': False,
            'is_premium': False,
            'email_verified': False,
            'phone_verified': False,
            'created_at': now,
            'updated_at': now,
        })
    fresh = await users.find_one({'_id': uid})

    invited, email_sent, invite_link = False, False, None
    if not fresh.get('password_hash'):
        # Only the newest invite link stays valid.
        await password_reset_tokens.update_many(
            {'user_id': uid, 'purpose': 'admin_invite', 'used_at': None}, {'$set': {'used_at': now}})
        raw, digest, _ = generate_reset_token()
        await password_reset_tokens.insert_one({
            '_id': str(uuid.uuid4()),
            'user_id': uid,
            'email': email,
            'token_hash': digest,
            'purpose': 'admin_invite',
            'expires_at': now + INVITE_TTL,
            'used_at': None,
            'created_at': now,
        })
        invited = True
        email_sent, link = await _send_admin_invite(email, raw, admin.get('name') or admin.get('email') or 'An admin')
        if not email_sent:
            logger.warning('Admin invite email could not be sent')
            # Without working email the inviting admin has to pass the link on.
            invite_link = link
            if IS_DEV:
                logger.info('DEV admin invite link: %s', link)

    await audit_record(admin, 'update' if user else 'create', 'admin', uid,
                       extra={'email': email, 'granted': 'admin', 'invited': invited})
    return {'ok': True, 'admin': _admin_row(fresh), 'invited': invited,
            'email_sent': email_sent, 'invite_link': invite_link}


@router.delete('/admins/{user_id}')
async def remove_admin(user_id: str, admin=Depends(get_current_admin_flex)):
    if user_id == admin['_id']:
        raise HTTPException(400, "You can't remove your own admin access.")
    user = await users.find_one({'_id': user_id})
    email = ((user or {}).get('email') or '').lower()
    if not user or not (user.get('is_admin') or email in ADMIN_EMAILS):
        raise HTTPException(404, 'Admin not found.')
    if email in ADMIN_EMAILS:
        raise HTTPException(400, "This admin is set in the server's ADMIN_EMAILS setting. Remove them there.")
    if await users.count_documents({'is_admin': True, '_id': {'$ne': user_id}}) == 0:
        raise HTTPException(400, "You can't remove the last admin.")

    now = datetime.utcnow()
    await users.update_one({'_id': user_id}, {'$set': {'is_admin': False, 'updated_at': now}})
    await password_reset_tokens.update_many({'user_id': user_id, 'used_at': None}, {'$set': {'used_at': now}})
    await audit_record(admin, 'delete', 'admin', user_id, extra={'email': email, 'revoked': 'admin'})
    return {'ok': True}
