"""Campus ecosystem — TPOs, student leaders, clubs, ambassadors.

Public browse for clubs (no PII); admin manages TPOs, leaders, clubs and
ambassadors with a verification queue.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from admin_auth import get_current_admin_flex
from audit import record as audit_record
from db import (campus_tpos_col, campus_leaders_col,
                campus_clubs_col, campus_ambassadors_col)


def _oid(raw: str):
    from bson.objectid import ObjectId
    try:
        return ObjectId(raw)
    except Exception:
        raise ValueError('invalid id: ' + raw)

router = APIRouter(prefix='/campus', tags=['campus'])
admin_router = APIRouter(prefix='/admin/campus', tags=['admin-campus'])


def _pub(o: dict, keys: list[str]) -> dict:
    """Return only the given keys — never leak PII on public endpoints."""
    o = dict(o)
    o['id'] = str(o.pop('_id'))
    out = {k: o.get(k) for k in keys}
    out['id'] = o['id']
    return out


# ---------------------------------------------------------------------------
# Public browse (clubs only, minimal fields — no PII)
# ---------------------------------------------------------------------------

@router.get('/clubs')
async def list_clubs(college: Optional[str] = None,
                    verified: bool = True, limit: int = Query(100, le=500)):
    q: dict = {}
    if verified:
        q['status'] = 'verified'
    if college:
        q['college'] = college
    out = []
    async for c in campus_clubs_col.find(q).limit(limit):
        out.append(_pub(c, ['name', 'college', 'leader_name', 'members', 'focus']))
    return out


# ---------------------------------------------------------------------------
# Admin: TPOs
# ---------------------------------------------------------------------------

class TpoIn(BaseModel):
    name: str
    contact_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    verified: bool = False

@admin_router.post('/tpos')
async def create_tpo(body: TpoIn, admin=Depends(get_current_admin_flex)):
    doc = body.model_dump(exclude_none=True)
    doc['status'] = 'verified' if doc.pop('verified') else 'pending'
    doc['created_at'] = datetime.utcnow()
    res = await campus_tpos_col.insert_one(doc)
    doc.pop('_id', None)  # insert_one mutates the dict with an ObjectId
    doc['id'] = str(res.inserted_id)
    await audit_record(admin, 'create', 'campus_tpo', doc['id'], extra={'name': doc['name']})
    return doc


@admin_router.get('/tpos')
async def list_tpos(status: Optional[str] = None, admin=Depends(get_current_admin_flex)):
    q = {'status': status} if status else {}
    out = []
    async for t in campus_tpos_col.find(q).sort('created_at', -1).limit(500):
        t = dict(t)
        t['id'] = str(t.pop('_id'))
        out.append(t)
    return out


@admin_router.patch('/tpos/{tpo_id}')
async def update_tpo(tpo_id: str, patch: dict, admin=Depends(get_current_admin_flex)):
    tpo = await campus_tpos_col.find_one({'_id': _oid(tpo_id)})
    if not tpo:
        raise HTTPException(404, 'TPO not found.')
    allowed = {'name', 'contact_name', 'email', 'phone', 'college', 'status'}
    for k, v in patch.items():
        if k in allowed:
            await campus_tpos_col.update_one({'_id': tpo['_id']}, {'$set': {k: v}})
    await audit_record(admin, 'update', 'campus_tpo', tpo_id, before=tpo, extra=patch)
    return {'ok': True}


# ---------------------------------------------------------------------------
# Admin: student leaders
# ---------------------------------------------------------------------------

class LeaderIn(BaseModel):
    name: str
    college: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    verified: bool = False

@admin_router.post('/leaders')
async def create_leader(body: LeaderIn, admin=Depends(get_current_admin_flex)):
    doc = body.model_dump(exclude_none=True)
    doc['status'] = 'verified' if doc.pop('verified') else 'pending'
    doc['created_at'] = datetime.utcnow()
    res = await campus_leaders_col.insert_one(doc)
    doc.pop('_id', None)  # insert_one mutates the dict with an ObjectId
    doc['id'] = str(res.inserted_id)
    await audit_record(admin, 'create', 'campus_leader', doc['id'])
    return doc


@admin_router.get('/leaders')
async def list_leaders(status: Optional[str] = None, admin=Depends(get_current_admin_flex)):
    q = {'status': status} if status else {}
    out = []
    async for leader_doc in campus_leaders_col.find(q).sort('created_at', -1).limit(500):
        leader_doc = dict(leader_doc)
        leader_doc['id'] = str(leader_doc.pop('_id'))
        out.append(leader_doc)
    return out


@admin_router.patch('/leaders/{leader_id}')
async def update_leader(leader_id: str, patch: dict, admin=Depends(get_current_admin_flex)):
    leader = await campus_leaders_col.find_one({'_id': _oid(leader_id)})
    if not leader:
        raise HTTPException(404, 'Leader not found.')
    allowed = {'name', 'college', 'email', 'phone', 'role', 'status'}
    for k, v in patch.items():
        if k in allowed:
            await campus_leaders_col.update_one({'_id': leader['_id']}, {'$set': {k: v}})
    await audit_record(admin, 'update', 'campus_leader', leader_id, before=leader, extra=patch)
    return {'ok': True}


# ---------------------------------------------------------------------------
# Admin: clubs
# ---------------------------------------------------------------------------

class ClubIn(BaseModel):
    name: str
    college: str
    leader_name: Optional[str] = None
    members: int = 0
    focus: Optional[str] = None
    president_email: Optional[str] = None
    president_phone: Optional[str] = None
    verified: bool = False

@admin_router.post('/clubs')
async def create_club(body: ClubIn, admin=Depends(get_current_admin_flex)):
    doc = body.model_dump(exclude_none=True)
    doc['status'] = 'verified' if doc.pop('verified') else 'pending'
    doc['created_at'] = datetime.utcnow()
    res = await campus_clubs_col.insert_one(doc)
    doc.pop('_id', None)  # insert_one mutates the dict with an ObjectId
    doc['id'] = str(res.inserted_id)
    await audit_record(admin, 'create', 'campus_club', doc['id'], extra={'name': doc['name']})
    return doc


@admin_router.get('/clubs')
async def admin_list_clubs(status: Optional[str] = None, admin=Depends(get_current_admin_flex)):
    q = {'status': status} if status else {}
    out = []
    async for c in campus_clubs_col.find(q).sort('created_at', -1).limit(500):
        c = dict(c)
        c['id'] = str(c.pop('_id'))
        out.append(c)
    return out


@admin_router.patch('/clubs/{club_id}')
async def update_club(club_id: str, patch: dict, admin=Depends(get_current_admin_flex)):
    club = await campus_clubs_col.find_one({'_id': _oid(club_id)})
    if not club:
        raise HTTPException(404, 'Club not found.')
    allowed = {'name', 'college', 'leader_name', 'members', 'focus',
               'president_email', 'president_phone', 'status'}
    for k, v in patch.items():
        if k in allowed:
            await campus_clubs_col.update_one({'_id': club['_id']}, {'$set': {k: v}})
    await audit_record(admin, 'update', 'campus_club', club_id, before=club, extra=patch)
    return {'ok': True}


# ---------------------------------------------------------------------------
# Admin: ambassadors
# ---------------------------------------------------------------------------

class AmbassadorIn(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    tier: str = 'standard'
    verified: bool = False

@admin_router.post('/ambassadors')
async def create_ambassador(body: AmbassadorIn, admin=Depends(get_current_admin_flex)):
    doc = body.model_dump(exclude_none=True)
    doc['status'] = 'verified' if doc.pop('verified') else 'pending'
    doc['created_at'] = datetime.utcnow()
    res = await campus_ambassadors_col.insert_one(doc)
    doc.pop('_id', None)  # insert_one mutates the dict with an ObjectId
    doc['id'] = str(res.inserted_id)
    await audit_record(admin, 'create', 'campus_ambassador', doc['id'])
    return doc


@admin_router.get('/ambassadors')
async def list_ambassadors(status: Optional[str] = None, admin=Depends(get_current_admin_flex)):
    q = {'status': status} if status else {}
    out = []
    async for a in campus_ambassadors_col.find(q).sort('created_at', -1).limit(500):
        a = dict(a)
        a['id'] = str(a.pop('_id'))
        out.append(a)
    return out


@admin_router.patch('/ambassadors/{ambassador_id}')
async def update_ambassador(ambassador_id: str, patch: dict,
                            admin=Depends(get_current_admin_flex)):
    amb = await campus_ambassadors_col.find_one({'_id': _oid(ambassador_id)})
    if not amb:
        raise HTTPException(404, 'Ambassador not found.')
    allowed = {'name', 'email', 'phone', 'college', 'tier', 'status'}
    for k, v in patch.items():
        if k in allowed:
            await campus_ambassadors_col.update_one({'_id': amb['_id']}, {'$set': {k: v}})
    await audit_record(admin, 'update', 'campus_ambassador', ambassador_id, before=amb, extra=patch)
    return {'ok': True}


@admin_router.get('/verify-queue')
async def verify_queue(admin=Depends(get_current_admin_flex)):
    """All pending items across the four collections, for the admin verify UI."""
    out = []
    for col, kind in [(campus_tpos_col, 'tpo'), (campus_leaders_col, 'leader'),
                      (campus_clubs_col, 'club'), (campus_ambassadors_col, 'ambassador')]:
        async for doc in col.find({'status': 'pending'}):
            d = dict(doc)
            d['id'] = str(d.pop('_id'))
            d['kind'] = kind
            out.append(d)
    return out
