"""SOP Template Library — browse, search, filter and AI-personalise 1000+ templates."""

from __future__ import annotations

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ai_marketplace import marketplace
from auth_utils import get_current_user
from rate_limit import RateLimit

logger = logging.getLogger('wehive.sop-templates')
router = APIRouter(prefix='/sop-templates', tags=['sop-templates'])

_personalise_limiter = RateLimit(max_calls=10, window_seconds=600)


def _load_templates():
    from sop_data.sop_templates import SOP_TEMPLATES, COUNTRIES_WITH_TEMPLATES, PROGRAM_TYPES
    return SOP_TEMPLATES, COUNTRIES_WITH_TEMPLATES, PROGRAM_TYPES


# ---------- List / Search ----------
@router.get('')
async def list_templates(
    country: Optional[str] = Query(None, description='Country code (us, gb, ca, au, de…)'),
    program_type: Optional[str] = Query(None, description='Program type (ms, mba, phd…)'),
    visa_type: Optional[str] = Query(None, description='Visa type (student, work_study…)'),
    tone: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description='Free-text search in title and tags'),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    from sop_data.sop_templates import get_templates
    result = get_templates(
        country=country,
        program_type=program_type,
        visa_type=visa_type,
        search=search,
        page=page,
        limit=limit,
    )
    # Also filter by tone if provided
    if tone:
        result['items'] = [t for t in result['items'] if t.get('tone') == tone]
        result['total'] = len(result['items'])

    # Return lightweight list (no full sample text)
    items = []
    for t in result['items']:
        items.append({
            'id': t['id'],
            'title': t['title'],
            'country': t['country'],
            'country_name': t['country_name'],
            'program_type': t['program_type'],
            'visa_type': t['visa_type'],
            'tone': t['tone'],
            'word_count': t['word_count'],
            'tags': t['tags'],
            'sample_opening': t.get('sample_opening', '')[:200],
        })
    return {
        'items': items,
        'total': result['total'],
        'page': page,
        'limit': limit,
        'pages': (result['total'] + limit - 1) // limit,
    }


# ---------- Filters metadata ----------
@router.get('/filters')
async def template_filters():
    _, countries, programs = _load_templates()
    COUNTRY_NAMES = {
        'us': 'United States', 'gb': 'United Kingdom', 'ca': 'Canada', 'au': 'Australia',
        'de': 'Germany', 'fr': 'France', 'ie': 'Ireland', 'nz': 'New Zealand',
        'nl': 'Netherlands', 'sg': 'Singapore', 'jp': 'Japan', 'kr': 'South Korea',
        'it': 'Italy', 'es': 'Spain', 'se': 'Sweden', 'ch': 'Switzerland',
        'at': 'Austria', 'dk': 'Denmark', 'fi': 'Finland', 'no': 'Norway',
        'be': 'Belgium', 'pt': 'Portugal', 'cz': 'Czech Republic', 'pl': 'Poland',
        'in': 'India', 'cn': 'China', 'hk': 'Hong Kong', 'ae': 'UAE',
        'my': 'Malaysia', 'ph': 'Philippines',
    }
    return {
        'countries': [{'code': c, 'name': COUNTRY_NAMES.get(c, c.upper())} for c in sorted(countries)],
        'program_types': sorted(programs),
        'visa_types': ['student', 'work_study', 'exchange', 'research'],
        'tones': ['professional', 'academic', 'personal', 'compelling', 'technical', 'creative'],
    }


# ---------- Detail ----------
@router.get('/{template_id}')
async def template_detail(template_id: str):
    from sop_data.sop_templates import get_template
    t = get_template(template_id)
    if not t:
        raise HTTPException(404, 'Template not found')
    return t


# ---------- AI Personalise ----------
class PersonaliseRequest(BaseModel):
    template_id: str
    applicant_name: str = ''
    background: str = ''
    achievements: str = ''
    goals: str = ''
    program: str = ''
    university_name: str = ''
    extra_context: str = ''


@router.post('/personalise', dependencies=[Depends(_personalise_limiter)])
async def personalise_template(req: PersonaliseRequest, user=Depends(get_current_user)):
    from sop_data.sop_templates import get_template
    t = get_template(req.template_id)
    if not t:
        raise HTTPException(404, 'Template not found')

    sections_guide = '\n'.join(
        f"- {s['heading']}: {s['hint']} (target ~{s['target_words']} words)"
        for s in t['sections']
    )

    prompt = f"""You are an expert SOP writer for international university applications.

Using this template structure as your guide, write a complete, personalised Statement of Purpose.

TEMPLATE: {t['title']}
TARGET COUNTRY: {t['country_name']}
PROGRAM TYPE: {t['program_type']}
TONE: {t['tone']}
TARGET LENGTH: {t['word_count']} words

SECTIONS TO INCLUDE:
{sections_guide}

APPLICANT DETAILS:
- Name: {req.applicant_name or '[Applicant]'}
- University: {req.university_name or '[Target University]'}
- Program: {req.program or t['program_type']}
- Academic background: {req.background or 'Not provided — use generic but compelling language'}
- Achievements: {req.achievements or 'Not provided'}
- Career goals: {req.goals or 'Not provided'}
- Additional context: {req.extra_context or 'None'}

SAMPLE OPENING FOR REFERENCE (adapt, don't copy):
{t.get('sample_opening', '')}

WRITING TIPS FOR THIS TYPE:
{chr(10).join(f"- {tip}" for tip in t.get('tips', []))}

Write the complete SOP now. Be genuine, specific, and compelling. Use placeholder brackets [DETAIL] where the applicant hasn't provided specific info.
Do NOT use markdown formatting — write in plain paragraphs with section headings on their own lines.
"""

    session_id = f'sop-personalise-{uuid.uuid4()}'
    try:
        content = await marketplace.chat(
            user_id=user['_id'],
            system_prompt='You are a professional academic writing consultant who specialises in university application documents. Write compelling, authentic SOPs that help students stand out.',
            user_prompt=prompt,
            max_tokens=3000,
        )
    except Exception as e:
        logger.error('SOP personalisation failed: %s', e)
        raise HTTPException(502, 'Could not generate SOP. Please try again.')

    return {
        'template_id': t['id'],
        'template_title': t['title'],
        'content': content,
        'word_count': len(content.split()) if content else 0,
        'sections': t['sections'],
        'tips': t['tips'],
    }


# ---------- Stats ----------
@router.get('/stats/overview')
async def template_stats():
    templates, countries, programs = _load_templates()
    by_country = {}
    by_program = {}
    for t in templates:
        by_country[t['country']] = by_country.get(t['country'], 0) + 1
        by_program[t['program_type']] = by_program.get(t['program_type'], 0) + 1
    return {
        'total_templates': len(templates),
        'countries': len(countries),
        'program_types': len(programs),
        'by_country': dict(sorted(by_country.items(), key=lambda x: -x[1])),
        'by_program': dict(sorted(by_program.items(), key=lambda x: -x[1])),
    }
