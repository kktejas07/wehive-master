from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from data import UNIVERSITIES

router = APIRouter(prefix='/universities', tags=['universities'])


def _normalize_uni(u: dict) -> dict:
    """Return a copy with normalized keys so consumers never see leading-space typos."""
    out = dict(u)
    # Fix leading-space typo present in a few seed entries
    if ' scholarships' in out:
        out['scholarships'] = out.pop(' scholarships')
    if ' intakes' in out:
        out['intakes'] = out.pop(' intakes')
    # Ensure optional fields at least exist as None / N/A so templates don't crash
    if '就业率' not in out:
        out['就业率'] = None
    if 'avg_salary_usd' not in out:
        out['avg_salary_usd'] = None
    if '录取率' not in out:
        out['录取率'] = None
    return out


@router.get('')
async def list_universities(
    q: Optional[str] = Query(None, description='Search by university name'),
    country: Optional[str] = Query(None, description='Filter by country code (us, uk, de, etc.)'),
    course: Optional[str] = Query(None, description='Filter by course category'),
    limit: Optional[int] = Query(None, ge=1, le=100),
) -> List[dict]:
    items = UNIVERSITIES
    if q:
        ql = q.lower().strip()
        items = [u for u in items if ql in (u.get('name') or '').lower() or ql in (u.get('short_name') or '').lower()]
    if country:
        items = [u for u in items if u.get('country') == country.lower()]
    if course:
        items = [u for u in items if course.lower() in [c.lower() for c in u.get('courses', [])]]
    if limit:
        items = items[:limit]
    return [_normalize_uni(u) for u in items]


@router.get('/{university_id}')
async def get_university(university_id: str):
    uni = next((u for u in UNIVERSITIES if u['id'] == university_id), None)
    if not uni:
        raise HTTPException(404, 'University not found')
    return _normalize_uni(uni)


@router.get('/countries/list')
async def list_countries():
    countries = []
    seen = set()
    for u in UNIVERSITIES:
        if u['country'] not in seen:
            seen.add(u['country'])
            countries.append({
                'id': u['country'],
                'name': u['country_name'],
                'flag': u['flag'],
            })
    return sorted(countries, key=lambda x: x['name'])


@router.get('/courses/list')
async def list_courses():
    courses = []
    seen = set()
    for u in UNIVERSITIES:
        for c in u.get('courses', []):
            if c not in seen:
                seen.add(c)
                courses.append(c)
    return sorted(courses)