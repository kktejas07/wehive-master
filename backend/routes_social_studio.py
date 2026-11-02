"""Social Studio agent: drafts posts from the latest visa news and hosts poster images.

  POST /api/admin/social-studio/draft  — AI-written post fields from a news item or a topic
  POST /api/admin/social-studio/image  — upload a generated poster PNG to R2, returns a public URL

Publishing and scheduling reuse Announcements (POST /api/announcements/admin): email,
WhatsApp and in-app delivery, with the existing broadcast scheduler for future times.
"""
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from admin_auth import require_role
from db import global_news_col

logger = logging.getLogger('wehive.social_studio')
router = APIRouter(prefix='/admin/social-studio', tags=['social-studio'])
_writer = require_role(['manager', 'support'])

Template = Literal['alert', 'service', 'tips', 'myth', 'enquiry', 'destination']

SYSTEM = (
    "You write social media posts for WeHive, an immigration, study-abroad and travel consultancy in "
    "Hyderabad, Ballari and East Windsor NJ. Audience: Indian students, professionals and families. "
    "Be accurate and plain. Never invent numbers, dates, fees or rules that are not in the source. "
    "Reply with JSON only."
)
SHAPE = {
    'alert': 'items: one line "Source: <publisher>, <date>"',
    'service': 'items: 4-6 short chips, one per line',
    'tips': 'items: 4-6 short steps, one per line, in order',
    'myth': 'items: 3 lines "myth | fact"',
    'enquiry': 'items: 4 short checklist lines',
    'destination': 'items: 4 lines "value | label"',
}


class DraftReq(BaseModel):
    template: Template = 'alert'
    news_id: Optional[str] = Field(default=None, max_length=40)
    topic: str = Field(default='', max_length=500)


def _clip(v, n):
    return re.sub(r'\s+', ' ', str(v or '')).strip()[:n]


def _fallback(news: Optional[dict], topic: str) -> dict:
    title = (news or {}).get('title') or topic
    body = _clip((news or {}).get('content'), 220)
    src = f"Source: {news.get('source_name', '')}, {news.get('date') or ''}".strip(', ') if news else ''
    return {'eyebrow': 'Visa update', 'headline': _clip(title, 90), 'body': body, 'items': src,
            'cta': 'Ask us how it affects your plan', 'tags': '#VisaNews #WeHive'}


async def _find_news(news_id: str) -> Optional[dict]:
    for key in ([ObjectId(news_id)] if ObjectId.is_valid(news_id) else []) + [news_id]:
        doc = await global_news_col.find_one({'_id': key})
        if doc:
            return doc
    return None


@router.post('/draft')
async def draft_post(req: DraftReq, _=Depends(_writer)):
    news = await _find_news(req.news_id) if req.news_id else None
    if req.news_id and not news:
        raise HTTPException(404, 'News item not found')
    if not news and not req.topic.strip():
        raise HTTPException(400, 'Pick a news item or type a topic')
    source = (f"Title: {news['title']}\nPublisher: {news.get('source_name', '')}\nDate: {news.get('date') or ''}\n"
              f"Text: {_clip(news.get('content'), 1500)}") if news else f'Topic: {req.topic}'
    prompt = (f"{source}\n\nWrite one post as JSON with keys eyebrow (max 5 words), headline (max 12 words; wrap the "
              f"1-3 most important words in *stars*), body (max 30 words), items, cta (max 7 words), tags (4-6 hashtags "
              f"in one line). {SHAPE[req.template]}. Use \\n between item lines.")
    fields, ai = _fallback(news, req.topic), False
    try:
        from ai_marketplace import marketplace
        raw = await marketplace.chat('anonymous', SYSTEM, prompt, max_tokens=600)
        m = re.search(r'\{.*\}', raw or '', re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
        limits = {'eyebrow': 40, 'headline': 110, 'body': 260, 'items': 600, 'cta': 60, 'tags': 160}
        got = {k: str(data[k]).replace('\\n', '\n').strip()[:n] for k, n in limits.items() if data.get(k)}
        if got.get('headline'):
            fields, ai = {**fields, **got}, True
    except Exception as e:
        logger.warning('Social Studio draft fell back to the news text: %s', type(e).__name__)
    if news and req.template == 'alert':
        fields['items'] = _fallback(news, '')['items']  # always cite the real source, never the model's
    return {'fields': fields, 'ai': ai, 'source_url': (news or {}).get('source_url')}


@router.post('/image')
async def upload_poster(file: UploadFile = File(...), _=Depends(_writer)):
    from routes_admin import _r2_client_from_settings
    from settings_service import get_r2_config
    from upload_limits import read_capped
    if (file.content_type or '') not in ('image/png', 'image/jpeg'):
        raise HTTPException(400, 'Upload a PNG or JPEG poster')
    cfg = await get_r2_config()
    public = (cfg.get('public_url') or '').rstrip('/')
    if not cfg.get('access_key_id') or not public:
        raise HTTPException(400, 'Image hosting is not set up. Add R2 keys and a public URL in Settings → Integrations.')
    data = await read_capped(file, 8)
    key = f"social/{datetime.utcnow():%Y/%m}/{uuid.uuid4().hex}.{'png' if file.content_type == 'image/png' else 'jpg'}"
    _r2_client_from_settings(cfg).put_object(Bucket=cfg.get('bucket', ''), Key=key, Body=data,
                                             ContentType=file.content_type, ServerSideEncryption='AES256')
    return {'url': f'{public}/{key}', 'key': key}
