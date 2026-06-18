"""Eva tools — data lookup functions for the Eva AI assistant.

These are the tools Eva can call to answer visa/country questions
with real data instead of relying solely on her system prompt.
"""

from typing import Optional, List

from db import db


async def lookup_country(country_id: str) -> Optional[dict]:
    """Look up visa and country information by country ID (e.g. 'us', 'uk', 'ca')."""
    from data import get_country
    data = get_country(country_id)
    if data:
        return data
    doc = await db['countries_v2'].find_one({'id': country_id.lower()}, {'_id': 0})
    return doc


async def search_countries(query: str) -> List[dict]:
    """Search countries by name or visa type."""
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
    """Look up a university by ID."""
    doc = await db['universities_v2'].find_one({'id': university_id}, {'_id': 0})
    return doc


async def search_universities(country: Optional[str] = None, course: Optional[str] = None) -> List[dict]:
    """Search universities by country and/or course."""
    query = {}
    if country:
        query['country'] = country.lower()
    if course:
        query['courses'] = course.lower()
    cur = db['universities_v2'].find(query, {'_id': 0}).limit(20)
    return [u async for u in cur]


async def get_visa_requirements(country_id: str, visa_type: Optional[str] = None) -> Optional[dict]:
    """Get visa requirements for a country, optionally filtered by visa type."""
    from data import get_country
    data = get_country(country_id)
    if not data:
        return None
    if visa_type and 'categories' in data:
        for cat in data['categories']:
            if cat.get('name', '').lower() == visa_type.lower():
                return {'country': data['name'], 'visa_type': visa_type, **cat}
    return data


async def get_application_fee(country_id: str) -> Optional[dict]:
    """Get visa application fees for a country."""
    from data import get_country
    data = get_country(country_id)
    if not data:
        return None
    return {
        'country': data.get('name'),
        'fee_inr': data.get('application_fee'),
        'embassy_fee': data.get('embassy_fee'),
    }


TOOL_REGISTRY = {
    'lookup_country': lookup_country,
    'search_countries': search_countries,
    'lookup_university': lookup_university,
    'search_universities': search_universities,
    'get_visa_requirements': get_visa_requirements,
    'get_application_fee': get_application_fee,
}

TOOL_DEFINITIONS = [
    {
        'name': 'lookup_country',
        'description': 'Look up visa and country information by country code (e.g. us, uk, ca, au)',
        'parameters': {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'}
            },
            'required': ['country_id'],
        },
    },
    {
        'name': 'search_countries',
        'description': 'Search countries by name or visa type',
        'parameters': {
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': 'Search query for country name or visa type'}
            },
            'required': ['query'],
        },
    },
    {
        'name': 'lookup_university',
        'description': 'Look up a university by its ID',
        'parameters': {
            'type': 'object',
            'properties': {
                'university_id': {'type': 'string', 'description': 'University ID slug'}
            },
            'required': ['university_id'],
        },
    },
    {
        'name': 'search_universities',
        'description': 'Search universities by country and/or course',
        'parameters': {
            'type': 'object',
            'properties': {
                'country': {'type': 'string', 'description': 'Two-letter country code'},
                'course': {'type': 'string', 'description': 'Course category (e.g. stem, business, medicine)'},
            },
        },
    },
    {
        'name': 'get_visa_requirements',
        'description': 'Get visa requirements including documents, fees, and processing times for a country',
        'parameters': {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'},
                'visa_type': {'type': 'string', 'description': 'Optional visa type filter (e.g. tourist, student, business)'},
            },
            'required': ['country_id'],
        },
    },
    {
        'name': 'get_application_fee',
        'description': 'Get visa application fees for a country in INR',
        'parameters': {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'}
            },
            'required': ['country_id'],
        },
    },
]
