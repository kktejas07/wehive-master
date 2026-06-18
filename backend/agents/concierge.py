"""Application Concierge Agent — walks user through the full visa application process.

Steps:
1. Parse intent (country + visa type)
2. Check requirements + fees
3. Scan passport (auto-fill)
4. Document checklist
5. Generate cover letter
6. Book appointment
7. Risk check
8. Submit
"""

from datetime import datetime
from typing import List, Optional
from enum import Enum

from data import get_country
from eva_tools import lookup_country, get_visa_requirements, get_application_fee


class StepStatus(str, Enum):
    PENDING = 'pending'
    COMPLETED = 'completed'
    SKIPPED = 'skipped'
    BLOCKED = 'blocked'


class ConciergeSession:
    """Tracks a single concierge workflow session."""

    def __init__(self, user_id: str, country_id: str, visa_type: str):
        self.user_id = user_id
        self.country_id = country_id
        self.visa_type = visa_type
        self.steps = {
            'parse_intent': {'status': StepStatus.PENDING, 'label': 'Analyse your request'},
            'requirements': {'status': StepStatus.PENDING, 'label': 'Check visa requirements'},
            'passport_scan': {'status': StepStatus.PENDING, 'label': 'Scan your passport'},
            'documents': {'status': StepStatus.PENDING, 'label': 'Upload required documents'},
            'cover_letter': {'status': StepStatus.PENDING, 'label': 'Generate cover letter'},
            'appointment': {'status': StepStatus.PENDING, 'label': 'Book embassy appointment'},
            'risk_check': {'status': StepStatus.PENDING, 'label': 'Risk assessment'},
            'submit': {'status': StepStatus.PENDING, 'label': 'Submit application'},
        }
        self.created_at = datetime.utcnow()
        self.application_id = None

    def get_next_step(self) -> Optional[str]:
        for step, info in self.steps.items():
            if info['status'] == StepStatus.PENDING:
                return step
        return None

    def complete_step(self, step: str, data: dict = None):
        if step in self.steps:
            self.steps[step]['status'] = StepStatus.COMPLETED
            if data:
                self.steps[step]['data'] = data

    def progress(self) -> str:
        total = len(self.steps)
        done = sum(1 for s in self.steps.values() if s['status'] == StepStatus.COMPLETED)
        return f'{done}/{total}'


# In-memory sessions (replace with DB for production)
_active_sessions: dict = {}


async def start_concierge(user_id: str, country_id: str, visa_type: str) -> dict:
    """Start a new concierge workflow."""
    session = ConciergeSession(user_id, country_id, visa_type)
    session.complete_step('parse_intent', {'country': country_id, 'visa_type': visa_type})

    # Auto-fetch requirements
    country_data = await lookup_country(country_id)
    reqs = await get_visa_requirements(country_id, visa_type)
    fees = await get_application_fee(country_id)

    session.complete_step('requirements', {
        'country': (country_data or {}).get('name', country_id),
        'visa_type': visa_type,
        'requirements': reqs,
        'fees': fees,
    })

    _active_sessions[f'{user_id}:{country_id}'] = session

    return {
        'session_id': f'{user_id}:{country_id}',
        'country': (country_data or {}).get('name', country_id),
        'visa_type': visa_type,
        'next_step': 'passport_scan',
        'steps': {k: {'label': v['label'], 'status': v['status'].value} for k, v in session.steps.items()},
        'requirements': reqs,
        'fees': fees,
    }


def get_session(user_id: str, country_id: str) -> Optional[ConciergeSession]:
    return _active_sessions.get(f'{user_id}:{country_id}')


async def advance_concierge(user_id: str, country_id: str, step: str, data: dict = None) -> dict:
    """Advance the concierge workflow to the next step."""
    session = get_session(user_id, country_id)
    if not session:
        return {'error': 'No active session. Start with /agent/concierge/start'}
    session.complete_step(step, data)
    next_step = session.get_next_step()
    return {
        'session_id': f'{user_id}:{country_id}',
        'completed_step': step,
        'next_step': next_step,
        'progress': session.progress(),
        'steps': {k: {'label': v['label'], 'status': v['status'].value} for k, v in session.steps.items()},
        'done': next_step is None,
    }
