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
    cats = data.get('categories')
    if visa_type and cats:
        # Static data stores categories as {name: {...}}; Mongo docs may use a list of {name, ...}.
        items = cats.items() if isinstance(cats, dict) else ((c.get('name', ''), c) for c in cats if isinstance(c, dict))
        wanted = visa_type.strip().lower()
        for key, cat in items:
            if not isinstance(cat, dict):
                continue
            if wanted in (str(key).lower(), str(cat.get('name', '')).lower()):
                return {'country': data.get('name'), 'visa_type': key or visa_type, **cat}
    return data


async def get_application_fee(country_id: str, visa_type: str = 'Tourist', applicants: int = 1) -> Optional[dict]:
    """Visa fee breakdown in INR, the same figures the visa page and checkout use:
    embassy + appointment fees are paid at submit, service fee + GST on delivery."""
    from fee_calculator import compute_fees
    from pricing import load_pricing
    data = await lookup_country((country_id or '').lower())
    if not data:
        return None
    cats = data.get('categories') or {}
    items = cats.items() if isinstance(cats, dict) else ((c.get('type') or c.get('name', ''), c) for c in cats if isinstance(c, dict))
    wanted = (visa_type or 'Tourist').strip().lower()
    key, cat = next(((k, c) for k, c in items if isinstance(c, dict) and wanted in (str(k).lower(), str(c.get('name', '')).lower())),
                    (visa_type, {}))
    visa_type = str(key or 'Tourist').title() if not cat else str(key)
    requires_appt = bool(data.get('requires_appointment')) and not data.get('no_visa')
    try:
        pricing = await load_pricing()
    except Exception:  # pricing settings unreadable: fall back to the built-in defaults
        from fee_calculator import DEFAULT_BASE_FEE_BY_TYPE, DEFAULT_GST_RATE, DEFAULT_SURCHARGE_INR
        pricing = {'base_fees': DEFAULT_BASE_FEE_BY_TYPE, 'surcharge_inr': DEFAULT_SURCHARGE_INR, 'gst_rate': DEFAULT_GST_RATE}
    fees = compute_fees(
        applicants=applicants, visa_type=visa_type,
        govt_fee_inr=0 if data.get('no_visa') else int(cat.get('fees_inr') or 0),
        requires_appointment=requires_appt,
        appointment_fee_inr=int(data.get('appointment_fee_inr') or 0) if requires_appt else 0,
        base_fees_override=pricing['base_fees'], surcharge_inr=pricing['surcharge_inr'], gst_rate=pricing['gst_rate'],
    )
    pay_now = fees['govt'] + fees['appointment']
    return {
        'country': data.get('name'),
        'visa_type': visa_type,
        'applicants': fees['applicants'],
        'embassy_fee_inr': fees['govt'],
        'appointment_fee_inr': fees['appointment'],
        'service_fee_inr': fees['base'],
        'gst_inr': fees['gst'],
        'pay_at_submit_inr': pay_now,
        'due_on_delivery_inr': fees['total'] - pay_now,
        'total_inr': fees['total'],
        # Older callers read these two names.
        'fee_inr': fees['total'],
        'embassy_fee': fees['govt'],
    }
