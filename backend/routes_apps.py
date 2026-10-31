"""Application document, timeline, messaging + PDF receipt routes."""
import os
import io
import re
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from pydantic import BaseModel, Field

from auth_utils import get_current_user
from rate_limit import RateLimit

_upload_limiter = RateLimit(max_calls=20, window_seconds=60)
from config import CONSULTANT_NAME, CONSULTANT_AUTO_REPLY, SUPPORT_EMAIL, SUPPORT_PHONE
from db import db, applications
import asyncio
from routes_chatbot import notify_status_change
from serializers import serialize_doc
from agents.document_validator import (
    validate_document_background,
    get_required_doc_types,
    check_user_contact_fields,
)
_serialize = serialize_doc
import storage as r2

router = APIRouter(prefix='/users/me/applications', tags=['applications'])

UPLOAD_ROOT = Path(os.environ.get('UPLOAD_DIR', Path(__file__).parent / 'uploads'))
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME = {
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif',
}

# Magic-byte signatures for allowed file types.
# Client-supplied Content-Type can be spoofed; verify actual bytes.
_MAGIC: list[tuple[bytes, str]] = [
    (b'%PDF', 'application/pdf'),
    (b'\xff\xd8\xff', 'image/jpeg'),
    (b'\x89PNG\r\n\x1a\n', 'image/png'),
    (b'RIFF', 'image/webp'),   # RIFF....WEBP
]


def _detect_mime(data: bytes) -> Optional[str]:
    """Return detected MIME type from leading bytes, or None if unrecognised."""
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    for magic, mime in _MAGIC:
        if magic != b'RIFF' and data[:len(magic)] == magic:
            return mime
    # HEIC/HEIF: ftyp box at offset 4
    if len(data) >= 12 and data[4:8] == b'ftyp':
        brand = data[8:12]
        if brand in (b'heic', b'heix', b'mif1', b'msf1', b'hevc', b'hevx'):
            return 'image/heic'
    return None


# Filename sanitizer: keep only safe characters, strip path components.
_UNSAFE_RE = re.compile(r'[^\w.\-]')

def _safe_filename(name: str) -> str:
    base = Path(name).name  # strip any directory component
    safe = _UNSAFE_RE.sub('_', base)[:120]
    return safe or 'document'


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


_ALLOWED_DOC_TYPES = {
    "passport", "visa", "bank_statement", "employment_letter", "invitation_letter",
    "travel_insurance", "flight_booking", "hotel_booking", "photographs",
    "birth_certificate", "marriage_certificate", "degree_certificate",
    "transcripts", "ielts_results", "toefl_results", "financial_documents",
    "tax_returns", "police_clearance", "medical_certificate", "sponsorship_letter",
    "proof_of_accommodation", "proof_of_funds", "cover_letter", "itinerary",
    "aadhaar_card", "pan_card", "other",
}


@router.post('/{application_id}/documents')
async def upload_document(
    application_id: str,
    request: Request,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    _=Depends(_upload_limiter),
):
    if doc_type.lower() not in _ALLOWED_DOC_TYPES:
        raise HTTPException(400, f"Invalid doc_type. Allowed: {', '.join(sorted(_ALLOWED_DOC_TYPES))}")
    app = await _get_app_for_user(application_id, user["_id"])  # noqa: F841 (used for auth)
    # Read file with size cap
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f'File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit')

    # Validate by actual file content, not client-supplied Content-Type header.
    detected = _detect_mime(content)
    if detected is None or detected not in ALLOWED_MIME:
        raise HTTPException(
            415,
            'Unsupported file type. Only PDF, JPEG, PNG, and WEBP are allowed.',
        )

    doc_id = str(uuid.uuid4())
    safe_name = _safe_filename(file.filename or 'document')
    mime = detected

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
        saved_path = (user_dir / f'{doc_id}__{safe_name}').resolve()
        # Guard against path traversal escaping the upload root.
        if not saved_path.is_relative_to(UPLOAD_ROOT.resolve()):
            raise HTTPException(400, 'Invalid filename')
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

    # Background: validate doc (MIME, resolution, etc.) and set status to verified/needs_reupload.
    asyncio.create_task(validate_document_background(
        application_id, doc_id, user['_id'], content, safe_name, len(content)
    ))

    # Best-effort: index document text/OCR into Qdrant so Eva can answer questions about it.
    # PDFs → pypdf text extraction; images → pytesseract OCR then Ollama llava fallback.
    _INDEXABLE_MIMES = {'application/pdf', 'image/jpeg', 'image/png', 'image/webp'}
    if mime in _INDEXABLE_MIMES:
        try:
            import asyncio as _aio
            from user_doc_indexer import index_user_doc
            _aio.ensure_future(index_user_doc(
                doc_id=doc_id,
                user_id=str(user['_id']),
                application_id=application_id,
                doc_type=doc_type,
                filename=safe_name,
                content=content,
                mime=mime,
            ))
        except Exception:
            pass

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
    # Remove from Qdrant (best-effort)
    try:
        import asyncio as _aio
        from qdrant_store import delete_document as qdrant_delete_doc
        _aio.ensure_future(qdrant_delete_doc("wehive_user_docs", doc_id))
    except Exception:
        pass
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


# ---------- Required documents check ----------
OPTIONAL_DOC_TYPES = [
    "travel_insurance", "cover_letter", "itinerary",
    "medical_certificate", "proof_of_accommodation",
]


def _build_doc_report(app: dict, user: dict) -> dict:
    """Build the required-documents report for an application."""
    passport_country = app.get("passport_country", "IN")
    visa_type = app.get("visa_type", "tourist")
    mandatory = get_required_doc_types(visa_type, passport_country)
    uploaded_types = [d.get("doc_type") for d in app.get("documents", [])]
    missing_docs = [d for d in mandatory if d not in uploaded_types]
    contact_missing = check_user_contact_fields(user)
    return {
        "mandatory": mandatory,
        "optional": OPTIONAL_DOC_TYPES,
        "uploaded": uploaded_types,
        "missing_docs": missing_docs,
        "contact_info_required": ["email", "phone"],
        "contact_info_missing": contact_missing,
        "is_complete": len(missing_docs) == 0 and len(contact_missing) == 0,
    }


@router.get('/{application_id}/required-documents')
async def required_documents(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    return _build_doc_report(app, user)


# ---------- Status timeline ----------
@router.post('/{application_id}/submit')
async def submit_application(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    if not app.get('documents'):
        raise HTTPException(400, 'Upload at least one document before submitting')

    report = _build_doc_report(app, user)
    if report["missing_docs"]:
        raise HTTPException(400, detail={
            "detail": "Missing required documents",
            "missing": report["missing_docs"],
        })

    now = datetime.utcnow()
    events = app.get('timeline') or _initial_timeline()
    events.append({'id': str(uuid.uuid4()), 'status': 'submitted', 'label': 'Application submitted', 'at': now, 'note': 'Your application is queued for review.'})
    await applications.update_one(
        {'_id': application_id},
        {'$set': {'status': 'submitted', 'timeline': events, 'updated_at': now}},
    )
    await notify_status_change(user['_id'], application_id, 'submitted')
    return {'ok': True, 'status': 'submitted'}


# ---------- Messages with consultant ----------
@router.get('/{application_id}/messages')
async def list_messages(application_id: str, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])
    msgs = app.get('messages') or []
    return [_serialize(m) for m in msgs]


class _MessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


@router.post('/{application_id}/messages')
async def post_message(application_id: str, payload: _MessageRequest, user=Depends(get_current_user)):
    app = await _get_app_for_user(application_id, user["_id"])  # noqa: F841 (used for auth)
    text = payload.text.strip()
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


@router.get('/{application_id}/summary.pdf')
async def summary_pdf(application_id: str, user=Depends(get_current_user)):
    """Download a full application summary as PDF."""
    from agents.pdf_agent import generate_application_summary_pdf
    app = await _get_app_for_user(application_id, user["_id"])
    pdf_bytes = generate_application_summary_pdf(app, user)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="wehive-summary-{application_id[:8]}.pdf"'},
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
        f'This receipt is generated by We Hive Immigration Services. For queries, write to {SUPPORT_EMAIL} or call {SUPPORT_PHONE}.',
        ParagraphStyle('foot', parent=body, fontSize=8, textColor=grey),
    ))
    elements.append(Paragraph(
        'Visa decisions and timelines are set by the embassy or consulate; WeHive cannot guarantee an outcome or a date. '
        f'Refund requests are reviewed under our refund policy: write to {SUPPORT_EMAIL}.',
        ParagraphStyle('foot2', parent=body, fontSize=8, textColor=red),
    ))

    doc.build(elements)
    return buf.getvalue()
