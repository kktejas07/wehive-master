"""Admin operations: user 360 + suspension, conversion funnel, integrations health, RAG uploads.

Endpoints (all admin-only):
  GET  /api/admin/users/{id}/profile     — user, applications, payments, admin history
  POST /api/admin/users/{id}/suspend     — block the account (reason required)
  POST /api/admin/users/{id}/unsuspend
  GET  /api/admin/funnel                 — signup → application → submitted → paid → approved, plus paid revenue by month
  GET  /api/admin/health                 — live/config status of every external dependency (no secrets)
  POST /api/admin/rag/upload             — PDF / text file into the chat knowledge base
"""
import io
import logging
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex, is_super_admin
from audit import audit_col, record as audit_record
from config import ADMIN_EMAILS
from constants import AppStatus
from db import applications, db, payments, users
from serializers import public_user
from upload_limits import read_capped

logger = logging.getLogger('wehive.admin_ops')
router = APIRouter(prefix='/admin', tags=['admin-ops'])

email_log = db['email_log']

JOURNEY_STAGES = ['registered', 'enquiry_submitted', 'application_started', 'docs_uploaded',
                   'submitted', 'in_review', 'appointment_scheduled', 'visa_approved']


async def _build_user_360(user_id: str, u: dict, apps: list, pays: list) -> dict:
    """Extra keys for the 360° profile: journey stage, inactivity, heatmap, email history."""
    from constants import AppStatus

    # Journey stage
    stage = 'registered'
    if any(a['status'] == AppStatus.APPROVED.value for a in apps):
        stage = 'visa_approved'
    elif any(a['status'] == 'appointment_scheduled' for a in apps):
        stage = 'appointment_scheduled'
    elif any(a['status'] == AppStatus.IN_REVIEW.value for a in apps):
        stage = 'in_review'
    elif any(a['status'] != AppStatus.DRAFT.value for a in apps):
        stage = 'submitted'
    elif any(d for a in apps for d in (a.get('documents') or [])):
        stage = 'docs_uploaded'
    elif apps:
        stage = 'application_started'
    elif await db['leads'].count_documents({'email': u.get('email')}, limit=1):
        stage = 'enquiry_submitted'

    # Inactivity
    last_active = u.get('last_login_at') or u.get('created_at')
    days_inactive = (datetime.utcnow() - last_active).days if last_active and isinstance(last_active, datetime) else None
    if days_inactive is None:
        drop_off_signal = None
    elif days_inactive > 30:
        drop_off_signal = 'call_user'
    elif days_inactive > 14:
        drop_off_signal = 'assign_agent'
    elif days_inactive > 7:
        drop_off_signal = 'send_reminder'
    else:
        drop_off_signal = None

    # 90-day activity heatmap from audit log
    since = datetime.utcnow() - timedelta(days=90)
    heatmap: dict[str, int] = {}
    async for r in audit_col.find({'entity_type': {'$in': ['user', 'document', 'application']},
                                   '$or': [{'entity_id': user_id}, {'extra.user_id': user_id}],
                                   'at': {'$gte': since}}, {'at': 1}):
        day = r['at'].date().isoformat() if isinstance(r.get('at'), datetime) else None
        if day:
            heatmap[day] = heatmap.get(day, 0) + 1
    activity_heatmap = [{'date': k, 'count': v} for k, v in sorted(heatmap.items())]

    # Email history (last 20)
    email_history = [{
        'id': str(r.get('_id')),
        'kind': r.get('kind'),
        'subject': r.get('subject'),
        'sent_at': _iso(r.get('sent_at')),
        'status': r.get('status', 'sent'),
    } async for r in email_log.find({'user_id': user_id}).sort('sent_at', -1).limit(20)]

    return {
        'journey_stage': stage,
        'journey_stages': JOURNEY_STAGES,
        'days_inactive': days_inactive,
        'drop_off_signal': drop_off_signal,
        'activity_heatmap': activity_heatmap,
        'email_history': email_history,
    }

KB_COLLECTION = 'wehive_kb'  # admin-uploaded documents; searched by the chatbot


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _user_out(u: dict) -> dict:
    return {
        **public_user(u, include_admin_flag=True),
        'is_super_admin': is_super_admin(u),
        'email_verified': bool(u.get('email_verified')),
        'suspended': bool(u.get('suspended')),
        'suspended_reason': u.get('suspended_reason'),
        'suspended_at': _iso(u.get('suspended_at')),
        'last_login_at': _iso(u.get('last_login_at')),
        'plan_id': u.get('plan_id'),
    }


# ---------- user 360 ----------
@router.get('/users/{user_id}/profile')
async def admin_user_profile(user_id: str, _=Depends(get_current_admin_flex)):
    u = await users.find_one({'_id': user_id})
    if not u:
        raise HTTPException(404, 'User not found')
    apps = [{
        'id': a['_id'],
        'country_id': a.get('country_id'),
        'country_name': a.get('country_name'),
        'visa_type': a.get('visa_type'),
        'status': a.get('status'),
        'assigned_to': a.get('assigned_to'),
        'created_at': _iso(a.get('created_at')),
        'updated_at': _iso(a.get('updated_at')),
    } async for a in applications.find({'user_id': user_id}).sort('created_at', -1).limit(50)]
    pays = [{
        'id': p['_id'],
        'plan_id': p.get('plan_id'),
        'amount_inr': p.get('amount_inr', 0),
        'refunded_inr': p.get('refunded_inr', 0),
        'status': p.get('status'),
        'razorpay_payment_id': p.get('razorpay_payment_id'),
        'created_at': _iso(p.get('created_at')),
    } async for p in payments.find({'user_id': user_id}).sort('created_at', -1).limit(50)]
    history = [{
        'at': _iso(r.get('at')),
        'admin_email': r.get('admin_email'),
        'action': r.get('action'),
        'diff': r.get('diff'),
        'extra': r.get('extra'),
    } async for r in audit_col.find({'entity_type': 'user', 'entity_id': user_id}).sort('at', -1).limit(30)]
    extra = await _build_user_360(user_id, u, apps, pays)
    return {
        'user': _user_out(u),
        'applications': apps,
        'payments': pays,
        'paid_total_inr': sum((p['amount_inr'] or 0) - (p['refunded_inr'] or 0) for p in pays if p['status'] in PAID_STATES),
        'history': history,
        **extra,
    }


class SuspendBody(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


@router.post('/users/{user_id}/suspend')
async def admin_suspend_user(user_id: str, body: SuspendBody, admin=Depends(get_current_admin_flex)):
    if user_id == admin['_id']:
        raise HTTPException(400, 'You cannot suspend your own account')
    u = await users.find_one({'_id': user_id})
    if not u:
        raise HTTPException(404, 'User not found')
    if (u.get('email') or '').lower() in ADMIN_EMAILS:
        raise HTTPException(403, 'Super admins are managed through ADMIN_EMAILS and cannot be suspended here')
    if u.get('is_admin') and not is_super_admin(admin):
        raise HTTPException(403, 'Only a super admin can suspend another admin')
    if u.get('suspended'):
        raise HTTPException(409, 'User is already suspended')
    now = datetime.utcnow()
    reason = body.reason.strip()
    await users.update_one({'_id': user_id}, {'$set': {
        'suspended': True, 'suspended_reason': reason, 'suspended_at': now,
        'suspended_by': admin['_id'], 'updated_at': now,
    }})
    await audit_record(admin, 'suspend', 'user', user_id, before={'suspended': False}, after={'suspended': True},
                       extra={'email': u.get('email'), 'reason': reason})
    try:
        from viewmodels.email_viewmodel import send_suspension
        await send_suspension(user_id, u.get('email') or '', u.get('name') or 'there', reason)
    except Exception as _e:
        logger.warning('suspension email failed: %s', _e)
    return _user_out(await users.find_one({'_id': user_id}))


@router.post('/users/{user_id}/unsuspend')
async def admin_unsuspend_user(user_id: str, admin=Depends(get_current_admin_flex)):
    u = await users.find_one({'_id': user_id})
    if not u:
        raise HTTPException(404, 'User not found')
    if not u.get('suspended'):
        raise HTTPException(409, 'User is not suspended')
    if u.get('is_admin') and not is_super_admin(admin):
        raise HTTPException(403, 'Only a super admin can reinstate another admin')
    await users.update_one({'_id': user_id}, {
        '$set': {'suspended': False, 'updated_at': datetime.utcnow()},
        '$unset': {'suspended_reason': '', 'suspended_at': '', 'suspended_by': ''},
    })
    await audit_record(admin, 'unsuspend', 'user', user_id, before={'suspended': True}, after={'suspended': False},
                       extra={'email': u.get('email')})
    return _user_out(await users.find_one({'_id': user_id}))


class ReminderBody(BaseModel):
    template: str = Field(default='generic', max_length=50)
    note: Optional[str] = Field(default=None, max_length=500)


@router.post('/users/{user_id}/send-reminder')
async def admin_send_reminder(user_id: str, body: ReminderBody, admin=Depends(get_current_admin_flex)):
    u = await users.find_one({'_id': user_id})
    if not u:
        raise HTTPException(404, 'User not found')
    try:
        from viewmodels.email_viewmodel import send_reminder
        await send_reminder(user_id, u.get('email') or '', u.get('name') or 'there',
                            body.template, body.note or '')
    except Exception as e:
        logger.warning('reminder email failed: %s', e)
        raise HTTPException(503, 'Email could not be sent — check email service configuration')
    await audit_record(admin, 'reminder_sent', 'user', user_id,
                       extra={'template': body.template, 'email': u.get('email')})
    return {'ok': True}


# ---------- funnel ----------
PAID_STATES = ['paid', 'partially_refunded', 'refunded']
NET_AMOUNT = {'$subtract': ['$amount_inr', {'$ifNull': ['$refunded_inr', 0]}]}  # revenue after refunds

def _funnel_steps(counts: dict) -> list[dict]:
    """Ordered steps with conversion from the previous step and from the top (percent, 1dp)."""
    order = [('signups', 'Signed up'), ('started', 'Started an application'), ('submitted', 'Submitted'),
             ('paid', 'Paid'), ('approved', 'Visa approved')]
    top = counts.get('signups') or 0
    out, prev = [], None
    for key, label in order:
        n = counts.get(key) or 0
        out.append({
            'key': key, 'label': label, 'count': n,
            'from_previous': round(100 * n / prev, 1) if prev else None,
            'from_top': round(100 * n / top, 1) if top else None,
        })
        prev = n
    return out


@router.get('/funnel')
async def admin_funnel(_=Depends(get_current_admin_flex), days: int = Query(90, ge=7, le=730)):
    since = datetime.utcnow() - timedelta(days=days)
    cohort = [u['_id'] async for u in users.find({'created_at': {'$gte': since}}, {'_id': 1})]
    cohort_filter = {'user_id': {'$in': cohort}}

    started = await applications.distinct('user_id', cohort_filter)
    submitted = await applications.distinct('user_id', {**cohort_filter, 'status': {'$ne': AppStatus.DRAFT.value}})
    approved = await applications.distinct('user_id', {**cohort_filter, 'status': AppStatus.APPROVED.value})
    paid = await payments.distinct('user_id', {**cohort_filter, 'status': {'$in': PAID_STATES}})
    steps = _funnel_steps({'signups': len(cohort), 'started': len(started), 'submitted': len(submitted),
                           'paid': len(paid), 'approved': len(approved)})

    by_month = [{'month': r['_id'], 'amount_inr': r['amount'], 'count': r['count']} async for r in payments.aggregate([
        {'$match': {'status': {'$in': PAID_STATES}, 'created_at': {'$gte': since}}},
        {'$group': {'_id': {'$dateToString': {'format': '%Y-%m', 'date': '$created_at'}},
                    'amount': {'$sum': NET_AMOUNT}, 'count': {'$sum': 1}}},
        {'$sort': {'_id': 1}},
    ])]
    by_plan = [{'plan_id': r['_id'] or 'unknown', 'amount_inr': r['amount'], 'count': r['count']} async for r in payments.aggregate([
        {'$match': {'status': {'$in': PAID_STATES}, 'created_at': {'$gte': since}}},
        {'$group': {'_id': '$plan_id', 'amount': {'$sum': NET_AMOUNT}, 'count': {'$sum': 1}}},
        {'$sort': {'amount': -1}},
    ])]
    total = sum(m['amount_inr'] for m in by_month)
    count = sum(m['count'] for m in by_month)
    return {
        'days': days,
        'steps': steps,
        'revenue': {
            'paid_inr': total,
            'paid_count': count,
            'avg_order_inr': round(total / count) if count else 0,
            'by_month': by_month,
            'by_plan': by_plan,
        },
    }


# ---------- health ----------
def _svc(id_: str, name: str, status: str, detail: str = '', action: str = '') -> dict:
    return {'id': id_, 'name': name, 'status': status, 'detail': detail, 'action': action}


async def _settings(ns: str) -> dict:
    from settings_service import get_all
    try:
        return await get_all(ns) or {}
    except Exception:
        return {}


@router.get('/health')
async def admin_health(_=Depends(get_current_admin_flex)):
    """Status is one of ok / warning / missing / error. Never returns secret values."""
    out = []

    try:
        await db.command('ping')
        out.append(_svc('mongo', 'MongoDB', 'ok'))
    except Exception as e:
        out.append(_svc('mongo', 'MongoDB', 'error', type(e).__name__, 'Check MONGO_URL and that the database is reachable'))

    fb = await _settings('firebase')
    fb_ok = (os.environ.get('FIREBASE_PROJECT_ID') or fb.get('projectId')) and \
            (os.environ.get('FIREBASE_CREDENTIALS') or fb.get('service_account_key'))
    out.append(_svc('firebase', 'Firebase login', 'ok' if fb_ok else 'missing', '',
                    '' if fb_ok else 'Set FIREBASE_PROJECT_ID and FIREBASE_CREDENTIALS'))

    from settings_service import get_razorpay_keys
    key_id, key_secret, webhook = await get_razorpay_keys()
    if key_id and key_secret:
        mode = 'live' if key_id.startswith('rzp_live_') else 'test'
        out.append(_svc('razorpay', 'Razorpay payments', 'ok' if webhook else 'warning', f'{mode} mode',
                        '' if webhook else 'Set RAZORPAY_WEBHOOK_SECRET so missed callbacks still mark orders paid'))
    else:
        out.append(_svc('razorpay', 'Razorpay payments', 'missing', '', 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET'))

    smtp, postal = await _settings('smtp'), await _settings('postal')
    smtp_ok = (smtp.get('user') or os.environ.get('SMTP_USER')) and (smtp.get('password') or os.environ.get('SMTP_PASSWORD'))
    postal_ok = (postal.get('api_url') or os.environ.get('POSTAL_API_URL')) and (postal.get('api_key') or os.environ.get('POSTAL_API_KEY'))
    out.append(_svc('email', 'Email (OTP, resets, notifications)', 'ok' if smtp_ok or postal_ok else 'missing',
                    'Postal' if postal_ok else ('SMTP' if smtp_ok else ''), '' if smtp_ok or postal_ok else 'Configure SMTP or Postal'))

    import storage
    r2 = await _settings('r2')
    r2_ok = storage.is_configured() or bool(r2.get('access_key_id') and r2.get('bucket'))
    out.append(_svc('r2', 'File storage (R2)', 'ok' if r2_ok else 'warning', 'R2' if r2_ok else 'local disk',
                    '' if r2_ok else 'Uploads are on local disk and are lost on redeploy unless the folder is a volume'))

    ai_doc = await db['ai_settings'].find_one({}) or {}
    llm_ok = bool(ai_doc.get('providers')) or bool(os.environ.get('DEFAULT_LLM_KEY'))
    out.append(_svc('llm', 'AI provider', 'ok' if llm_ok else 'missing',
                    ai_doc.get('active_provider') or os.environ.get('DEFAULT_LLM_PROVIDER', ''),
                    '' if llm_ok else 'Connect a provider in Settings → AI Marketplace or set DEFAULT_LLM_KEY'))

    gkey = os.environ.get('GOOGLE_API_KEY', '').strip()
    if not gkey:
        out.append(_svc('google_kg', 'Google Knowledge Graph', 'missing', '', 'Set GOOGLE_API_KEY'))
    elif not gkey.startswith('AIza'):
        out.append(_svc('google_kg', 'Google Knowledge Graph', 'warning', 'key format looks wrong',
                        'Google API keys start with "AIza"; create one in Google Cloud → Credentials'))
    else:
        out.append(_svc('google_kg', 'Google Knowledge Graph', 'ok'))

    sherpa = bool(os.environ.get('SHERPA_API_KEY'))
    out.append(_svc('sherpa', 'Visa requirements (Sherpa)', 'ok' if sherpa else 'missing', '', '' if sherpa else 'Set SHERPA_API_KEY'))

    try:
        from ollama_embeddings import OLLAMA_HOST, is_available
        ollama = await is_available()
        out.append(_svc('ollama', 'Embeddings (Ollama)', 'ok' if ollama else 'warning', OLLAMA_HOST,
                        '' if ollama else 'Chat knowledge-base search is off until Ollama is reachable'))
    except Exception as e:
        out.append(_svc('ollama', 'Embeddings (Ollama)', 'error', type(e).__name__))

    try:
        from vector_store import collection_count, list_collections
        names = list_collections()
        docs = sum(collection_count(n) for n in names)
        out.append(_svc('vector_store', 'Knowledge base (vector store)', 'ok' if docs else 'warning',
                        f'{len(names)} collections, {docs} chunks', '' if docs else 'Ingest countries/universities or upload documents'))
    except Exception as e:
        out.append(_svc('vector_store', 'Knowledge base (vector store)', 'error', type(e).__name__))

    out.append(_svc('super_admins', 'Super admins (ADMIN_EMAILS)', 'ok' if ADMIN_EMAILS else 'missing',
                    f'{len(ADMIN_EMAILS)} configured' if ADMIN_EMAILS else '',
                    '' if ADMIN_EMAILS else 'Set ADMIN_EMAILS, otherwise nobody can open Settings or manage admins'))

    rank = {'error': 0, 'missing': 1, 'warning': 2, 'ok': 3}
    worst = min((s['status'] for s in out), key=rank.__getitem__)
    return {'overall': worst, 'services': out, 'checked_at': datetime.utcnow().isoformat()}


# ---------- RAG uploads ----------
RAG_EXTS = {'.pdf', '.txt', '.md'}


def _slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:60] or 'document'


def extract_text(filename: str, data: bytes) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext not in RAG_EXTS:
        raise HTTPException(400, 'Upload a PDF, .txt or .md file')
    if ext == '.pdf':
        try:
            from pypdf import PdfReader
        except ImportError:
            raise HTTPException(503, 'PDF parsing is not installed on this server')
        try:
            reader = PdfReader(io.BytesIO(data))
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        except Exception:
            raise HTTPException(400, 'Could not read this PDF')
    else:
        text = data.decode('utf-8', errors='replace')
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    if len(text) < 20:
        raise HTTPException(400, 'No readable text found (scanned PDFs need OCR first)')
    return text


@router.post('/rag/upload')
async def admin_rag_upload(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None, max_length=200),
    admin=Depends(get_current_admin_flex),
):
    data = await read_capped(file, 20)
    name = file.filename or 'document'
    text = extract_text(name, data)
    from rag_ingest import ingest_text_documents
    doc_id = f'{_slug(title or os.path.splitext(name)[0])}-{uuid.uuid4().hex[:8]}'
    try:
        res = await ingest_text_documents(
            collection=KB_COLLECTION,
            items=[{'id': doc_id, 'text': text, 'name': title or name}],
            extra_metadata={'type': 'admin_upload', 'source': name, 'uploaded_by': admin.get('email') or admin['_id']},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning('RAG upload failed: %s', type(e).__name__)
        raise HTTPException(503, 'Could not index the document — is the embedding service (Ollama) running?')
    await audit_record(admin, 'upload', 'rag_document', doc_id,
                       extra={'filename': name, 'chars': len(text), 'collection': KB_COLLECTION})
    return {'ok': True, 'id': doc_id, 'collection': KB_COLLECTION, 'chars': len(text), 'result': res}
