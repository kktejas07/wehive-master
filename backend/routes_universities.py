from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from db import universities_col

router = APIRouter(prefix='/universities', tags=['universities'])


<<<<<<< Updated upstream
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
=======
def _serialize(doc: dict) -> dict:
    doc.pop('_id', None)
    return doc
>>>>>>> Stashed changes


@router.get('')
async def list_universities(
    q: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
) -> List[dict]:
    flt: dict = {}
    if country:
        flt['country'] = country.lower()
    if course:
<<<<<<< Updated upstream
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
=======
        flt['courses'] = course.lower()
    if q:
        flt['$text'] = {'$search': q}

    sort_field = 'rank'
    cursor = universities_col.find(flt, {'_id': 0}).sort(sort_field, 1).skip(skip).limit(limit)
    results = [doc async for doc in cursor]

    # Fallback: text index may not exist yet — do in-memory filter
    if q and not results:
        ql = q.lower()
        flt2 = {k: v for k, v in flt.items() if k != '$text'}
        cursor2 = universities_col.find(flt2, {'_id': 0}).sort('rank', 1)
        results = [
            doc async for doc in cursor2
            if ql in (doc.get('name') or '').lower() or ql in (doc.get('short_name') or '').lower()
        ]
        results = results[skip: skip + limit]

    return results


@router.get('/count')
async def count_universities(
    country: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
) -> dict:
    flt: dict = {}
    if country:
        flt['country'] = country.lower()
    if course:
        flt['courses'] = course.lower()
    total = await universities_col.count_documents(flt)
    return {'total': total}
>>>>>>> Stashed changes


@router.get('/countries/list')
async def list_countries():
    pipeline = [
        {'$group': {'_id': '$country', 'country_name': {'$first': '$country_name'}, 'flag': {'$first': '$flag'}}},
        {'$sort': {'country_name': 1}},
    ]
    results = []
    async for doc in universities_col.aggregate(pipeline):
        results.append({'id': doc['_id'], 'name': doc['country_name'], 'flag': doc['flag']})
    return results


@router.get('/courses/list')
async def list_courses():
    pipeline = [
        {'$unwind': '$courses'},
        {'$group': {'_id': '$courses'}},
        {'$sort': {'_id': 1}},
    ]
    return [doc['_id'] async for doc in universities_col.aggregate(pipeline)]


@router.get('/stats')
async def university_stats():
    total = await universities_col.count_documents({})
    countries = await universities_col.distinct('country')
    return {'total': total, 'countries': len(countries)}


@router.get('/{university_id}')
async def get_university(university_id: str):
    doc = await universities_col.find_one({'id': university_id}, {'_id': 0})
    if not doc:
        raise HTTPException(404, 'University not found')
    return doc
