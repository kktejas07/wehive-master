"""Inbound webhooks — WhatsApp (OpenWA) message handling.

  POST /api/webhooks/whatsapp  — OpenWA forwards every inbound message here.
       No auth: OpenWA calls this URL directly. Secured by an optional shared
       secret in the X-API-Key header (compared to OPENWA_WEBHOOK_SECRET).

If the message body is a stop-word (STOP, UNSUBSCRIBE, etc.) the sender's
phone number is added to the contact opt-outs collection so future broadcasts
skip them automatically.
"""
import hmac
import logging
import os
import re

from fastapi import APIRouter, Header, HTTPException, Request

logger = logging.getLogger('wehive.webhooks')
router = APIRouter(prefix='/webhooks', tags=['webhooks'])

_STOP_RE = re.compile(
    r'^\s*(stop|unsubscribe|cancel|opt.?out|remove me|do not (contact|message|send))\s*[.!]*\s*$',
    re.IGNORECASE,
)


def _webhook_secret() -> str:
    return os.environ.get('OPENWA_WEBHOOK_SECRET', '')


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r'\D', '', raw.split('@')[0])
    if not digits.startswith('+'):
        digits = '+' + digits
    return digits


@router.post('/whatsapp')
async def whatsapp_inbound(request: Request, x_api_key: str = Header(default='')):
    secret = _webhook_secret()
    if secret and not hmac.compare_digest(x_api_key, secret):
        raise HTTPException(401, 'Invalid webhook secret')

    body = await request.json()

    # OpenWA sends: {from, body, type, ...} or {message: {from, body, ...}}
    msg = body.get('message', body)
    sender = msg.get('from') or msg.get('sender') or ''
    text = msg.get('body') or msg.get('text') or ''
    msg_type = msg.get('type', 'chat')

    if not sender:
        return {'ok': True, 'action': 'ignored', 'reason': 'no sender'}

    phone = _normalize_phone(sender)

    if msg_type in ('chat', 'text') and _STOP_RE.match(text):
        from routes_announcements import add_opt_outs
        added = await add_opt_outs([phone], 'whatsapp_stop')
        logger.info('WhatsApp STOP from %s — opt-out %s', phone, 'recorded' if added else 'already existed')
        return {'ok': True, 'action': 'opt_out', 'added': added}

    logger.debug('WhatsApp message from %s: %s', phone, text[:80])
    return {'ok': True, 'action': 'received'}
