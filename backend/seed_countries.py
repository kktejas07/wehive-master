"""One-off country seeder.

Fetches the full country list from restcountries.com (v3.1/all) and writes a
normalised document per country into MongoDB `countries_v2` collection.

It preserves rich visa metadata we already wrote by hand for 15 countries (from
`data.COUNTRIES`) and synthesises reasonable defaults for the rest based on
visa-free arrangements for Indian passport holders.

Run locally:
    python -m seed_countries              # uses cached JSON on disk
    python -m seed_countries --refresh    # force re-fetch from API
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import httpx
from pymongo import UpdateOne

# Ensure we load env before importing db
from dotenv import load_dotenv
ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

from db import db                       # noqa: E402
from data import COUNTRIES, _vc, DOCS_BASIC, DOCS_TOURIST, DOCS_BUSINESS, DOCS_STUDENT, DOCS_WORK  # noqa: E402

# Countries (ISO-2) where Indians must attend a VFS / consulate appointment.
APPOINTMENT_REQUIRED = {
    'US', 'GB', 'CA', 'AU', 'NZ', 'JP', 'CN', 'KR', 'CH',
    # Schengen members (all need biometrics in person)
    'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
    'SK', 'SI', 'ES', 'SE',
}

# Country-specific appointment fee in INR (VFS / biometrics service fee).
APPOINTMENT_FEE_INR = {
    'US': 1750, 'GB': 2400, 'CA': 1900, 'AU': 1700, 'NZ': 1700,
    'JP': 1200, 'CN': 1500, 'KR': 1200, 'CH': 1900,
}
# Schengen default
for _iso in {
    'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
    'SK', 'SI', 'ES', 'SE',
}:
    APPOINTMENT_FEE_INR.setdefault(_iso, 1900)


REST_API = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,flag,flags,region,subregion,capital,currencies,languages'
CACHE_PATH = ROOT / '.countries_cache.json'

# Indian passport holders — visa-free / visa-on-arrival lists (simplified snapshot).
VISA_FREE_FOR_INDIANS = {
    'NP', 'BT', 'MV', 'MU', 'FJ', 'GD', 'HT', 'JM', 'MO', 'MS', 'KN', 'VC',
    'TT', 'DO', 'BB', 'BS', 'SR', 'ID', 'TH', 'MY', 'VU', 'WS', 'SN', 'RW',
    'BW', 'KE', 'TZ', 'UG', 'ZW', 'ET', 'MZ', 'CV', 'GN', 'SL', 'MG', 'SC',
    'DJ', 'BF', 'GM', 'KM', 'GW', 'BI', 'TG', 'TL', 'KH', 'LA', 'MM', 'IR',
    'JO', 'LB', 'QA', 'PW', 'MH', 'FM', 'TV', 'CK', 'NU', 'PK', 'MN', 'UZ',
    'KG', 'TJ', 'KZ',
}

# Countries where Indians need a visa but it's an easy eVisa
EVISA_FOR_INDIANS = {
    'AU', 'NZ', 'SG', 'AE', 'BH', 'OM', 'KW', 'SA', 'EG', 'ZM', 'CI', 'GA',
    'TR', 'AZ', 'AM', 'GE', 'LK', 'VN', 'RU', 'UA', 'BY', 'MD', 'ST', 'BJ',
    'CM', 'CD', 'LS', 'NA', 'ZW', 'MW', 'NG',
}

# Schengen-area countries — all use the Schengen Short-Stay visa
SCHENGEN = {
    'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
    'SK', 'SI', 'ES', 'SE', 'CH',
}

# ISO-2 -> hand-written entry from data.COUNTRIES (case-insensitive)
MANUAL_BY_ISO2: Dict[str, Dict[str, Any]] = {}
ID_ISO2_MAP = {
    'us': 'US', 'uk': 'GB', 'jp': 'JP', 'fr': 'FR', 'sg': 'SG', 'ae': 'AE',
    'au': 'AU', 'ca': 'CA', 'it': 'IT', 'ch': 'CH', 'th': 'TH', 'de': 'DE',
    'np': 'NP', 'bt': 'BT',
}
for c in COUNTRIES:
    iso = ID_ISO2_MAP.get(c['id'])
    if iso:
        MANUAL_BY_ISO2[iso] = c


def _fetch_live() -> List[Dict[str, Any]]:
    print('[seed] Fetching live data from restcountries.com …')
    with httpx.Client(timeout=40) as cli:
        r = cli.get(REST_API)
        r.raise_for_status()
        data = r.json()
    CACHE_PATH.write_text(json.dumps(data))
    return data


def _fetch_cached() -> List[Dict[str, Any]]:
    if CACHE_PATH.exists():
        print(f'[seed] Using cached data at {CACHE_PATH}')
        return json.loads(CACHE_PATH.read_text())
    return _fetch_live()


def _synth_categories(iso2: str, region: str) -> Dict[str, Dict[str, Any]]:
    """Synthesize default visa categories for Indian passport holders."""
    if iso2 in VISA_FREE_FOR_INDIANS:
        return {
            'Tourist': _vc(
                name='Visa-Free Entry', fees_inr=0, fees_usd=0, processing_days=0,
                validity='30–90 DAYS', documents=['Passport (6mo validity)'], multi_entry=False,
            ),
        }
    if iso2 in SCHENGEN:
        return {
            'Tourist':  _vc(name='Schengen Short-Stay', fees_inr=7900, fees_usd=95,  processing_days=12, validity='90 DAYS', documents=DOCS_TOURIST),
            'Business': _vc(name='Schengen Business',   fees_inr=7900, fees_usd=95,  processing_days=12, validity='90 DAYS', documents=DOCS_BUSINESS),
            'Student':  _vc(name='National Student',    fees_inr=8700, fees_usd=105, processing_days=30, validity='Course duration', documents=DOCS_STUDENT),
        }
    if iso2 in EVISA_FOR_INDIANS:
        return {
            'Tourist':  _vc(name='eVisa Tourist',  fees_inr=3700, fees_usd=45,  processing_days=7,  validity='60 DAYS', documents=DOCS_BASIC),
            'Business': _vc(name='Business eVisa', fees_inr=4200, fees_usd=50,  processing_days=7,  validity='90 DAYS', documents=DOCS_BUSINESS),
        }
    # Default sticker visa profile
    return {
        'Tourist':  _vc(name='Tourist Visa',  fees_inr=8500,  fees_usd=100, processing_days=15, validity='90 DAYS', documents=DOCS_TOURIST),
        'Business': _vc(name='Business Visa', fees_inr=8500,  fees_usd=100, processing_days=15, validity='90 DAYS', documents=DOCS_BUSINESS),
        'Student':  _vc(name='Student Visa',  fees_inr=12500, fees_usd=150, processing_days=30, validity='Course duration', documents=DOCS_STUDENT),
        'Work':     _vc(name='Work Permit',   fees_inr=25000, fees_usd=300, processing_days=60, validity='Up to 3 years', documents=DOCS_WORK),
    }


def _normalize(rec: Dict[str, Any]) -> Dict[str, Any] | None:
    name_obj = rec.get('name') or {}
    common = name_obj.get('common')
    official = name_obj.get('official') or common
    iso2 = (rec.get('cca2') or '').upper()
    iso3 = (rec.get('cca3') or '').upper()
    if not common or not iso2:
        return None

    # Reuse hand-written entry verbatim when available
    manual = MANUAL_BY_ISO2.get(iso2)
    if manual:
        doc = dict(manual)
        doc['iso2'] = iso2
        doc['iso3'] = iso3
        doc['official_name'] = official
        doc['region'] = rec.get('region')
        doc['subregion'] = rec.get('subregion')
        doc['capital'] = (rec.get('capital') or [None])[0]
        doc['flag_url'] = (rec.get('flags') or {}).get('svg') or (rec.get('flags') or {}).get('png')
        doc['currencies'] = list((rec.get('currencies') or {}).keys())
        doc['languages'] = list((rec.get('languages') or {}).values())
        doc['requires_appointment'] = iso2 in APPOINTMENT_REQUIRED
        doc['appointment_fee_inr'] = APPOINTMENT_FEE_INR.get(iso2, 0) if iso2 in APPOINTMENT_REQUIRED else 0
        doc['source'] = 'manual+rest'
        return doc

    region = rec.get('region') or 'Other'
    cats = _synth_categories(iso2, region)
    tourist = cats.get('Tourist')
    visa_required = iso2 not in VISA_FREE_FOR_INDIANS

    same_day = iso2 in {'AE', 'SG', 'TH', 'LK'}
    if iso2 in VISA_FREE_FOR_INDIANS:
        standard_days, rush_days = 0, 0
    elif iso2 in EVISA_FOR_INDIANS:
        standard_days, rush_days = 5, 2
    elif iso2 in SCHENGEN:
        standard_days, rush_days = 12, 5
    else:
        standard_days, rush_days = 15, 7

    slug = iso2.lower()
    doc = {
        'id': slug,
        'iso2': iso2,
        'iso3': iso3,
        'name': common,
        'official_name': official,
        'flag': rec.get('flag') or '',
        'flag_url': (rec.get('flags') or {}).get('svg') or (rec.get('flags') or {}).get('png'),
        'region': region,
        'subregion': rec.get('subregion'),
        'capital': (rec.get('capital') or [None])[0],
        'currencies': list((rec.get('currencies') or {}).keys()),
        'languages': list((rec.get('languages') or {}).values()),
        'visa_required': visa_required,
        'no_visa': not visa_required,
        'visa_types': list(cats.keys()),
        'categories': cats,
        'fees_usd': tourist['fees_usd'] if tourist else 0,
        'validity': tourist['validity'] if tourist else 'N/A',
        'delivery': {
            'standard_days': standard_days,
            'rush_days': rush_days,
            'same_day': same_day,
        },
        'holiday_default_days': 7,
        'highlights': [],
        'requires_appointment': iso2 in APPOINTMENT_REQUIRED,
        'appointment_fee_inr': APPOINTMENT_FEE_INR.get(iso2, 0) if iso2 in APPOINTMENT_REQUIRED else 0,
        'source': 'rest',
    }
    return doc


async def seed(refresh: bool = False) -> Dict[str, int]:
    raw = _fetch_live() if refresh else _fetch_cached()
    normalized = [n for n in (_normalize(r) for r in raw) if n]

    if not normalized:
        print('[seed] nothing to upsert — empty payload')
        return {'fetched': 0, 'upserted': 0}

    col = db['countries_v2']
    await col.create_index('id', unique=True)
    await col.create_index('iso2')
    await col.create_index('name')

    ops = [
        UpdateOne({'id': n['id']}, {'$set': n}, upsert=True)
        for n in normalized
    ]
    result = await col.bulk_write(ops, ordered=False)
    print(f'[seed] fetched={len(raw)} normalized={len(normalized)} upserted={result.upserted_count} modified={result.modified_count}')
    return {
        'fetched': len(raw),
        'normalized': len(normalized),
        'upserted': result.upserted_count,
        'modified': result.modified_count,
    }


async def _main():
    refresh = '--refresh' in sys.argv
    res = await seed(refresh=refresh)
    print(res)


if __name__ == '__main__':
    asyncio.run(_main())
