import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.auth_utils import get_current_user
from core.db import db, users

router = APIRouter(prefix='/users/me/shortlist', tags=['shortlist'])


class ShortlistItem(BaseModel):
    university_id: str
    university_name: str
    short_name: str
    country: str
    flag: str
    rank: int
    tuition_usd: int
    added_at: datetime


class ShortlistShare(BaseModel):
    universities: List[dict]
    created_at: datetime
    share_token: str


@router.get('')
async def get_shortlist(user=Depends(get_current_user)):
    u = await users.find_one({'_id': user['_id']})
    return u.get('shortlist', [])


@router.post('/{university_id}')
async def add_to_shortlist(university_id: str, user=Depends(get_current_user)):
    from shared.data import UNIVERSITIES
    uni = next((u for u in UNIVERSITIES if u['id'] == university_id), None)
    if not uni:
        raise HTTPException(404, 'University not found')

    item = {
        'university_id': university_id,
        'university_name': uni['name'],
        'short_name': uni['short_name'],
        'country': uni['country'],
        'flag': uni['flag'],
        'rank': uni['rank'],
        'tuition_usd': uni['tuition_usd'],
        'added_at': datetime.utcnow(),
    }

    await users.update_one(
        {'_id': user['_id']},
        {'$pull': {'shortlist': {'university_id': university_id}}}
    )
    await users.update_one(
        {'_id': user['_id']},
        {'$push': {'shortlist': item}}
    )
    return {'ok': True, 'item': item}


@router.delete('/{university_id}')
async def remove_from_shortlist(university_id: str, user=Depends(get_current_user)):
    await users.update_one(
        {'_id': user['_id']},
        {'$pull': {'shortlist': {'university_id': university_id}}}
    )
    return {'ok': True}


@router.get('/share/{token}')
async def get_shared_shortlist(token: str):
    doc = await db.shared_shortlists.find_one({'share_token': token})
    if not doc:
        raise HTTPException(404, 'Share link not found or expired')
    return doc['universities']


@router.post('/share')
async def create_share_link(user=Depends(get_current_user)):
    u = await users.find_one({'_id': user['_id']})
    shortlist = u.get('shortlist', [])
    if not shortlist:
        raise HTTPException(400, 'Shortlist is empty')

    token = str(uuid.uuid4())[:12]
    doc = {
        'share_token': token,
        'user_id': user['_id'],
        'universities': shortlist,
        'created_at': datetime.utcnow(),
    }
    await db.shared_shortlists.insert_one(doc)
    return {'share_url': f'/shared/{token}', 'token': token}