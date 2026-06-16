from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from db import universities_col

router = APIRouter(prefix='/universities', tags=['universities'])

CN_FIELD_MAP = {'录取率': 'acceptance_rate', '就业率': 'employment_rate'}


def _normalize(doc: dict) -> dict:
    doc.pop('_id', None)
    for cn_key, en_key in CN_FIELD_MAP.items():
        if cn_key in doc and en_key not in doc:
            doc[en_key] = doc.pop(cn_key)
        elif cn_key in doc:
            doc.pop(cn_key)
    if ' scholarships' in doc:
        doc['scholarships'] = doc.pop(' scholarships')
    if ' intakes' in doc:
        doc['intakes'] = doc.pop(' intakes')
    return doc


@router.get('')
async def list_universities(
    q: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    scholarships: Optional[bool] = Query(None),
    gre_required: Optional[bool] = Query(None),
    gmat_required: Optional[bool] = Query(None),
    tuition_min: Optional[int] = Query(None),
    tuition_max: Optional[int] = Query(None),
    ielts_min: Optional[float] = Query(None),
    sort_by: Optional[str] = Query(None, regex='^(rank|tuition_usd|students|avg_salary_usd|ielts_min|qs_rank)$'),
    sort_dir: Optional[int] = Query(1, ge=-1, le=1),
    limit: int = Query(50, ge=1, le=15000),
    skip: int = Query(0, ge=0),
) -> List[dict]:
    flt: dict = {}
    if scholarships is not None:
        flt['$or'] = [{'scholarships': scholarships}, {' scholarships': scholarships}]
    if gre_required is not None:
        flt['gre_required'] = gre_required
    if gmat_required is not None:
        flt['gmat_required'] = gmat_required
    if country:
        flt['country'] = {'$in': [c.strip() for c in country.lower().split(',') if c.strip()]}
    if course:
        flt['courses'] = {'$in': [c.strip() for c in course.lower().split(',') if c.strip()]}
    if tuition_min is not None or tuition_max is not None:
        t: dict = {}
        if tuition_min is not None:
            t['$gte'] = tuition_min
        if tuition_max is not None:
            t['$lte'] = tuition_max
        flt['tuition_usd'] = t
    if ielts_min is not None:
        flt['ielts_min'] = {'$lte': ielts_min}
    if q:
        flt['$text'] = {'$search': q}

    sort_field = sort_by or 'rank'
    cursor = universities_col.find(flt, {'_id': 0}).sort(sort_field, sort_dir).skip(skip).limit(limit)
    results = [_normalize(dict(doc)) async for doc in cursor]

    if q and not results:
        ql = q.lower()
        flt2 = {k: v for k, v in flt.items() if k != '$text'}
        cursor2 = universities_col.find(flt2, {'_id': 0}).sort(sort_field, sort_dir)
        results = [
            _normalize(dict(doc)) async for doc in cursor2
            if ql in (doc.get('name') or '').lower() or ql in (doc.get('short_name') or '').lower()
        ]
        results = results[skip: skip + limit]

    return results


@router.get('/count')
async def count_universities(
    country: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    scholarships: Optional[bool] = Query(None),
    tuition_min: Optional[int] = Query(None),
    tuition_max: Optional[int] = Query(None),
    ielts_min: Optional[float] = Query(None),
) -> dict:
    flt: dict = {}
    if scholarships is not None:
        flt['$or'] = [{'scholarships': scholarships}, {' scholarships': scholarships}]
    if country:
        flt['country'] = {'$in': [c.strip() for c in country.lower().split(',') if c.strip()]}
    if course:
        flt['courses'] = {'$in': [c.strip() for c in course.lower().split(',') if c.strip()]}
    if tuition_min is not None or tuition_max is not None:
        t: dict = {}
        if tuition_min is not None:
            t['$gte'] = tuition_min
        if tuition_max is not None:
            t['$lte'] = tuition_max
        flt['tuition_usd'] = t
    if ielts_min is not None:
        flt['ielts_min'] = {'$lte': ielts_min}
    total = await universities_col.count_documents(flt)
    return {'total': total}


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


@router.get('/{university_id}')
async def get_university(university_id: str):
    doc = await universities_col.find_one({'id': university_id}, {'_id': 0})
    if not doc:
        raise HTTPException(404, 'University not found')
    return _normalize(dict(doc))
