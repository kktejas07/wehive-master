"""Announcements: broadcast a message to users (in-app, email, WhatsApp) and/or subscribers (email).

  GET  /api/announcements/admin               — history with per-channel counts + audience sizes (any admin)
  GET  /api/announcements/admin/audiences     — how many users/subscribers each audience targets (any admin)
  POST /api/announcements/admin/preview       — rendered email HTML (any admin)
  POST /api/announcements/admin/test         — email to the signed-in admin only (any admin)
  POST /api/announcements/admin/test-whatsapp — WhatsApp to a given number (any admin)
  POST /api/announcements/admin              — send now or schedule (super admin)

Delivery to registered users goes through notify_user, so email opt-outs and WhatsApp
opt-ins are respected; every user also gets an in-app (bell) notification when enabled.
Subscribers (no login) receive email only, each with their own unsubscribe link.
Only one announcement sends at a time.
"""
import html
import logging
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex, get_super_admin
from audit import record as audit_record
from db import db, newsletter_col, users

logger = logging.getLogger('wehive.announcements')
router = APIRouter(prefix='/announcements/admin', tags=['announcements'])
announcements_col = db['announcements']

Audience = Literal['all', 'regular', 'admins', 'subscribers']


class ChannelFlags(BaseModel):
    inapp: bool = True
    email: bool = True
    whatsapp: bool = False


class AnnouncementBody(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    message: str = Field(min_length=10, max_length=5000)
    link: str = Field(default='', max_length=2000)
    image_url: str = Field(default='', max_length=2000)
    audience: Audience = 'all'
    channels: ChannelFlags = Field(default_factory=ChannelFlags)


class SendBody(AnnouncementBody):
    # ISO datetime; when in the future the announcement waits in 'scheduled' for the dispatcher.
    scheduled_at: Optional[datetime] = None


class TestWhatsappBody(AnnouncementBody):
    whatsapp: str = Field(min_length=8, max_length=20)


def _audience_query(audience: Audience) -> dict:
    if audience == 'regular':
        return {'is_admin': {'$ne': True}, 'is_staff': {'$ne': True}}
    if audience == 'admins':
        return {'$or': [{'is_admin': True}, {'is_staff': True}]}
    return {}


async def audience_sizes() -> dict:
    return {
        'all': await users.count_documents({}),
        'regular': await users.count_documents(_audience_query('regular')),
        'admins': await users.count_documents(_audience_query('admins')),
        'subscribers': await newsletter_col.count_documents({'status': 'active'}),
    }


def build_html(title: str, message: str, link: str = '', image_url: str = '',
               unsubscribe_url: str = '') -> str:
    from email_service import _wrap_html
    from routes_newsletter_campaigns import render_body
    inner = ''
    if image_url:
        inner += (f'<div style="text-align:center;margin:0 0 16px 0">'
                  f'<img src="{html.escape(image_url)}" alt="" style="max-width:100%;height:auto;border-radius:12px">'
                  f'</div>')
    inner += render_body(message)
    if link:
        inner += (f'<div style="text-align:center;margin:24px 0">'
                  f'<a href="{html.escape(link)}" style="display:inline-block;background:#E0212C;color:#ffffff;'
                  f'text-decoration:none;font-weight:700;font-size:14px;padding:13px 34px;border-radius:10px">'
                  f'Open in WeHive</a></div>')
    if unsubscribe_url:
        inner += (f'<p style="font-size:12px;color:#94a3b8;margin:24px 0 0 0">'
                  f'<a href="{html.escape(unsubscribe_url)}" style="color:#94a3b8">Unsubscribe</a></p>')
    content = f'<tr><td style="padding:8px 32px;text-align:left">{inner}</td></tr>'
    return _wrap_html(html.escape(title), content, html.escape(title))


def build_whatsapp_text(title: str, message: str, link: str = '') -> str:
    text = f'*{title.strip()}*\n\n{message.strip()}'
    if link.strip():
        text += f'\n\n{link.strip()}'
    return text


def _out(a: dict) -> dict:
    sched = a.get('scheduled_at')
    return {
        'id': a['_id'], 'title': a.get('title'), 'audience': a.get('audience'),
        'status': a.get('status'), 'recipients': a.get('recipients', 0),
        'inapp': a.get('inapp', 0), 'emails_sent': a.get('emails_sent', 0),
        'emails_failed': a.get('emails_failed', 0),
        'whatsapp_sent': a.get('whatsapp_sent', 0), 'whatsapp_failed': a.get('whatsapp_failed', 0),
        'channels': a.get('channels', {'inapp': True, 'email': True, 'whatsapp': False}),
        'scheduled_at': sched.isoformat() + 'Z' if isinstance(sched, datetime) else sched,
        'created_by': a.get('created_by'),
        'created_at': a['created_at'].isoformat() if isinstance(a.get('created_at'), datetime) else a.get('created_at'),
        'finished_at': a['finished_at'].isoformat() if isinstance(a.get('finished_at'), datetime) else a.get('finished_at'),
    }


@router.get('')
async def list_announcements(_=Depends(get_current_admin_flex), limit: int = Query(20, ge=1, le=100)):
    items = [_out(a) async for a in announcements_col.find({}).sort('created_at', -1).limit(limit)]
    return {'items': items, 'audiences': await audience_sizes()}


@router.get('/audiences')
async def get_audiences(_=Depends(get_current_admin_flex)):
    return await audience_sizes()


@router.post('/preview')
async def preview_announcement(req: AnnouncementBody, _=Depends(get_current_admin_flex)):
    return {'html': build_html(req.title, req.message, req.link, req.image_url)}


@router.post('/test')
async def test_announcement(req: AnnouncementBody, admin=Depends(get_current_admin_flex)):
    from email_service import send_email
    to = admin.get('email')
    if not to:
        raise HTTPException(400, 'Your admin account has no email address')
    ok = await send_email(to_email=to, subject=f'[TEST] {req.title}',
                          html_body=build_html(req.title, req.message, req.link, req.image_url),
                          text_body=req.message)
    if not ok:
        raise HTTPException(502, 'The email service did not accept the message — check System health → Email')
    return {'ok': True, 'sent_to': to}


@router.post('/test-whatsapp')
async def test_announcement_whatsapp(req: TestWhatsappBody, _=Depends(get_current_admin_flex)):
    from auth_utils import normalize_phone
    from otp_providers import deliver_whatsapp_message
    try:
        to = normalize_phone(req.whatsapp)
    except HTTPException:
        raise HTTPException(400, 'Enter a valid WhatsApp number with country code.')
    res = await deliver_whatsapp_message(to, '[TEST] ' + build_whatsapp_text(req.title, req.message, req.link))
    if not res.get('ok'):
        raise HTTPException(502, f"WhatsApp test failed: {res.get('error', 'provider error')}")
    return {'ok': True, 'sent_to': to}


@router.post('')
async def send_announcement(req: SendBody, bg: BackgroundTasks, admin=Depends(get_super_admin)):
    if await announcements_col.find_one({'status': 'sending'}):
        raise HTTPException(409, 'Another announcement is still sending. Wait for it to finish.')
    if not (req.channels.inapp or req.channels.email or req.channels.whatsapp):
        raise HTTPException(400, 'Enable at least one delivery channel.')
    sizes = await audience_sizes()
    recipients = sizes[req.audience]
    if recipients < 1:
        raise HTTPException(400, f'The {req.audience} audience is empty.')
    now = datetime.utcnow()
    scheduled_at = req.scheduled_at
    if scheduled_at and scheduled_at.tzinfo is not None:
        scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    status = 'sending' if not scheduled_at or scheduled_at <= now else 'scheduled'
    doc = {
        '_id': str(uuid.uuid4()), 'title': req.title, 'message': req.message,
        'link': req.link, 'image_url': req.image_url, 'audience': req.audience,
        'channels': {'inapp': req.channels.inapp, 'email': req.channels.email, 'whatsapp': req.channels.whatsapp},
        'status': status, 'recipients': recipients,
        'inapp': 0, 'emails_sent': 0, 'emails_failed': 0, 'whatsapp_sent': 0, 'whatsapp_failed': 0,
        'scheduled_at': scheduled_at,
        'created_by': admin.get('email') or admin['_id'], 'created_at': now,
    }
    await announcements_col.insert_one(doc)
    await audit_record(admin, 'send' if status == 'sending' else 'schedule', 'announcement',
                       doc['_id'], extra={'title': req.title, 'audience': req.audience})
    if status == 'sending':
        bg.add_task(deliver, doc['_id'])
    return _out(doc)


async def deliver(announcement_id: str) -> None:
    from email_service import send_email
    from notify import notify_user
    a = await announcements_col.find_one({'_id': announcement_id})
    if not a:
        return
    channels = a.get('channels') or {'inapp': True, 'email': True, 'whatsapp': False}
    inapp = emails_sent = emails_failed = wa_sent = wa_failed = 0
    try:
        from config import FRONTEND_URL
        url = a.get('link') or None
        if url and url.startswith('/'):
            url = f'{FRONTEND_URL}{url}'
        if a['audience'] == 'subscribers':
            from routes_newsletter_campaigns import _unsubscribe_url
            async for sub in newsletter_col.find({'status': 'active'}, {'email': 1, 'unsubscribe_token': 1}):
                try:
                    unsub = _unsubscribe_url(sub.get('unsubscribe_token', ''))
                    ok = await send_email(
                        to_email=sub['email'], subject=f"WeHive: {a['title']}",
                        html_body=build_html(a['title'], a['message'], url or '',
                                            a.get('image_url', ''), unsub),
                        text_body=f"{a['message']}\n\nUnsubscribe: {unsub}")
                except Exception:
                    ok = False
                emails_sent, emails_failed = (emails_sent + 1, emails_failed) if ok else (emails_sent, emails_failed + 1)
        else:
            async for u in users.find(_audience_query(a['audience']), {'_id': 1}):
                try:
                    sent = await notify_user(
                        u['_id'], title=a['title'], body=a['message'], kind='announcement',
                        link=url, dedupe_key=f"ann:{announcement_id}:{u['_id']}",
                        email=channels.get('email', True), whatsapp=channels.get('whatsapp', False))
                except Exception:
                    logger.exception('Announcement %s failed for user %s', announcement_id, u.get('_id'))
                    continue
                if sent.get('app'):
                    inapp += 1
                if 'email' in sent:
                    emails_sent, emails_failed = (emails_sent + 1, emails_failed) if sent['email'] else (emails_sent, emails_failed + 1)
                if 'whatsapp' in sent:
                    wa_sent, wa_failed = (wa_sent + 1, wa_failed) if sent['whatsapp'] else (wa_sent, wa_failed + 1)
        emails_ok = emails_failed == 0 or not channels.get('email')
        wa_ok = wa_failed == 0 or not channels.get('whatsapp')
        status = 'sent' if emails_ok and wa_ok else ('failed' if emails_sent == 0 and wa_sent == 0 and inapp == 0 else 'partial')
    except Exception:
        logger.exception('Announcement %s stopped', announcement_id)
        status = 'interrupted'
    await announcements_col.update_one({'_id': announcement_id}, {'$set': {
        'inapp': inapp, 'emails_sent': emails_sent, 'emails_failed': emails_failed,
        'whatsapp_sent': wa_sent, 'whatsapp_failed': wa_failed,
        'status': status, 'finished_at': datetime.utcnow()}})


async def dispatch_due_announcements() -> int:
    now = datetime.utcnow()
    started = 0
    if await announcements_col.find_one({'status': 'sending'}):
        return 0
    async for a in announcements_col.find({'status': 'scheduled', 'scheduled_at': {'$lte': now}}).sort('scheduled_at', 1):
        res = await announcements_col.update_one(
            {'_id': a['_id'], 'status': 'scheduled'}, {'$set': {'status': 'sending'}})
        if res.modified_count:
            await deliver(a['_id'])
            started += 1
            break
    return started


async def mark_interrupted_on_boot() -> Optional[int]:
    res = await announcements_col.update_many({'status': 'sending'}, {'$set': {'status': 'interrupted', 'finished_at': datetime.utcnow()}})
    return res.modified_count
