"""University seeder — populates the universities_v2 MongoDB collection.

Strategy:
  1. Start with the rich hardcoded set from data.py (1 000+ universities).
  2. Pull additional universities from the HiPolabs open API for extended
     study destinations not already covered.
  3. Deduplicate by (name, country).
  4. Upsert each document so the operation is idempotent.
"""
from __future__ import annotations

import asyncio
import re
import uuid
from typing import Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# Resolve env before importing db
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

from db import universities_col  # noqa: E402
from data import UNIVERSITIES as _STATIC  # noqa: E402

# ---------------------------------------------------------------------------
# Extra countries to pull from HiPolabs that are NOT in the static dataset
# ---------------------------------------------------------------------------
EXTRA_COUNTRIES = [
    # (alpha_two_code, country_name, flag, default tuition USD, QS top-5 universities)
    ('CA', 'Canada',      '🇨🇦', 28000, [
        {'name': 'University of Toronto',            'short_name': 'UofT',     'rank': 21,  'tuition_usd': 45700},
        {'name': 'University of British Columbia',   'short_name': 'UBC',      'rank': 46,  'tuition_usd': 42000},
        {'name': 'McGill University',                'short_name': 'McGill',   'rank': 30,  'tuition_usd': 38000},
        {'name': 'University of Alberta',            'short_name': 'UAlberta', 'rank': 111, 'tuition_usd': 29000},
        {'name': 'McMaster University',              'short_name': 'McMaster', 'rank': 152, 'tuition_usd': 30000},
    ]),
    ('AU', 'Australia',   '🇦🇺', 35000, [
        {'name': 'Australian National University',   'short_name': 'ANU',   'rank': 30,  'tuition_usd': 41000},
        {'name': 'University of Melbourne',          'short_name': 'UMelb', 'rank': 33,  'tuition_usd': 38000},
        {'name': 'University of Sydney',             'short_name': 'USYD',  'rank': 41,  'tuition_usd': 40000},
        {'name': 'University of Queensland',         'short_name': 'UQ',    'rank': 47,  'tuition_usd': 36000},
        {'name': 'Monash University',                'short_name': 'Monash','rank': 57,  'tuition_usd': 35000},
    ]),
    ('FR', 'France',      '🇫🇷', 5000, [
        {'name': 'Université PSL',                   'short_name': 'PSL',   'rank': 26,  'tuition_usd': 4000},
        {'name': 'École Polytechnique',              'short_name': 'X',     'rank': 65,  'tuition_usd': 16000},
        {'name': 'Sorbonne University',              'short_name': 'Sorbonne','rank': 83, 'tuition_usd': 3000},
        {'name': 'Sciences Po',                      'short_name': 'SciPo', 'rank': 243, 'tuition_usd': 14000},
        {'name': 'HEC Paris',                        'short_name': 'HEC',   'rank': 120, 'tuition_usd': 45000},
    ]),
    ('NL', 'Netherlands', '🇳🇱', 18000, [
        {'name': 'Delft University of Technology',   'short_name': 'TU Delft',    'rank': 57,  'tuition_usd': 20000},
        {'name': 'University of Amsterdam',          'short_name': 'UvA',          'rank': 53,  'tuition_usd': 16000},
        {'name': 'Wageningen University',            'short_name': 'WUR',          'rank': 91,  'tuition_usd': 18000},
        {'name': 'Utrecht University',               'short_name': 'UU',           'rank': 106, 'tuition_usd': 17000},
        {'name': 'Leiden University',                'short_name': 'Leiden',       'rank': 122, 'tuition_usd': 16000},
    ]),
    ('IE', 'Ireland',     '🇮🇪', 20000, [
        {'name': 'Trinity College Dublin',           'short_name': 'TCD',   'rank': 81,  'tuition_usd': 25000},
        {'name': 'University College Dublin',        'short_name': 'UCD',   'rank': 181, 'tuition_usd': 22000},
        {'name': 'University College Cork',          'short_name': 'UCC',   'rank': 303, 'tuition_usd': 18000},
        {'name': 'National University of Ireland, Galway', 'short_name': 'NUI Galway', 'rank': 396, 'tuition_usd': 18000},
    ]),
    ('SE', 'Sweden',      '🇸🇪', 15000, [
        {'name': 'Lund University',                  'short_name': 'Lund',  'rank': 78,  'tuition_usd': 16000},
        {'name': 'KTH Royal Institute of Technology','short_name': 'KTH',   'rank': 89,  'tuition_usd': 16000},
        {'name': 'Uppsala University',               'short_name': 'Uppsala','rank': 113, 'tuition_usd': 14000},
        {'name': 'Stockholm University',             'short_name': 'SU',    'rank': 188, 'tuition_usd': 12000},
    ]),
    ('SG', 'Singapore',   '🇸🇬', 40000, [
        {'name': 'National University of Singapore', 'short_name': 'NUS',   'rank': 8,   'tuition_usd': 38000},
        {'name': 'Nanyang Technological University', 'short_name': 'NTU',   'rank': 26,  'tuition_usd': 36000},
        {'name': 'Singapore Management University', 'short_name': 'SMU',   'rank': 521, 'tuition_usd': 28000},
    ]),
    ('CH', 'Switzerland', '🇨🇭', 2000, [
        {'name': 'ETH Zurich',                       'short_name': 'ETH',   'rank': 7,   'tuition_usd': 2000},
        {'name': 'EPFL',                             'short_name': 'EPFL',  'rank': 14,  'tuition_usd': 2000},
        {'name': 'University of Zurich',             'short_name': 'UZH',   'rank': 83,  'tuition_usd': 2000},
        {'name': 'University of Bern',               'short_name': 'UniBE', 'rank': 144, 'tuition_usd': 1500},
    ]),
    ('NZ', 'New Zealand', '🇳🇿', 28000, [
        {'name': 'University of Auckland',           'short_name': 'UoA',   'rank': 68,  'tuition_usd': 32000},
        {'name': 'Victoria University of Wellington','short_name': 'VUW',   'rank': 236, 'tuition_usd': 26000},
        {'name': 'University of Otago',              'short_name': 'Otago', 'rank': 206, 'tuition_usd': 27000},
    ]),
    ('JP', 'Japan',       '🇯🇵', 12000, [
        {'name': 'University of Tokyo',              'short_name': 'UTokyo','rank': 28,  'tuition_usd': 6000},
        {'name': 'Kyoto University',                 'short_name': 'KyotoU','rank': 46,  'tuition_usd': 6000},
        {'name': 'Osaka University',                 'short_name': 'OsakaU','rank': 80,  'tuition_usd': 6000},
        {'name': 'Tokyo Institute of Technology',    'short_name': 'Tokyo Tech','rank': 91, 'tuition_usd': 6000},
    ]),
    ('KR', 'South Korea', '🇰🇷', 10000, [
        {'name': 'Seoul National University',        'short_name': 'SNU',   'rank': 41,  'tuition_usd': 7000},
        {'name': 'Korea Advanced Institute of Science and Technology', 'short_name': 'KAIST', 'rank': 42, 'tuition_usd': 8000},
        {'name': 'Yonsei University',                'short_name': 'Yonsei','rank': 76,  'tuition_usd': 16000},
        {'name': 'Korea University',                 'short_name': 'KU',    'rank': 74,  'tuition_usd': 14000},
    ]),
]

_TOP_MAP: dict[str, dict] = {}
for _cc, _cn, _fl, _dt, _tops in EXTRA_COUNTRIES:
    for _t in _tops:
        _TOP_MAP[(_cc.lower(), _normalize := _t['name'].lower())] = _t


def _slug(name: str, country: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', f"{country}-{name}".lower()).strip('-')


def _enrich_hipolabs(raw: dict, country_code: str, country_name: str, flag: str,
                     default_tuition: int, top_override: Optional[dict] = None) -> dict:
    name = raw['name']
    short_name = (raw.get('short_name') or name.split()[-1])[:20]
    rank = (top_override or {}).get('rank', 999)
    tuition = (top_override or {}).get('tuition_usd', default_tuition)
    loc = raw.get('state-province') or country_name
    web = (raw.get('web_pages') or [''])[0]
    return {
        'id': _slug(name, country_code),
        'name': name,
        'short_name': short_name,
        'country': country_code.lower(),
        'country_name': country_name,
        'flag': flag,
        'rank': rank,
        'qs_rank': rank,
        'times_rank': rank,
        'type': 'Public',
        'established': 1900,
        'students': 15000,
        'intl_students': 2000,
        'tuition_usd': tuition,
        'living_cost_usd': 15000,
        'scholarships': rank <= 200,
        'courses': ['stem', 'engineering', 'business', 'arts', 'social'],
        'popular_courses': ['Computer Science', 'Engineering', 'Business Administration', 'Arts', 'Social Sciences'],
        'intakes': ['Sep', 'Jan'],
        'gre_required': False,
        'gmat_required': False,
        'ielts_min': 6.5,
        'toefl_min': 90,
        'acceptance_rate': '50%',
        'employment_rate': '85%',
        'avg_salary_usd': 55000,
        'description': f'A leading university in {country_name} offering world-class education.',
        'location': loc,
        'website': web,
        'accreditation': [],
        'facilities': ['Library', 'Sports Complex', 'Research Labs'],
        '_source': 'hipolabs',
    }


async def fetch_hipolabs(country_code: str, timeout: float = 15.0) -> list[dict]:
    url = f'http://universities.hipolabs.com/search?country={country_code}'
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


async def seed() -> dict:
    # --- 1. Upsert static data -----------------------------------------------
    static_count = 0
    for u in _STATIC:
        doc = {**u, '_source': 'static'}
        await universities_col.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
        static_count += 1

    # --- 2. Pull new countries from HiPolabs ---------------------------------
    api_count = 0
    for country_code, country_name, flag, default_tuition, top_list in EXTRA_COUNTRIES:
        cc_lower = country_code.lower()
        # Skip if already seeded (static data covers this country)
        existing = await universities_col.count_documents({'country': cc_lower})
        if existing >= len(top_list):
            # Country already has at least as many docs as top_list — skip API call
            # but still ensure top-ranked ones are present
            pass

        try:
            raw_list = await fetch_hipolabs(country_code)
        except Exception:
            raw_list = []

        top_names = {t['name'].lower(): t for t in top_list}

        for raw in raw_list:
            name_lower = raw['name'].lower()
            top_override = top_names.get(name_lower)
            doc = _enrich_hipolabs(raw, cc_lower, country_name, flag, default_tuition, top_override)
            await universities_col.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            api_count += 1

        # Ensure top-ranked entries exist even if HiPolabs didn't return them
        for top in top_list:
            doc_id = _slug(top['name'], cc_lower)
            existing_top = await universities_col.find_one({'id': doc_id})
            if not existing_top:
                enriched = _enrich_hipolabs(
                    {'name': top['name'], 'state-province': None, 'web_pages': []},
                    cc_lower, country_name, flag, default_tuition, top,
                )
                enriched['short_name'] = top.get('short_name', enriched['short_name'])
                await universities_col.update_one({'id': doc_id}, {'$set': enriched}, upsert=True)
                api_count += 1

    total = await universities_col.count_documents({})
    return {'static': static_count, 'api': api_count, 'total': total}


if __name__ == '__main__':
    async def main():
        result = await seed()
        print(result)
    asyncio.run(main())
