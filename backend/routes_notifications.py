from __future__ import annotations
import asyncio
import json
import secrets
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from auth_utils import get_current_user, get_current_user_optional
from db import db
from viewmodels.notification_viewmodel import NotificationViewModel

router = APIRouter(prefix='/notifications', tags=['notifications'])

notifications_col = db['notifications']


@router.get('')
async def list_notifications(page: int = 1, user=Depends(get_current_user)):
    return await NotificationViewModel.list_for_user(user['_id'], page)


@router.post('/mark-read')
async def mark_read(notif_id: str, user=Depends(get_current_user)):
    updated = await NotificationViewModel.mark_read(notif_id, user['_id'])
    if not updated:
        raise HTTPException(404, 'Notification not found')
    return {'ok': True}


@router.post('/mark-all-read')
async def mark_all_read(user=Depends(get_current_user)):
    count = await NotificationViewModel.mark_all_read(user['_id'])
    return {'ok': True, 'updated': count}


@router.delete('/{notif_id}')
async def delete_notif(notif_id: str, user=Depends(get_current_user)):
    r = await notifications_col.delete_one({'_id': notif_id, 'user_id': user['_id']})
    if r.deleted_count == 0:
        raise HTTPException(404, 'Notification not found')
    return {'ok': True}


# Live push. Per-process: with several workers a user only gets live events from
# the worker their stream is connected to (they still see everything on reload).
_notif_subscribers: dict[str, set[asyncio.Queue]] = {}
# EventSource can't send an Authorization header, and a JWT in the URL ends up in
# access logs. So the client trades its token for a single-use ticket (60s).
_stream_tickets: dict[str, tuple[str, float]] = {}
TICKET_TTL_SECONDS = 60


def _to_json(notif: dict) -> str:
    out = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in notif.items()}
    out['id'] = out.pop('_id', out.get('id'))
    return json.dumps({'notif': out})


def publish(user_id: str, notif: dict) -> None:
    """Push a just-saved notification to the user's open streams (best effort)."""
    for queue in list(_notif_subscribers.get(user_id, ())):
        try:
            queue.put_nowait(_to_json(notif))
        except asyncio.QueueFull:
            pass


@router.post('/stream-ticket')
async def stream_ticket(user=Depends(get_current_user)):
    now = time.monotonic()
    for t, (_, exp) in list(_stream_tickets.items()):
        if exp < now:
            _stream_tickets.pop(t, None)
    ticket = secrets.token_urlsafe(24)
    _stream_tickets[ticket] = (user['_id'], now + TICKET_TTL_SECONDS)
    return {'ticket': ticket, 'expires_in': TICKET_TTL_SECONDS}


@router.get('/stream')
async def stream_notifications(ticket: Optional[str] = None, user=Depends(get_current_user_optional)):
    uid = user['_id'] if user else None
    if not uid and ticket:
        entry = _stream_tickets.pop(ticket, None)  # single use
        if entry and entry[1] >= time.monotonic():
            uid = entry[0]
    if not uid:
        return StreamingResponse(
            iter([f"data: {json.dumps({'type':'auth_required'})}\n\n"]),
            media_type='text/event-stream',
        )
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _notif_subscribers.setdefault(uid, set()).add(queue)

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
            subs = _notif_subscribers.get(uid)
            if subs is not None:
                subs.discard(queue)
                if not subs:
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
