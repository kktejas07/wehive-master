"""Suspicious-document queue: AI scans that need a human look before an application goes further.

  GET   /api/admin/review-queue            — flagged scans, worst first (state: open / cleared / suspicious)
  PATCH /api/admin/review-queue/{scan_id}  — record a decision; "suspicious" also adds an internal note

Flags are deterministic checks on what the scan extracted — they are reasons to look, not verdicts:
  mrz_checksum     passport MRZ check digits don't add up (ICAO 9303)              critical
  mrz_mismatch     MRZ disagrees with the printed passport number / dates           critical
  expired          passport or document validity date is in the past                warning
  issuer_unknown   Google Knowledge Graph has no organisation by the issuer's name  warning
  name_mismatch    the name on the document shares no word with the applicant's     warning
  low_confidence   the AI was under 60% sure of its own reading                     info
  ai_warnings      the AI noted problems (blur, cropping, edits…)                   info
"""
import re
import uuid
from datetime import date, datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex, require_role
from audit import record as audit_record
from db import db, scans, users

router = APIRouter(prefix='/admin', tags=['admin-doc-review'])
internal_notes = db['application_internal_notes']

SEVERITY = {'critical': 3, 'warning': 2, 'info': 1}
SCAN_WINDOW = 1000  # newest scans examined per request


# ---------- MRZ (passport TD3, line 2) ----------
def mrz_check_digit(field: str) -> str:
    total = 0
    for i, ch in enumerate(field):
        if ch.isdigit():
            v = int(ch)
        elif 'A' <= ch <= 'Z':
            v = ord(ch) - 55
        else:  # '<' filler
            v = 0
        total += v * (7, 3, 1)[i % 3]
    return str(total % 10)


def _mrz_date(yymmdd: str, future: bool) -> Optional[date]:
    try:
        yy, mm, dd = int(yymmdd[:2]), int(yymmdd[2:4]), int(yymmdd[4:6])
    except ValueError:
        return None
    this = date.today().year % 100
    century = 2000 if (future or yy <= this) else 1900
    if future and yy < this - 50:
        century = 2100
    try:
        return date(century + yy, mm, dd)
    except ValueError:
        return None


def parse_mrz_line2(line: str) -> Optional[dict]:
    """None when the line isn't a readable TD3 line 2; otherwise the fields and which checks failed."""
    s = re.sub(r'\s+', '', (line or '').upper())
    if len(s) != 44 or not re.fullmatch(r'[A-Z0-9<]{44}', s):
        return None
    checks = {
        'passport_number': (s[0:9], s[9]),
        'date_of_birth': (s[13:19], s[19]),
        'expiry_date': (s[21:27], s[27]),
    }
    bad = [k for k, (val, cd) in checks.items() if mrz_check_digit(val) != cd]
    if s[42] != '<' or s[28:42].strip('<'):
        if mrz_check_digit(s[28:42]) != s[42]:
            bad.append('personal_number')
    composite = s[0:10] + s[13:20] + s[21:43]
    if mrz_check_digit(composite) != s[43]:
        bad.append('composite')
    return {
        'passport_number': s[0:9].replace('<', ''),
        'date_of_birth': _mrz_date(s[13:19], future=False),
        'expiry_date': _mrz_date(s[21:27], future=True),
        'failed': bad,
    }


# ---------- flags ----------
def _date(v) -> Optional[date]:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, str) and len(v) >= 10:
        try:
            return date.fromisoformat(v[:10])
        except ValueError:
            return None
    return None


def _words(name) -> set:
    return {w for w in re.findall(r'[a-z]+', (name or '').lower()) if len(w) > 1}


def scan_flags(scan: dict, applicant_name: Optional[str], today: date) -> list[dict]:
    x = scan.get('extracted') or {}
    flags = []

    def add(kind, severity, message):
        flags.append({'kind': kind, 'severity': severity, 'message': message})

    if scan.get('kind') == 'passport' and x.get('mrz_line2'):
        mrz = parse_mrz_line2(x['mrz_line2'])
        if mrz:
            if mrz['failed']:
                add('mrz_checksum', 'critical', f"MRZ check digits fail for: {', '.join(mrz['failed']).replace('_', ' ')}")
            diffs = []
            printed_no = re.sub(r'[^A-Z0-9]', '', (x.get('passport_number') or '').upper())
            if printed_no and mrz['passport_number'] and printed_no != mrz['passport_number']:
                diffs.append('passport number')
            for f in ('date_of_birth', 'expiry_date'):
                printed = _date(x.get(f))
                if printed and mrz[f] and printed != mrz[f]:
                    diffs.append(f.replace('_', ' '))
            if diffs:
                add('mrz_mismatch', 'critical', f"Printed {', '.join(diffs)} differ from the MRZ")

    valid_until = _date(x.get('expiry_date') or x.get('valid_until'))
    if valid_until and valid_until < today:
        add('expired', 'warning', f'Expired on {valid_until.isoformat()}')

    iv = x.get('issuer_verification')
    if isinstance(iv, dict) and iv.get('found') is False:
        add('issuer_unknown', 'warning', f"No organisation called “{iv.get('query')}” in Google's Knowledge Graph")

    doc_name = x.get('full_name') or x.get('issued_to') or ' '.join(filter(None, [x.get('given_names'), x.get('surname')]))
    if doc_name and applicant_name and _words(applicant_name) and _words(doc_name) and not (_words(doc_name) & _words(applicant_name)):
        add('name_mismatch', 'warning', f'Document is for “{doc_name}”, applicant is “{applicant_name}”')

    conf = x.get('confidence')
    if isinstance(conf, (int, float)) and conf < 60:
        add('low_confidence', 'info', f'AI confidence {int(conf)}%')

    warns = [w for w in (x.get('warnings') or []) if isinstance(w, str) and w.strip()]
    if warns:
        add('ai_warnings', 'info', '; '.join(warns)[:300])

    return sorted(flags, key=lambda f: -SEVERITY[f['severity']])


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


@router.get('/review-queue')
async def admin_review_queue(
    _=Depends(get_current_admin_flex),
    state: Literal['open', 'cleared', 'suspicious'] = 'open',
    limit: int = Query(50, ge=1, le=200),
):
    filt = {'review': None} if state == 'open' else {'review.decision': state}
    today = date.today()
    name_cache: dict = {}
    items, counts = [], {'critical': 0, 'warning': 0, 'info': 0}
    async for s in scans.find(filt).sort('created_at', -1).limit(SCAN_WINDOW):
        uid = s.get('user_id')
        if uid not in name_cache:
            u = await users.find_one({'_id': uid}, {'name': 1, 'email': 1}) or {}
            name_cache[uid] = u
        u = name_cache[uid]
        flags = scan_flags(s, u.get('name'), today)
        if not flags:
            continue
        top = flags[0]['severity']
        counts[top] += 1
        x = s.get('extracted') or {}
        items.append({
            'id': s['_id'],
            'kind': s.get('kind'),
            'document': x.get('document_kind') or x.get('document_type') or s.get('kind'),
            'title': x.get('title') or x.get('full_name') or x.get('issued_by'),
            'severity': top,
            'score': sum(SEVERITY[f['severity']] for f in flags),
            'flags': flags,
            'user': {'id': uid, 'name': u.get('name'), 'email': u.get('email')},
            'application_id': s.get('application_id'),
            'review': {**s['review'], 'at': _iso(s['review'].get('at'))} if s.get('review') else None,
            'created_at': _iso(s.get('created_at')),
        })
    items.sort(key=lambda i: (-SEVERITY[i['severity']], -i['score']))
    return {'items': items[:limit], 'total': len(items), 'counts': counts}


class ReviewDecision(BaseModel):
    decision: Literal['cleared', 'suspicious']
    note: Optional[str] = Field(default=None, max_length=1000)


@router.patch('/review-queue/{scan_id}')
async def admin_review_scan(scan_id: str, body: ReviewDecision, admin=Depends(require_role(['manager', 'support', 'doc_reviewer']))):
    s = await scans.find_one({'_id': scan_id})
    if not s:
        raise HTTPException(404, 'Scan not found')
    note = (body.note or '').strip()
    if body.decision == 'suspicious' and len(note) < 3:
        raise HTTPException(400, 'Say what looks wrong — it goes on the case for whoever handles it next.')
    now = datetime.utcnow()
    review = {'decision': body.decision, 'note': note or None, 'by': admin.get('email') or admin['_id'], 'at': now}
    await scans.update_one({'_id': scan_id}, {'$set': {'review': review}})
    if body.decision == 'suspicious' and s.get('application_id'):
        await internal_notes.insert_one({
            '_id': str(uuid.uuid4()), 'application_id': s['application_id'], 'by': review['by'], 'at': now,
            'text': f"⚠ Document flagged as suspicious ({(s.get('extracted') or {}).get('document_kind') or s.get('kind')}): {note}",
        })
    await audit_record(admin, body.decision, 'scan', scan_id, extra={'note': note or None, 'application_id': s.get('application_id')})
    return {'id': scan_id, 'review': {**review, 'at': now.isoformat()}}
