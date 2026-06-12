"""Promotion code routes — admin creates, users redeem."""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from db import db
from auth_utils import get_current_user
from admin_auth import get_current_admin_flex as get_current_admin

router = APIRouter(prefix='/promotions', tags=['promotions'])


class CreatePromoRequest(BaseModel):
    code: str
    description: str
    discount_percent: int
    discount_fixed: Optional[float] = 0
    max_uses: int = 100
    expires_at: str
    season: str = 'all'
    min_cart_value: float = 0
    applicable_visa_types: List[str] = ['Tourist', 'Business', 'Student', 'Work']


@router.post('/create')
async def create_promo(req: CreatePromoRequest, admin=Depends(get_current_admin)):
    existing = await db.promo_codes.find_one({'code': req.code.upper()})
    if existing:
        raise HTTPException(400, 'Promo code already exists')
    promo = {
        '_id': str(uuid.uuid4()),
        'code': req.code.upper(),
        'description': req.description,
        'discount_percent': req.discount_percent,
        'discount_fixed': req.discount_fixed or 0,
        'max_uses': req.max_uses,
        'used_count': 0,
        'expires_at': datetime.fromisoformat(req.expires_at),
        'season': req.season,
        'min_cart_value': req.min_cart_value,
        'applicable_visa_types': req.applicable_visa_types,
        'active': True,
        'created_at': datetime.utcnow(),
    }
    await db.promo_codes.insert_one(promo)
    return promo


@router.get('')
async def list_promos(season: Optional[str] = None, admin=Depends(get_current_admin)):
    query = {}
    if season:
        query['season'] = season
    promos = await db.promo_codes.find(query).sort('created_at', -1).to_list(100)
    return promos


@router.get('/active')
async def get_active_promos(season: Optional[str] = None, visa_type: Optional[str] = None):
    query = {'active': True, 'expires_at': {'$gte': datetime.utcnow()}}
    if season:
        query['season'] = season
    if season == 'all':
        query.pop('season', None)
    promos = await db.promo_codes.find(query).sort('created_at', -1).to_list(50)
    result = []
    for p in promos:
        if visa_type and visa_type not in p.get('applicable_visa_types', []):
            continue
        if p.get('used_count', 0) >= p.get('max_uses', 100):
            continue
        result.append({
            'code': p['code'],
            'description': p['description'],
            'discount_percent': p['discount_percent'],
            'discount_fixed': p.get('discount_fixed', 0),
            'season': p.get('season', 'all'),
            'min_cart_value': p.get('min_cart_value', 0),
        })
    return result


@router.post('/validate')
async def validate_promo(code: str = Body(...), visa_type: Optional[str] = Body(None), cart_value: float = Body(0)):
    promo = await db.promo_codes.find_one({'code': code.upper(), 'active': True})
    if not promo:
        raise HTTPException(404, 'Invalid promo code')
    if promo['expires_at'] < datetime.utcnow():
        raise HTTPException(400, 'Promo code has expired')
    if promo.get('used_count', 0) >= promo.get('max_uses', 100):
        raise HTTPException(400, 'Promo code has reached maximum uses')
    if visa_type and visa_type not in promo.get('applicable_visa_types', []):
        raise HTTPException(400, 'Promo code not applicable for this visa type')
    if cart_value < promo.get('min_cart_value', 0):
        raise HTTPException(400, f'Minimum cart value of ${promo["min_cart_value"]} required')
    return {
        'valid': True,
        'code': promo['code'],
        'discount_percent': promo['discount_percent'],
        'discount_fixed': promo.get('discount_fixed', 0),
        'description': promo['description'],
    }


@router.post('/redeem')
async def redeem_promo(code: str = Body(...), user=Depends(get_current_user)):
    promo = await db.promo_codes.find_one({'code': code.upper(), 'active': True})
    if not promo or promo['expires_at'] < datetime.utcnow():
        raise HTTPException(400, 'Invalid or expired promo code')
    if promo.get('used_count', 0) >= promo.get('max_uses', 100):
        raise HTTPException(400, 'Promo code fully redeemed')
    await db.promo_codes.update_one({'_id': promo['_id']}, {'$inc': {'used_count': 1}})
    return {'message': 'Promo code applied', 'discount_percent': promo['discount_percent'], 'discount_fixed': promo.get('discount_fixed', 0)}


@router.delete('/{code}')
async def delete_promo(code: str, admin=Depends(get_current_admin)):
    await db.promo_codes.delete_one({'code': code.upper()})
    return {'message': 'Promo code deleted'}


@router.put('/{code}/toggle')
async def toggle_promo(code: str, admin=Depends(get_current_admin)):
    promo = await db.promo_codes.find_one({'code': code.upper()})
    if not promo:
        raise HTTPException(404, 'Promo code not found')
    await db.promo_codes.update_one({'_id': promo['_id']}, {'$set': {'active': not promo.get('active', True)}})
    return {'active': not promo.get('active', True)}


# Seasons configuration
SEASONS = [
    {'id': 'summer', 'label': 'Summer (May-Jul)', 'months': [5, 6, 7]},
    {'id': 'fall', 'label': 'Fall (Aug-Oct)', 'months': [8, 9, 10]},
    {'id': 'winter', 'label': 'Winter (Nov-Jan)', 'months': [11, 12, 1]},
    {'id': 'spring', 'label': 'Spring (Feb-Apr)', 'months': [2, 3, 4]},
    {'id': 'student_intake', 'label': 'Student Intake (Aug-Sep)', 'months': [8, 9]},
    {'id': 'holiday', 'label': 'Holiday Season (Dec)', 'months': [12]},
    {'id': 'all', 'label': 'All Seasons', 'months': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
]

@router.get('/seasons')
async def get_seasons():
    return SEASONS


@router.get('/current-season')
async def get_current_season():
    month = datetime.utcnow().month
    for s in SEASONS:
        if month in s['months']:
            return {'season': s['id'], 'label': s['label']}
    return {'season': 'all', 'label': 'All Seasons'}
