"""Eva tools — data lookup functions for the Eva AI assistant."""

from typing import Optional, List
from db import db


async def lookup_country(country_id: str) -> Optional[dict]:
    from data import get_country
    data = get_country(country_id)
    if data:
        return data
    doc = await db['countries_v2'].find_one({'id': country_id.lower()}, {'_id': 0})
    return doc


async def search_countries(query: str) -> List[dict]:
    import re
    cur = db['countries_v2'].find(
        {'$or': [
            {'name': {'$regex': re.escape(query), '$options': 'i'}},
            {'visa_types': {'$regex': re.escape(query), '$options': 'i'}},
        ]},
        {'_id': 0},
    ).limit(10)
    return [c async for c in cur]


async def lookup_university(university_id: str) -> Optional[dict]:
    doc = await db['universities_v2'].find_one({'id': university_id}, {'_id': 0})
    return doc


async def search_universities(country: Optional[str] = None, course: Optional[str] = None) -> List[dict]:
    query = {}
    if country:
        query['country'] = country.lower()
    if course:
        query['courses'] = course.lower()
    cur = db['universities_v2'].find(query, {'_id': 0}).limit(20)
    return [u async for u in cur]


async def get_visa_requirements(country_id: str, visa_type: Optional[str] = None) -> Optional[dict]:
    """Get visa requirements using the same comprehensive lookup as lookup_country."""
    data = await lookup_country(country_id)
    if not data:
        return None
    if visa_type and 'categories' in data:
        for cat in data['categories']:
            if cat.get('name', '').lower() == visa_type.lower():
                return {'country': data['name'], 'visa_type': visa_type, **cat}
    return data


async def get_application_fee(country_id: str) -> Optional[dict]:
    """Get application fee using the same comprehensive lookup as lookup_country."""
    data = await lookup_country(country_id)
    if not data:
        return None
    return {
        'country': data.get('name'),
        'fee_inr': data.get('application_fee'),
        'embassy_fee': data.get('embassy_fee'),
    }
