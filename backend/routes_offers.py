"""Offer & Campus Marketplace — offers, lead claims, scoring, bot cycle.

Multi-tenant brand/offer marketplace. Brands post offers; users claim leads;
each claim is scored hot/warm/cold. A 6-hour bot cycle promotes expired offers
and re-scores stale claims. Admin manages offers + claims; users browse + claim.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from audit import record as audit_record
from auth_utils import get_current_user
from db import db, offers_col, offer_claims_col, offer_bot_runs_col
from rate_limit import RateLimit

router = APIRouter(prefix='/offers', tags=['offers'])
admin_router = APIRouter(prefix='/admin/offers', tags=['admin-offers'])

_claim_limiter = RateLimit(max_calls=10, window_seconds=3600)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class OfferIn(BaseModel):
    brand: str
    title: str
    description: str = ''
    reward: str = ''
    tier: str = 'open'            # 'open' | 'premium' | 'both'
    quota: Optional[int] = None    # max claims; None = unlimited
    expires_at: Optional[datetime] = None
    active: bool = True

class OfferOut(OfferIn):
    id: str
    created_at: datetime
    claim_count: int


def _out(o: dict) -> dict:
    o = dict(o)
    o['id'] = str(o.pop('_id'))
    o.setdefault('created_at', datetime.utcnow())
    return o


def _oid(raw: str):
    """Accept an ObjectId hex string (what we return as `id`) or a UUID string."""
    from bson.objectid import ObjectId
    try:
        return ObjectId(raw)
    except Exception:
        return uuid.UUID(raw)


# ---------------------------------------------------------------------------
# Lead scoring
# ---------------------------------------------------------------------------

def _score(user: dict, offer: dict) -> tuple[str, dict]:
    """Return (label, breakdown). Premium users + active referrals bump score."""
    points = 0
    reasons = []
    if user.get('is_premium'):
        points += 40
        reasons.append('premium')
    referral_count = int(user.get('referral_count') or 0)
    if referral_count:
        points += min(referral_count * 5, 30)
        reasons.append(f'referrals:{referral_count}')
    # Offer-specific weighting: premium tier offers are worth more leads.
    if offer.get('tier') == 'premium':
        points += 10
    if points >= 60:
        return 'hot', {'points': points, 'reasons': reasons}
    if points >= 30:
        return 'warm', {'points': points, 'reasons': reasons}
    return 'cold', {'points': points, 'reasons': reasons}


# ---------------------------------------------------------------------------
# Bot cycle (6-hour): expire offers, re-score stale claims
# ---------------------------------------------------------------------------

async def run_offer_bot() -> dict:
    now = datetime.utcnow()
    expired = 0
    async for o in offers_col.find({'active': True, 'expires_at': {'$lt': now}}):
        await offers_col.update_one({'_id': o['_id']}, {'$set': {'active': False}})
        expired += 1
    # Re-score claims older than 24h that are still cold — re-evaluate tier/referrals.
    cutoff = now - timedelta(hours=24)
    rescoped = 0
    async for c in offer_claims_col.find({'score': 'cold', 'created_at': {'$lt': cutoff}}):
        offer = await offers_col.find_one({'_id': c['offer_id']})
        user = await db['users'].find_one({'_id': c['user_id']})
        if offer and user:
            label, breakdown = _score(user, offer)
            if label != 'cold':
                await offer_claims_col.update_one(
                    {'_id': c['_id']},
                    {'$set': {'score': label, 'score_detail': breakdown, 'rescored_at': now}},
                )
                rescoped += 1
    run = {
        'id': str(uuid.uuid4()),
        'ran_at': now,
        'expired_offers': expired,
        'rescoped_claims': rescoped,
    }
    await offer_bot_runs_col.insert_one(run)
    run.pop('_id', None)  # insert_one mutates the dict with an ObjectId _id
    return run


# ---------------------------------------------------------------------------
# Public routes (user)
# ---------------------------------------------------------------------------

@router.get('', response_model=list[OfferOut])
async def list_offers(active: bool = True, brand: Optional[str] = None):
    q: dict = {}
    if active:
        q['active'] = True
    if brand:
        q['brand'] = brand
    out = []
    async for o in offers_col.find(q).sort('created_at', -1).limit(200):
        out.append(_out(o))
    # Attach live claim counts
    for o in out:
        o['claim_count'] = await offer_claims_col.count_documents({'offer_id': o['id']})
    return out


@router.get('/bot-status')
async def bot_status():
    last = await offer_bot_runs_col.find_one(sort=[('ran_at', -1)])
    if last:
        last = dict(last)
        last.pop('_id', None)  # keep the uuid 'id' string, drop the Mongo _id
    return {'last_run': last} if last else {'last_run': None}


# ---------------------------------------------------------------------------
# Claim route (user, rate-limited)
# ---------------------------------------------------------------------------

class ClaimIn(BaseModel):
    offer_id: str
    consent: bool = False

@router.post('/claim', dependencies=[Depends(_claim_limiter)])
async def claim_offer(body: ClaimIn, user=Depends(get_current_user)):
    if not body.consent:
        raise HTTPException(400, 'Consent to process this lead is required (DPDP).')
    offer = await offers_col.find_one({'_id': _oid(body.offer_id), 'active': True})
    if not offer:
        raise HTTPException(404, 'Offer not found or closed.')
    if offer.get('tier') == 'premium' and not user.get('is_premium'):
        raise HTTPException(402, 'This offer is for premium members.')
    if offer.get('quota') is not None:
        claimed = await offer_claims_col.count_documents({'offer_id': str(offer['_id'])})
        if claimed >= offer['quota']:
            raise HTTPException(409, 'Offer quota is full.')
    # One claim per user per offer
    exists = await offer_claims_col.find_one({'offer_id': str(offer['_id']), 'user_id': user['_id']})
    if exists:
        raise HTTPException(409, 'You have already claimed this offer.')
    label, breakdown = _score(user, offer)
    claim = {
        'offer_id': str(offer['_id']),
        'brand': offer['brand'],
        'user_id': user['_id'],
        'user_email': user.get('email'),
        'user_phone': user.get('phone'),
        'score': label,
        'score_detail': breakdown,
        'consent': True,
        'created_at': datetime.utcnow(),
    }
    res = await offer_claims_col.insert_one(claim)
    return {'id': str(res.inserted_id), 'score': label, 'breakdown': breakdown}


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

@admin_router.post('', response_model=OfferOut)
async def create_offer(body: OfferIn, admin=Depends(get_current_admin_flex)):
    doc = body.model_dump(exclude_none=True)
    doc['created_at'] = datetime.utcnow()
    res = await offers_col.insert_one(doc)
    doc['id'] = str(res.inserted_id)
    doc['claim_count'] = 0
    await audit_record(admin, 'create', 'offer', doc['id'], extra={'brand': doc['brand']})
    return doc


@admin_router.patch('/{offer_id}')
async def update_offer(offer_id: str, patch: dict, admin=Depends(get_current_admin_flex)):
    offer = await offers_col.find_one({'_id': _oid(offer_id)})
    if not offer:
        raise HTTPException(404, 'Offer not found.')
    for k, v in patch.items():
        if k in ('tier', 'quota', 'active', 'expires_at', 'brand', 'title', 'description', 'reward'):
            await offers_col.update_one({'_id': offer['_id']}, {'$set': {k: v}})
    await audit_record(admin, 'update', 'offer', offer_id, before=offer, extra=patch)
    return {'ok': True}


@admin_router.delete('/{offer_id}')
async def delete_offer(offer_id: str, admin=Depends(get_current_admin_flex)):
    res = await offers_col.delete_one({'_id': _oid(offer_id)})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Offer not found.')
    await offer_claims_col.delete_many({'offer_id': offer_id})
    await audit_record(admin, 'delete', 'offer', offer_id)
    return {'ok': True}


class ClaimOut(BaseModel):
    id: str
    offer_id: str
    brand: str
    user_email: Optional[str]
    user_phone: Optional[str]
    score: str
    consent: bool
    created_at: datetime

@admin_router.get('/claims', response_model=list[ClaimOut])
async def list_claims(offer_id: Optional[str] = None, score: Optional[str] = None,
                      limit: int = Query(200, le=500), admin=Depends(get_current_admin_flex)):
    q: dict = {}
    if offer_id:
        q['offer_id'] = offer_id
    if score:
        q['score'] = score
    out = []
    async for c in offer_claims_col.find(q).sort('created_at', -1).limit(limit):
        c = dict(c)
        c['id'] = str(c.pop('_id'))
        out.append(c)
    return out


@admin_router.get('/stats')
async def stats(admin=Depends(get_current_admin_flex)):
    total_offers = await offers_col.count_documents({})
    active_offers = await offers_col.count_documents({'active': True})
    total_claims = await offer_claims_col.count_documents({})
    hot = await offer_claims_col.count_documents({'score': 'hot'})
    warm = await offer_claims_col.count_documents({'score': 'warm'})
    cold = await offer_claims_col.count_documents({'score': 'cold'})
    return {
        'total_offers': total_offers, 'active_offers': active_offers,
        'total_claims': total_claims, 'hot': hot, 'warm': warm, 'cold': cold,
    }


@admin_router.post('/bot-run')
async def trigger_bot(admin=Depends(get_current_admin_flex)):
    result = await run_offer_bot()
    await audit_record(admin, 'bot-run', 'offer', extra=result)
    return result
