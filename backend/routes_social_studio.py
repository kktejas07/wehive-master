"""Social Studio agent: drafts posts from the latest visa news and hosts poster images.

  POST /api/admin/social-studio/draft  — AI-written post fields from a news item or a topic
  POST /api/admin/social-studio/image  — upload a generated poster PNG to R2, returns a public URL
  POST /api/admin/social-studio/opt-outs — record people who replied STOP (skipped on every send)
  POST /api/admin/social-studio/contacts — pull emails and phone numbers out of an uploaded
       Excel (.xlsx), CSV, Word (.docx), text, PDF or image (OCR) file, for a custom send list

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


# ---------- contact lists ----------
_EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
_PHONE = re.compile(r'\+?\d[\d \-().]{8,18}\d')


def _norm_phone(raw: str) -> Optional[str]:
    plus = raw.strip().startswith('+')
    d = re.sub(r'\D', '', raw)
    if plus and 8 <= len(d) <= 15:
        return '+' + d
    if len(d) == 10 and d[0] in '6789':          # Indian mobile without country code
        return '+91' + d
    if len(d) == 12 and d.startswith('91') and d[2] in '6789':
        return '+' + d
    if len(d) == 11 and d.startswith('1'):       # US number with country code
        return '+' + d
    return None


def contacts_from_text(text: str) -> dict:
    emails = sorted({e.lower().rstrip('.') for e in _EMAIL.findall(text)})
    stripped = _EMAIL.sub(' ', text)
    phones = sorted({p for p in (_norm_phone(m) for m in _PHONE.findall(stripped)) if p})
    return {'emails': emails[:5000], 'phones': phones[:5000]}


def _office_text(data: bytes) -> str:
    """Text of an .xlsx or .docx: both are zipped XML, so read every part and drop the tags."""
    import io
    import zipfile
    out = []
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            if name.endswith('.xml') and (name.startswith('xl/') or name.startswith('word/')):
                xml = z.read(name).decode('utf-8', errors='replace')
                out.append(re.sub(r'<[^>]+>', ' ', xml))
    return '\n'.join(out)


@router.post('/contacts')
async def parse_contacts(file: UploadFile = File(...), _=Depends(_writer)):
    from upload_limits import read_capped
    data = await read_capped(file, 10)
    name = (file.filename or '').lower()
    mime = file.content_type or ''
    if name.endswith(('.xlsx', '.docx')):
        try:
            text = _office_text(data)
        except Exception:
            raise HTTPException(400, 'Could not open this file. Save it again as .xlsx, .docx or .csv.')
    elif name.endswith(('.csv', '.txt', '.vcf')) or mime.startswith('text/'):
        text = data.decode('utf-8', errors='replace')
    elif name.endswith(('.xls', '.doc')):
        raise HTTPException(400, 'Old .xls/.doc files are not supported. Save as .xlsx, .docx or .csv and upload again.')
    elif name.endswith('.pdf') or mime.startswith('image/'):
        from user_doc_indexer import _extract_text
        text = await _extract_text(data, 'application/pdf' if name.endswith('.pdf') else mime, name)
        if not text:
            raise HTTPException(400, 'No readable text found. For photos, make sure OCR (tesseract) is installed on the server.')
    else:
        raise HTTPException(400, 'Upload Excel (.xlsx), CSV, Word (.docx), text, PDF or an image.')
    found = contacts_from_text(text)
    if not found['emails'] and not found['phones']:
        raise HTTPException(400, 'No email addresses or phone numbers found in this file.')
    return found


class OptOuts(BaseModel):
    text: str = Field(min_length=3, max_length=20000)


@router.post('/opt-outs')
async def record_opt_outs(body: OptOuts, _=Depends(_writer)):
    from routes_announcements import add_opt_outs, opt_outs_col
    found = contacts_from_text(body.text)
    added = await add_opt_outs(found['emails'] + found['phones'], 'staff')
    return {'added': added, 'found': len(found['emails']) + len(found['phones']),
            'total': await opt_outs_col.count_documents({})}
