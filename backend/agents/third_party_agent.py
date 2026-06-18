"""Third-Party Integration Agent — connects to real external APIs.

Integrates with services defined in third_party_services.py:
- Visa APIs (VisaHQ) for real-time visa requirements
- Travel booking (Skyscanner) for real flight search
- Payments (Wise) for real exchange rates
"""

import httpx
from typing import Optional


async def fetch_visa_requirements(from_country: str, to_country: str, api_key: str) -> Optional[dict]:
    """Fetch real visa requirements from VisaHQ API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f'https://api.visahq.com/v1/requirements',
                params={'from': from_country, 'to': to_country},
                headers={'Authorization': f'Bearer {api_key}'},
            )
            r.raise_for_status()
            return r.json()
    except Exception:
        return None


async def fetch_flights(origin: str, destination: str, api_key: str) -> Optional[list]:
    """Fetch real flight data from Skyscanner API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                'https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/create',
                json={
                    'query': {
                        'market': 'IN',
                        'locale': 'en-GB',
                        'currency': 'INR',
                        'queryLegs': [{
                            'originPlace': {'iata': origin.upper()},
                            'destinationPlace': {'iata': destination.upper()},
                            'date': {'year': 2026, 'month': 7, 'day': 15},
                        }],
                        'adultCount': 1,
                    }
                },
                headers={'x-api-key': api_key},
            )
            r.raise_for_status()
            data = r.json()
            return data.get('content', {}).get('results', {}).get('itineraries', [])
    except Exception:
        return None


async def fetch_exchange_rate(from_currency: str, to_currency: str, api_key: str) -> Optional[float]:
    """Fetch real exchange rate from Wise API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f'https://api.wise.com/v1/rates',
                params={'source': from_currency.upper(), 'target': to_currency.upper()},
                headers={'Authorization': f'Bearer {api_key}'},
            )
            r.raise_for_status()
            data = r.json()
            return data[0].get('rate') if isinstance(data, list) else None
    except Exception:
        return None
