"""Referral program — unique codes, tracking, rewards."""

from __future__ import annotations

import os
import uuid
import string
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth_utils import get_current_user
from core.db import db, users, referrals_col
from core.constants import REFERRAL_REWARD_INR

router = APIRouter(prefix='/referrals', tags=['referrals'])


def _gen_code(length=8):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


class CreateCodeResponse(BaseModel):
    code: str
    share_url: str
    share_text: str


class ClaimRequest(BaseModel):
    referrer_code: str


def _get_base_url():
    return os.environ.get('FRONTEND_URL') or os.environ.get('PUBLIC_APP_URL') or 'https://wehive.in'


@router.post('/code', response_model=CreateCodeResponse)
async def create_or_get_code(user=Depends(get_current_user)):
    """Get existing code or create new one for this user."""
    existing = await referrals_col.find_one({'user_id': user['_id']})
    if existing:
        code = existing['code']
    else:
        code = _gen_code()
        while await referrals_col.find_one({'code': code}):
            code = _gen_code()
        await referrals_col.insert_one({
            '_id': str(uuid.uuid4()),
            'user_id': user['_id'],
            'code': code,
            'created_at': datetime.utcnow(),
        })

    base = _get_base_url()
    share_url = f"{base}/signup?ref={code}"
    share_text = f"Apply for your visa with WeHive — use my referral code {code} to get ₹{REFERRAL_REWARD_INR} off your first application!"

    return CreateCodeResponse(
        code=code,
        share_url=share_url,
        share_text=share_text,
    )


@router.get('/stats')
async def referral_stats(user=Depends(get_current_user)):
    ref_doc = await referrals_col.find_one({'user_id': user['_id']})
    if not ref_doc:
        return {
            'code': None,
            'total_referrals': 0,
            'total_earned': 0,
            'pending_reward': 0,
            'transactions': [],
        }

    txns = []
    total = 0
    async for t in db['referral_transactions'].find({'referrer_id': user['_id']}).sort('created_at', -1).limit(50):
        t['id'] = t.pop('_id')
        if t.get('status') == 'earned':
            total += t.get('amount_inr', 0)
        txns.append(t)

    return {
        'code': ref_doc['code'],
        'total_referrals': ref_doc.get('total_referrals', 0),
        'total_earned': total,
        'pending_reward': ref_doc.get('pending_reward', 0),
        'transactions': txns,
    }


@router.post('/claim')
async def claim_referral(req: ClaimRequest, user=Depends(get_current_user)):
    """Claim a referral code during signup (attaches referrer to new user)."""
    code = req.referrer_code.strip().upper()
    if not code:
        raise HTTPException(400, 'Referral code is required')

    referrer = await referrals_col.find_one({'code': code})
    if not referrer:
        raise HTTPException(404, 'Invalid referral code')

    if referrer['user_id'] == user['_id']:
        raise HTTPException(400, 'You cannot use your own referral code')

    await db['referral_transactions'].update_one(
        {'_id': f'pending-{user["_id"]}'},
        {'$setOnInsert': {
            '_id': f'pending-{user["_id"]}',
            'referrer_id': referrer['user_id'],
            'referred_id': user['_id'],
            'referred_email': user.get('email') or '',
            'amount_inr': REFERRAL_REWARD_INR,
            'status': 'pending',
            'created_at': datetime.utcnow(),
        }},
        upsert=True,
    )
    return {'ok': True, 'message': f'Referral code applied! {REFERRAL_REWARD_INR} credit will be added once you complete your first paid application.'}


@router.post('/reward')
async def process_reward(referred_user_id: str, user=Depends(get_current_user)):
    """Called internally when a referred user makes their first payment. Credits referrer."""
    referred = await users.find_one({'_id': referred_user_id})
    if not referred:
        raise HTTPException(404, 'User not found')

    txn = await db['referral_transactions'].find_one_and_update(
        {'_id': f'pending-{referred_user_id}', 'status': 'pending'},
        {'$set': {
            'status': 'earned',
            'converted_at': datetime.utcnow(),
        }},
        return_document=True,
    )
    if not txn:
        return {'ok': True, 'message': 'No pending referral found'}

    await referrals_col.update_one(
        {'user_id': referred.get('referred_by_user_id') or txn.get('referrer_id')},
        {'$inc': {'total_referrals': 1}}
    )
    return {'ok': True, 'message': f'Referrer credited with ₹{REFERRAL_REWARD_INR}'}


@router.get('/my-code')
async def get_my_code(user=Depends(get_current_user)):
    doc = await referrals_col.find_one({'user_id': user['_id']})
    return {'code': doc['code'] if doc else None} if doc else {'code': None}