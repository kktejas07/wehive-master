"""Newsletter campaigns: write once, test to yourself, send to every confirmed subscriber.

  GET  /api/newsletter/admin/campaigns          — history with sent/failed counts (any admin)
  POST /api/newsletter/admin/campaigns/preview  — rendered HTML (any admin)
  POST /api/newsletter/admin/campaigns/test     — send to the signed-in admin only (any admin)
  POST /api/newsletter/admin/campaigns          — send to all active subscribers (super admin)

The body is plain text with light formatting (blank line = paragraph, **bold**, bare links become
links), escaped before rendering, so a campaign can't inject markup. Each email carries that
subscriber's own unsubscribe link. Only one campaign can be sending at a time.
"""
import asyncio
import html
import logging
import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex, get_super_admin
from audit import record as audit_record
from config import FRONTEND_URL
from db import db, newsletter_col

logger = logging.getLogger('wehive.newsletter.campaigns')
router = APIRouter(prefix='/newsletter/admin/campaigns', tags=['newsletter'])
campaigns_col = db['newsletter_campaigns']

SEND_DELAY = 0.2  # seconds between emails; keeps us inside SMTP/Postal rate limits
_URL = re.compile(r'(https?://[^\s<]+[^\s<.,;:!?)\]])')


class CampaignBody(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    body: str = Field(min_length=10, max_length=20000)


class SendBody(CampaignBody):
    # The UI echoes the audience size it showed; if the list changed meanwhile we stop and re-confirm.
    expected_recipients: int = Field(ge=1)


def render_body(text: str) -> str:
    paras = [p.strip() for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]
    out = []
    for p in paras:
        h = html.escape(p)
        h = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', h)
        h = _URL.sub(r'<a href="\1" style="color:#011CB5">\1</a>', h)
        out.append(f'<p style="font-size:14px;color:#334155;margin:0 0 14px 0;line-height:1.65">{h.replace(chr(10), "<br>")}</p>')
    return ''.join(out)


def build_html(subject: str, body: str, unsubscribe_url: str) -> str:
    from email_service import _wrap_html
    content = (f'<tr><td style="padding:0 32px;text-align:left">{render_body(body)}'
               f'<p style="font-size:12px;color:#94a3b8;margin:24px 0 0 0">You are receiving this because you subscribed to We Hive updates. '
               f'<a href="{html.escape(unsubscribe_url)}" style="color:#94a3b8">Unsubscribe</a></p></td></tr>')
    return _wrap_html(html.escape(subject), content)


def _unsubscribe_url(token: str) -> str:
    return f'{FRONTEND_URL}/newsletter/unsubscribe?token={token}'


def _out(c: dict) -> dict:
    return {
        'id': c['_id'], 'subject': c.get('subject'), 'status': c.get('status'),
        'recipients': c.get('recipients', 0), 'sent': c.get('sent', 0), 'failed': c.get('failed', 0),
        'created_by': c.get('created_by'),
        'created_at': c['created_at'].isoformat() if isinstance(c.get('created_at'), datetime) else c.get('created_at'),
        'finished_at': c['finished_at'].isoformat() if isinstance(c.get('finished_at'), datetime) else c.get('finished_at'),
    }


@router.get('')
async def list_campaigns(_=Depends(get_current_admin_flex), limit: int = Query(20, ge=1, le=100)):
    items = [_out(c) async for c in campaigns_col.find({}).sort('created_at', -1).limit(limit)]
    active = await newsletter_col.count_documents({'status': 'active'})
    return {'items': items, 'active_subscribers': active}


@router.post('/preview')
async def preview_campaign(req: CampaignBody, _=Depends(get_current_admin_flex)):
    return {'html': build_html(req.subject, req.body, _unsubscribe_url('preview'))}


@router.post('/test')
async def test_campaign(req: CampaignBody, admin=Depends(get_current_admin_flex)):
    from email_service import send_email
    to = admin.get('email')
    if not to:
        raise HTTPException(400, 'Your admin account has no email address')
    ok = await send_email(to_email=to, subject=f'[TEST] {req.subject}',
                          html_body=build_html(req.subject, req.body, _unsubscribe_url('test')), text_body=req.body)
    if not ok:
        raise HTTPException(502, 'The email service did not accept the message — check System health → Email')
    return {'ok': True, 'sent_to': to}


@router.post('')
async def send_campaign(req: SendBody, bg: BackgroundTasks, admin=Depends(get_super_admin)):
    if await campaigns_col.find_one({'status': 'sending'}):
        raise HTTPException(409, 'Another campaign is still sending. Wait for it to finish.')
    active = await newsletter_col.count_documents({'status': 'active'})
    if active != req.expected_recipients:
        raise HTTPException(409, f'The audience changed to {active} subscribers. Review and confirm again.')
    now = datetime.utcnow()
    campaign = {
        '_id': str(uuid.uuid4()), 'subject': req.subject, 'body': req.body, 'status': 'sending',
        'recipients': active, 'sent': 0, 'failed': 0,
        'created_by': admin.get('email') or admin['_id'], 'created_at': now,
    }
    await campaigns_col.insert_one(campaign)
    await audit_record(admin, 'send', 'newsletter_campaign', campaign['_id'], extra={'subject': req.subject, 'recipients': active})
    bg.add_task(deliver, campaign['_id'])
    return _out(campaign)


async def deliver(campaign_id: str) -> None:
    from email_service import send_email
    c = await campaigns_col.find_one({'_id': campaign_id})
    if not c:
        return
    sent = failed = 0
    try:
        async for sub in newsletter_col.find({'status': 'active'}, {'email': 1, 'unsubscribe_token': 1}):
            try:
                ok = await send_email(to_email=sub['email'], subject=c['subject'],
                                      html_body=build_html(c['subject'], c['body'], _unsubscribe_url(sub.get('unsubscribe_token', ''))),
                                      text_body=f"{c['body']}\n\nUnsubscribe: {_unsubscribe_url(sub.get('unsubscribe_token', ''))}")
            except Exception:
                ok = False
            sent, failed = (sent + 1, failed) if ok else (sent, failed + 1)
            if (sent + failed) % 20 == 0:
                await campaigns_col.update_one({'_id': campaign_id}, {'$set': {'sent': sent, 'failed': failed}})
            await asyncio.sleep(SEND_DELAY)
        status = 'sent' if failed == 0 else ('failed' if sent == 0 else 'partial')
    except Exception:
        logger.exception('Campaign %s stopped', campaign_id)
        status = 'interrupted'
    await campaigns_col.update_one({'_id': campaign_id}, {'$set': {
        'sent': sent, 'failed': failed, 'status': status, 'finished_at': datetime.utcnow()}})


async def mark_interrupted_on_boot() -> Optional[int]:
    """A restart kills in-flight sends; don't leave them stuck in 'sending' (which blocks new ones)."""
    res = await campaigns_col.update_many({'status': 'sending'}, {'$set': {'status': 'interrupted', 'finished_at': datetime.utcnow()}})
    return res.modified_count
