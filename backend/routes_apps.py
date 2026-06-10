"""Application document, timeline, messaging + PDF receipt routes."""
import os
import io
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from pydantic import BaseModel

from auth_utils import get_current_user
from config import CONSULTANT_NAME, CONSULTANT_AUTO_REPLY
from db import db, applications
from serializers import serialize_doc
import storage as r2

router = APIRouter(prefix='/users/me/applications', tags=['applications'])

UPLOAD_ROOT = Path('/app/backend/uploads')
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME = {
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'application/octet-stream',
}


async def _get_app_for_user(application_id: str, user_id: str):
    app = await applications.find_one({'_id': application_id, 'user_id': user_id})
    if not app:
        raise HTTPException(404, 'Application not found')
    return app


# ---------- Form data (auto-filled from passport scan, user-editable) ----------
ALLOWED_FORM_FIELDS = {
    'full_name', 'given_names', 'surname', 'date_of_birth', 'gender',
    'nationality', 'place_of_birth', 'passport_number', 'issue_date',
    'expiry_date', 'issuing_country', 'issuing_authority',
    'email', 'phone', 'address',
}


def _sanitize_form(payload: dict) -> dict:
    """Whitelist the fields the user can write to applications.form_data."""
    out = {}
    for k, v in (payload or {}).items():
        if k not in ALLOWED_FORM_FIELDS:
            continue
        if v is None:
            out[k] = None
            continue
        s = str(v).strip()
        if not s:
            continue
        out[k] = s[:200]
    return out


class FormDataRequest(BaseModel):
    form_data: dict


@router.patch('/{application_id}/form')
async def update_form_data(
    application_id: str,
    req: FormDataRequest,
    user=Depends(get_current_user),
):
    app = await _get_app_for_user(application_id, user['_id'])
    cleaned = _sanitize_form(req.form_data or {})
    existing = app.get('form_data') or {}
    merged = {**existing, **cleaned}
    now = datetime.utcnow()
    await applications.update_one(
        {'_id': application_id},
        {'$set': {'form_data': merged, 'form_updated_at': now, 'updated_at': now}},
    )
    return {'form_data': merged, 'form_updated_at': now.isoformat()}


def _initial_timeline():
    now = datetime.utcnow()
    return [
        {'id': str(uuid.uuid4()), 'status': 'draft', 'label': 'Draft created', 'at': now, 'note': 'Application opened. Upload your documents to continue.'},
    ]


# ---------- Application detail (with timeline + docs) ----------
@router.get('/{application_id}')
async def application_detail(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    return _serialize(app)


# ---------- Documents ----------
@router.get('/{application_id}/documents')
async def list_documents(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    return [_serialize(d) for d in app.get('documents', [])]


@router.post('/{application_id}/documents')
async def upload_document(
    application_id: str,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    app = await _get_app_for_user(application_id, user["_id"])  # noqa: F841 (used for auth)
    # Read file with size cap
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f'File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit')
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(415, f'Unsupported file type: {file.content_type}')

    doc_id = str(uuid.uuid4())
    safe_name = (file.filename or 'document').replace('/', '_').replace('\\', '_')
    mime = file.content_type or 'application/octet-stream'

    now = datetime.utcnow()
    doc = {
        '_id': doc_id,
        'doc_type': doc_type,
        'filename': safe_name,
        'mime': mime,
        'size': len(content),
        'status': 'uploaded',
        'note': 'Auto-review queued',
        'uploaded_at': now,
    }

    if r2.is_configured():
        key = r2.doc_key(user['_id'], application_id, doc_id, safe_name)
        r2.upload_bytes(key, content, mime)
        doc['storage'] = 'r2'
        doc['object_key'] = key
    else:
        user_dir = UPLOAD_ROOT / user['_id'] / application_id
        user_dir.mkdir(parents=True, exist_ok=True)
        saved_path = user_dir / f'{doc_id}__{safe_name}'
        with open(saved_path, 'wb') as f:
            f.write(content)
        doc['storage'] = 'local'
        doc['storage_path'] = str(saved_path)

    await applications.update_one(
        {'_id': application_id},
        {
            '$push': {'documents': doc},
            '$set': {'updated_at': now},
        },
    )
    return _serialize(doc)


@router.delete('/{application_id}/documents/{doc_id}')
async def delete_document(application_id: str, doc_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    doc = next((d for d in app.get('documents', []) if d.get('_id') == doc_id), None)
    if not doc:
        raise HTTPException(404, 'Document not found')
    if doc.get('storage') == 'r2' and doc.get('object_key'):
        r2.delete_object(doc['object_key'])
    elif doc.get('storage_path'):
        try:
            Path(doc['storage_path']).unlink(missing_ok=True)
        except Exception:
            pass
    await applications.update_one(
        {'_id': application_id},
        {'$pull': {'documents': {'_id': doc_id}}},
    )
    return {'ok': True}


@router.get('/{application_id}/documents/{doc_id}/download')
async def download_document(application_id: str, doc_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    doc = next((d for d in app.get('documents', []) if d.get('_id') == doc_id), None)
    if not doc:
        raise HTTPException(404, 'Document not found')
    if doc.get('storage') == 'r2' and doc.get('object_key'):
        url = r2.signed_download_url(doc['object_key'], filename=doc.get('filename'))
        return RedirectResponse(url, status_code=307)
    p = Path(doc.get('storage_path', ''))
    if not p.exists():
        raise HTTPException(410, 'File missing on storage')
    return FileResponse(str(p), media_type=doc.get('mime', 'application/octet-stream'), filename=doc['filename'])


# ---------- Status timeline ----------
@router.post('/{application_id}/submit')
async def submit_application(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    if not app.get('documents'):
        raise HTTPException(400, 'Upload at least one document before submitting')
    now = datetime.utcnow()
    events = app.get('timeline') or _initial_timeline()
    events.append({'id': str(uuid.uuid4()), 'status': 'submitted', 'label': 'Submitted to embassy', 'at': now, 'note': 'Your file is on its way.'})
    events.append({'id': str(uuid.uuid4()), 'status': 'in_review', 'label': 'In consular review', 'at': now, 'note': 'A consular officer is reviewing your case.'})
    await applications.update_one(
        {'_id': application_id},
        {'$set': {'status': 'in_review', 'timeline': events, 'updated_at': now}},
    )
    return {'ok': True, 'status': 'in_review'}


# ---------- Messages with consultant ----------
@router.get('/{application_id}/messages')
async def list_messages(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    msgs = app.get('messages') or []
    return [_serialize(m) for m in msgs]


@router.post('/{application_id}/messages')
async def post_message(application_id: str, payload: dict, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])  # noqa: F841 (used for auth)
    text = (payload or {}).get('text', '').strip()
    if not text:
        raise HTTPException(400, 'Empty message')
    now = datetime.utcnow()
    msg = {'_id': str(uuid.uuid4()), 'from': 'user', 'text': text, 'at': now}
    auto = {
        '_id': str(uuid.uuid4()),
        'from': 'consultant',
        'name': CONSULTANT_NAME,
        'text': CONSULTANT_AUTO_REPLY,
        'at': now,
    }
    await applications.update_one(
        {'_id': application_id},
        {'$push': {'messages': {'$each': [msg, auto]}}, '$set': {'updated_at': now}},
    )
    return [_serialize(msg), _serialize(auto)]


# ---------- PDF receipt ----------
@router.get('/{application_id}/receipt.pdf')
async def receipt_pdf(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    pdf_bytes = _make_receipt_pdf(app, user)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="wehive-receipt-{application_id[:8]}.pdf"'},
    )


def _make_receipt_pdf(app: dict, user: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    )
    from reportlab.lib.units import mm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    navy = colors.HexColor('#0a2c8a')
    red = colors.HexColor('#e1212c')
    grey = colors.HexColor('#475569')

    title_style = ParagraphStyle('title', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=24, textColor=navy, spaceAfter=4)
    sub_style = ParagraphStyle('sub', parent=styles['Normal'], fontSize=10, textColor=grey, spaceAfter=18)
    h2_style = ParagraphStyle('h2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13, textColor=navy, spaceBefore=12, spaceAfter=6)
    body = ParagraphStyle('body', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#0f172a'), leading=14)

    elements = []
    elements.append(Paragraph('We Hive — Visa receipt', title_style))
    elements.append(Paragraph(
        f"Receipt #{app['_id'][:8].upper()}  ·  Issued {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}",
        sub_style,
    ))

    # Customer
    customer = [
        ['Customer', user.get('name') or '—'],
        ['Email', user.get('email') or '—'],
        ['Phone', user.get('phone') or '—'],
    ]
    t = Table(customer, colWidths=[35 * mm, 130 * mm])
    t.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
        ('TEXTCOLOR', (0, 0), (0, -1), grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)

    # Application
    elements.append(Paragraph('Application', h2_style))
    app_rows = [
        ['Country', app.get('country_id', '—').upper()],
        ['Visa type', app.get('visa_type', '—')],
        ['Travel date', app.get('travel_date') or 'Not set'],
        ['Status', app.get('status', 'draft').replace('_', ' ').title()],
    ]
    t2 = Table(app_rows, colWidths=[35 * mm, 130 * mm])
    t2.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
        ('TEXTCOLOR', (0, 0), (0, -1), grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t2)

    # Timeline
    elements.append(Paragraph('Status timeline', h2_style))
    timeline = app.get('timeline') or []
    if not timeline:
        elements.append(Paragraph('Timeline begins after first submission.', body))
    else:
        rows = [['When', 'Event']]
        for ev in timeline:
            at = ev.get('at')
            at_s = at.strftime('%d %b %Y %H:%M') if isinstance(at, datetime) else str(at)
            rows.append([at_s, ev.get('label', '')])
        t3 = Table(rows, colWidths=[40 * mm, 125 * mm])
        t3.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), navy),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, navy),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t3)

    # Documents
    elements.append(Paragraph('Documents on file', h2_style))
    docs = app.get('documents') or []
    if not docs:
        elements.append(Paragraph('No documents uploaded yet.', body))
    else:
        rows = [['Type', 'File', 'Status']]
        for d in docs:
            rows.append([d.get('doc_type', '—'), d.get('filename', '—'), d.get('status', 'uploaded').title()])
        t4 = Table(rows, colWidths=[55 * mm, 75 * mm, 35 * mm])
        t4.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), navy),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, navy),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t4)

    elements.append(Spacer(1, 18))
    elements.append(Paragraph(
        'This receipt is generated by We Hive Immigration Services. For queries, write to info@wehive.co.in or call +91 91132 56726.',
        ParagraphStyle('foot', parent=body, fontSize=8, textColor=grey),
    ))
    elements.append(Paragraph(
        'On-time guarantee: if your visa is delayed beyond the date promised at checkout, the entire We Hive service fee will be refunded automatically.',
        ParagraphStyle('foot2', parent=body, fontSize=8, textColor=red),
    ))

    doc.build(elements)
    return buf.getvalue()
