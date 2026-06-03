from __future__ import annotations
import uuid
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth_utils import get_current_user
from db import db

router = APIRouter(prefix='/notifications', tags=['notifications'])

notifications_col = db['notifications']


class NotifCreate(BaseModel):
    type: str
    title: str
    body: str
    link: Optional[str] = None


class NotifPatch(BaseModel):
    read: bool


@router.get('')
async def list_notifications(user=Depends(get_current_user)):
    items = []
    async for n in notifications_col.find({'user_id': user['_id']}).sort('created_at', -1).limit(50):
        n['id'] = n.pop('_id')
        items.append(n)
    unread = await notifications_col.count_documents({'user_id': user['_id'], 'read': {'$ne': True}})
    return {'items': items, 'unread': unread}


@router.post('/mark-read')
async def mark_read(notif_id: str, user=Depends(get_current_user)):
    r = await notifications_col.update_one(
        {'_id': notif_id, 'user_id': user['_id']},
        {'$set': {'read': True, 'read_at': datetime.utcnow()}}
    )
    if r.modified_count == 0:
        raise HTTPException(404, 'Notification not found')
    return {'ok': True}


@router.post('/mark-all-read')
async def mark_all_read(user=Depends(get_current_user)):
    await notifications_col.update_many(
        {'user_id': user['_id'], 'read': {'$ne': True}},
        {'$set': {'read': True, 'read_at': datetime.utcnow()}}
    )
    return {'ok': True}


@router.delete('/{notif_id}')
async def delete_notif(notif_id: str, user=Depends(get_current_user)):
    r = await notifications_col.delete_one({'_id': notif_id, 'user_id': user['_id']})
    if r.deleted_count == 0:
        raise HTTPException(404, 'Notification not found')
    return {'ok': True}


_notif_subscribers: dict[str, asyncio.Queue] = {}


@router.get('/stream')
async def stream_notifications(user=Depends(get_current_user)):
    queue = asyncio.Queue()
    uid = user['_id']
    _notif_subscribers[uid] = queue

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25)
                    yield f"data: {event}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {keepalive()}\n\n"
        except GeneratorExit:
            pass
        finally:
            _notif_subscribers.pop(uid, None)

    return StreamingResponse(
        event_generator(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


def keepalive():
    return '{"type":"keepalive"}'


async def push_notification(user_id: str, payload: dict):
    q = _notif_subscribers.get(user_id)
    if q:
        import json
        await q.put(json.dumps(payload))