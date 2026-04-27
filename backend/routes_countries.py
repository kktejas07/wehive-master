from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from data import COUNTRIES, get_country, get_holiday_plan

router = APIRouter(prefix='/countries', tags=['countries'])


@router.get('')
async def list_countries(
    q: Optional[str] = Query(None, description='Search by country name'),
    visa_type: Optional[str] = Query(None, description='Filter by visa type'),
    delivery: Optional[str] = Query(None, description='any | standard | rush | same_day'),
    documents: Optional[str] = Query(None, description='any | minimal | standard'),
    no_visa: Optional[bool] = Query(None, description='Show only no-visa-required countries'),
) -> List[dict]:
    items = COUNTRIES.copy()
    if q:
        ql = q.lower().strip()
        items = [c for c in items if ql in c['name'].lower()]
    if visa_type and visa_type.lower() != 'all':
        items = [c for c in items if visa_type in c.get('visa_types', [])]
    if delivery and delivery.lower() not in ('', 'any'):
        if delivery == 'same_day':
            items = [c for c in items if c['delivery']['same_day']]
        elif delivery == 'rush':
            items = [c for c in items if c['delivery']['rush_days'] and c['delivery']['rush_days'] <= 5]
        elif delivery == 'standard':
            items = [c for c in items if c['delivery']['standard_days'] and c['delivery']['standard_days'] <= 15]
    if documents and documents.lower() not in ('', 'any'):
        if documents == 'minimal':
            items = [c for c in items if len(c.get('documents', [])) <= 2]
    if no_visa is True:
        items = [c for c in items if c.get('no_visa')]
    return items


@router.get('/{country_id}')
async def country_detail(country_id: str):
    c = get_country(country_id)
    if not c:
        raise HTTPException(404, 'Country not found')
    return c


@router.get('/{country_id}/holiday-plan')
async def country_holiday_plan(country_id: str):
    c = get_country(country_id)
    if not c:
        raise HTTPException(404, 'Country not found')
    return {
        'country': c,
        'plan': get_holiday_plan(country_id),
    }
