"""Newsletter campaigns: write once, test to yourself, send to every confirmed subscriber.

  GET  /api/newsletter/admin/campaigns          — history with sent/failed counts + totals (any admin)
  POST /api/newsletter/admin/campaigns/preview  — rendered HTML (any admin)
  POST /api/newsletter/admin/campaigns/test     — send email to the signed-in admin only (any admin)
  POST /api/newsletter/admin/campaigns/test-whatsapp — send WhatsApp to a given number (any admin)
  POST /api/newsletter/admin/campaigns          — send now or schedule (super admin)

Channels: email and/or WhatsApp (subscribers who shared a number and opted in).
The body is plain text with light formatting (blank line = paragraph, **bold**, bare links become
links), escaped before rendering, so a campaign can't inject markup. Each email carries that
subscriber's own unsubscribe link. Only one campaign can be sending at a time.
"""
import asyncio
import html
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from admin_auth import get_current_admin_flex, get_super_admin
from audit import record as audit_record
from config import FRONTEND_URL
from db import db, newsletter_col

logger = logging.getLogger('wehive.newsletter.campaigns')
router = APIRouter(prefix='/newsletter/admin/campaigns', tags=['newsletter'])
campaigns_col = db['newsletter_campaigns']

SEND_DELAY = 0.2  # seconds between emails; keeps us inside SMTP/Postal rate limits
_URL = re.compile(r'(https?://[^\s<]+[^\s<.,;:!?)\]])')


class ChannelFlags(BaseModel):
    email: bool = True
    whatsapp: bool = False


class CampaignBody(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    body: str = Field(min_length=10, max_length=20000)
    intro: str = Field(default='', max_length=500)
    hero_image_url: str = Field(default='', max_length=2000)
    button_text: str = Field(default='', max_length=40)
    button_url: str = Field(default='', max_length=2000)
    channels: ChannelFlags = Field(default_factory=ChannelFlags)

    @field_validator('hero_image_url', 'button_url')
    @classmethod
    def _http_url(cls, v: str) -> str:
        if v and not re.match(r'^https?://', v.strip()):
            raise ValueError('Must be a full http(s) URL')
        return (v or '').strip()


class SendBody(CampaignBody):
    # The UI echoes the audience size it showed; if the list changed meanwhile we stop and re-confirm.
    expected_recipients: int = Field(ge=1)
    # ISO datetime; when in the future the campaign waits in 'scheduled' for the dispatcher.
    scheduled_at: Optional[datetime] = None


class TestWhatsappBody(CampaignBody):
    whatsapp: str = Field(min_length=8, max_length=20)


def render_body(text: str) -> str:
    paras = [p.strip() for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]
    out = []
    for p in paras:
        h = html.escape(p)
        h = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', h)
        h = _URL.sub(r'<a href="\1" style="color:#011CB5">\1</a>', h)
        out.append(f'<p style="font-size:14px;color:#334155;margin:0 0 14px 0;line-height:1.65">{h.replace(chr(10), "<br>")}</p>')
    return ''.join(out)


def build_html(subject: str, body: str, unsubscribe_url: str, intro: str = '',
               hero_image_url: str = '', button_text: str = '', button_url: str = '') -> str:
    from email_service import _wrap_html
    parts = []
    if hero_image_url:
        parts.append(
            f'<tr><td style="padding:0 0 8px 0;text-align:center">'
            f'<img src="{html.escape(hero_image_url)}" alt="" style="max-width:100%;height:auto;border-radius:12px 12px 0 0;display:block;width:100%">'
            f'</td></tr>')
    inner = ''
    if intro:
        inner += f'<p style="font-size:14px;color:#64748b;margin:0 0 14px 0;line-height:1.65">{html.escape(intro)}</p>'
    inner += render_body(body)
    if button_text and button_url:
        inner += (f'<div style="text-align:center;margin:24px 0">'
                  f'<a href="{html.escape(button_url)}" style="display:inline-block;background:#E0212C;color:#ffffff;'
                  f'text-decoration:none;font-weight:700;font-size:14px;padding:13px 34px;border-radius:10px">'
                  f'{html.escape(button_text)}</a></div>')
    parts.append(f'<tr><td style="padding:{"8px" if hero_image_url else "0"} 32px;text-align:left">{inner}'
                 f'<p style="font-size:12px;color:#94a3b8;margin:24px 0 0 0">You are receiving this because you subscribed to We Hive updates. '
                 f'<a href="{html.escape(unsubscribe_url)}" style="color:#94a3b8">Unsubscribe</a></p></td></tr>')
    content = ''.join(parts)
    return _wrap_html(html.escape(subject), content)


def build_whatsapp_text(subject: str, body: str, intro: str = '', button_url: str = '') -> str:
    text = f'*{subject.strip()}*'
    if intro.strip():
        text += f'\n\n{intro.strip()}'
    text += f'\n\n{body.strip()}'
    if button_url.strip():
        text += f'\n\n{button_url.strip()}'
    return text


def _unsubscribe_url(token: str) -> str:
    return f'{FRONTEND_URL}/newsletter/unsubscribe?token={token}'


def _out(c: dict) -> dict:
    return {
        'id': c['_id'], 'subject': c.get('subject'), 'status': c.get('status'),
        'recipients': c.get('recipients', 0), 'sent': c.get('sent', 0), 'failed': c.get('failed', 0),
        'whatsapp_sent': c.get('whatsapp_sent', 0), 'whatsapp_failed': c.get('whatsapp_failed', 0),
        'channels': c.get('channels', {'email': True, 'whatsapp': False}),
        'scheduled_at': c.get('scheduled_at').isoformat() if isinstance(c.get('scheduled_at'), datetime) else c.get('scheduled_at'),
        'created_by': c.get('created_by'),
        'created_at': c['created_at'].isoformat() if isinstance(c.get('created_at'), datetime) else c.get('created_at'),
        'finished_at': c['finished_at'].isoformat() if isinstance(c.get('finished_at'), datetime) else c.get('finished_at'),
    }


async def _totals() -> dict:
    totals = {'campaigns': 0, 'emails_sent': 0, 'emails_failed': 0, 'whatsapp_sent': 0, 'whatsapp_failed': 0}
    async for c in campaigns_col.find({}, {'sent': 1, 'failed': 1, 'whatsapp_sent': 1, 'whatsapp_failed': 1}):
        totals['campaigns'] += 1
        totals['emails_sent'] += c.get('sent', 0)
        totals['emails_failed'] += c.get('failed', 0)
        totals['whatsapp_sent'] += c.get('whatsapp_sent', 0)
        totals['whatsapp_failed'] += c.get('whatsapp_failed', 0)
    return totals


@router.get('')
async def list_campaigns(_=Depends(get_current_admin_flex), limit: int = Query(20, ge=1, le=100)):
    items = [_out(c) async for c in campaigns_col.find({}).sort('created_at', -1).limit(limit)]
    active = await newsletter_col.count_documents({'status': 'active'})
    return {'items': items, 'active_subscribers': active, 'totals': await _totals()}


@router.post('/preview')
async def preview_campaign(req: CampaignBody, _=Depends(get_current_admin_flex)):
    return {'html': build_html(req.subject, req.body, _unsubscribe_url('preview'),
                               req.intro, req.hero_image_url, req.button_text, req.button_url)}


@router.post('/test')
async def test_campaign(req: CampaignBody, admin=Depends(get_current_admin_flex)):
    from email_service import send_email
    to = admin.get('email')
    if not to:
        raise HTTPException(400, 'Your admin account has no email address')
    ok = await send_email(to_email=to, subject=f'[TEST] {req.subject}',
                          html_body=build_html(req.subject, req.body, _unsubscribe_url('test'),
                                              req.intro, req.hero_image_url, req.button_text, req.button_url),
                          text_body=req.body)
    if not ok:
        raise HTTPException(502, 'The email service did not accept the message — check System health → Email')
    return {'ok': True, 'sent_to': to}


@router.post('/test-whatsapp')
async def test_campaign_whatsapp(req: TestWhatsappBody, _=Depends(get_current_admin_flex)):
    from auth_utils import normalize_phone
    from otp_providers import deliver_whatsapp_message
    try:
        to = normalize_phone(req.whatsapp)
    except HTTPException:
        raise HTTPException(400, 'Enter a valid WhatsApp number with country code.')
    res = await deliver_whatsapp_message(
        to, '[TEST] ' + build_whatsapp_text(req.subject, req.body, req.intro, req.button_url))
    if not res.get('ok'):
        raise HTTPException(502, f"WhatsApp test failed: {res.get('error', 'provider error')}")
    return {'ok': True, 'sent_to': to}


@router.post('')
async def send_campaign(req: SendBody, bg: BackgroundTasks, admin=Depends(get_super_admin)):
    if await campaigns_col.find_one({'status': 'sending'}):
        raise HTTPException(409, 'Another campaign is still sending. Wait for it to finish.')
    active = await newsletter_col.count_documents({'status': 'active'})
    if active != req.expected_recipients:
        raise HTTPException(409, f'The audience changed to {active} subscribers. Review and confirm again.')
    if not (req.channels.email or req.channels.whatsapp):
        raise HTTPException(400, 'Enable at least one delivery channel.')
    now = datetime.utcnow()
    scheduled_at = req.scheduled_at
    if scheduled_at and scheduled_at.tzinfo is not None:
        scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    status = 'sending' if not scheduled_at or scheduled_at <= now else 'scheduled'
    campaign = {
        '_id': str(uuid.uuid4()), 'subject': req.subject, 'body': req.body,
        'intro': req.intro, 'hero_image_url': req.hero_image_url,
        'button_text': req.button_text, 'button_url': req.button_url,
        'channels': {'email': req.channels.email, 'whatsapp': req.channels.whatsapp},
        'status': status, 'recipients': active, 'sent': 0, 'failed': 0,
        'whatsapp_sent': 0, 'whatsapp_failed': 0,
        'scheduled_at': scheduled_at,
        'created_by': admin.get('email') or admin['_id'], 'created_at': now,
    }
    await campaigns_col.insert_one(campaign)
    await audit_record(admin, 'send' if status == 'sending' else 'schedule', 'newsletter_campaign',
                       campaign['_id'], extra={'subject': req.subject, 'recipients': active})
    if status == 'sending':
        bg.add_task(deliver, campaign['_id'])
    return _out(campaign)


async def deliver(campaign_id: str) -> None:
    from email_service import send_email
    from otp_providers import deliver_whatsapp_message
    c = await campaigns_col.find_one({'_id': campaign_id})
    if not c:
        return
    channels = c.get('channels') or {'email': True, 'whatsapp': False}
    sent = failed = wa_sent = wa_failed = 0
    try:
        async for sub in newsletter_col.find({'status': 'active'}, {'email': 1, 'whatsapp': 1, 'whatsapp_opt_in': 1, 'unsubscribe_token': 1}):
            if channels.get('email'):
                try:
                    ok = await send_email(
                        to_email=sub['email'], subject=c['subject'],
                        html_body=build_html(c['subject'], c['body'], _unsubscribe_url(sub.get('unsubscribe_token', '')),
                                            c.get('intro', ''), c.get('hero_image_url', ''),
                                            c.get('button_text', ''), c.get('button_url', '')),
                        text_body=f"{c.get('intro', '')}\n\n{c['body']}\n\nUnsubscribe: {_unsubscribe_url(sub.get('unsubscribe_token', ''))}".strip())
                except Exception:
                    ok = False
                sent, failed = (sent + 1, failed) if ok else (sent, failed + 1)
            if channels.get('whatsapp') and sub.get('whatsapp') and sub.get('whatsapp_opt_in'):
                try:
                    res = await deliver_whatsapp_message(
                        sub['whatsapp'],
                        build_whatsapp_text(c['subject'], c['body'], c.get('intro', ''), c.get('button_url', '')))
                except Exception:
                    res = {'ok': False}
                wa_sent, wa_failed = (wa_sent + 1, wa_failed) if res.get('ok') else (wa_sent, wa_failed + 1)
            done = sent + failed + wa_sent + wa_failed
            if done % 20 == 0:
                await campaigns_col.update_one(
                    {'_id': campaign_id},
                    {'$set': {'sent': sent, 'failed': failed, 'whatsapp_sent': wa_sent, 'whatsapp_failed': wa_failed}})
            await asyncio.sleep(SEND_DELAY)
        status = 'sent' if failed == 0 and wa_failed == 0 else ('failed' if sent == 0 and wa_sent == 0 else 'partial')
    except Exception:
        logger.exception('Campaign %s stopped', campaign_id)
        status = 'interrupted'
    await campaigns_col.update_one({'_id': campaign_id}, {'$set': {
        'sent': sent, 'failed': failed, 'whatsapp_sent': wa_sent, 'whatsapp_failed': wa_failed,
        'status': status, 'finished_at': datetime.utcnow()}})


async def dispatch_due_campaigns() -> int:
    """Send scheduled campaigns whose time has come. Returns how many were started."""
    now = datetime.utcnow()
    started = 0
    if await campaigns_col.find_one({'status': 'sending'}):
        return 0
    async for c in campaigns_col.find({'status': 'scheduled', 'scheduled_at': {'$lte': now}}).sort('scheduled_at', 1):
        res = await campaigns_col.update_one(
            {'_id': c['_id'], 'status': 'scheduled'}, {'$set': {'status': 'sending'}})
        if res.modified_count:
            await deliver(c['_id'])
            started += 1
            break  # one at a time; the next tick picks up the following
    return started


async def mark_interrupted_on_boot() -> Optional[int]:
    """A restart kills in-flight sends; don't leave them stuck in 'sending' (which blocks new ones)."""
    res = await campaigns_col.update_many({'status': 'sending'}, {'$set': {'status': 'interrupted', 'finished_at': datetime.utcnow()}})
    return res.modified_count
