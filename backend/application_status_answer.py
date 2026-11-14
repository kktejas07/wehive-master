"""Answer "what is my application status?" from the user's own applications.

The chat assistants know visa rules, not a user's account, so this question is
answered directly from the database instead of being sent to a model.
"""
import re
from typing import Optional

from db import db

applications = db['applications']
countries = db['countries_v2']

_STATUS_Q = re.compile(
    r"\b(status|progress|update|track|where)\b.*\b(my|our)\b.*\b(application|visa|case|file)\b"
    r"|\b(my|our)\b.*\b(application|visa|case|file)\b.*\b(status|progress|approved|rejected|submitted|stuck|pending|update)\b"
    r"|\bapplication status\b|\btrack my\b",
    re.I | re.S,
)

_LABELS = {
    'draft': 'Draft, not submitted yet',
    'submitted': 'Submitted, waiting for a consultant to review',
    'in_review': 'In review',
    'awaiting_docs': 'Waiting for documents from you',
    'docs_pending': 'Waiting for documents from you',
    'appointment_scheduled': 'Embassy appointment scheduled',
    'biometrics_done': 'Biometrics done',
    'interview_scheduled': 'Interview scheduled',
    'approved': 'Approved',
    'visa_approved': 'Visa approved',
    'rejected': 'Not approved',
    'visa_rejected': 'Visa not approved',
    'cancelled': 'Cancelled',
}


def is_status_question(text: str) -> bool:
    return bool(_STATUS_Q.search(text or ''))


async def status_answer(user: Optional[dict]) -> str:
    """Plain-text answer listing the user's applications, newest first."""
    if not user:
        return ("Sign in and I can tell you exactly where your application stands. "
                "You can also check it on the Track Application page with your application reference.")
    apps = await applications.find({'user_id': user['_id']}).sort('updated_at', -1).to_list(5)
    if not apps:
        return "You don't have any applications yet. Pick a country on the visa pages and choose Apply to start one."
    lines = []
    for a in apps:
        cid = a.get('country_id') or ''
        c = await countries.find_one({'id': cid}, {'_id': 0, 'name': 1}) if cid else None
        name = (c or {}).get('name') or a.get('country_name') or cid.upper() or 'Visa'
        status = a.get('status') or 'draft'
        line = f"• **{name} {a.get('visa_type') or ''}** (#{str(a['_id'])[:8].upper()}): {_LABELS.get(status, status.replace('_', ' ').capitalize())}"
        last = (a.get('timeline') or [{}])[-1]
        if last.get('note'):
            line += f". Latest: {str(last['note'])[:160].rstrip('. ')}"
        appt = (a.get('visa_appointment') or {}).get('date')
        if appt:
            line += f". Appointment: {str(appt)[:10]}"
        lines.append(line)
    head = "Here is where your application stands:" if len(lines) == 1 else "Here is where your applications stand:"
    return head + "\n" + "\n".join(lines) + "\nOpen My Account → Applications for documents, messages and next steps."
