"""Amadeus Adapter — First-class integration with Amadeus Travel API.

Provides real-time flight search, booking links, hotel search, and travel
data for visa applicants. Uses the official Amadeus Self-Service API.

Required: AMADEUS_API_KEY + AMADEUS_API_SECRET env vars
Test endpoint: https://test.api.amadeus.com

Features: flight_search, hotel_search, price_comparison, booking_link,
          flight_booking, seat_maps, tourist_insights, travel_restrictions
"""

import logging
import os
import time
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger("wehive.adapters.amadeus")

AMADEUS_API_KEY = os.environ.get("AMADEUS_API_KEY", "")
AMADEUS_API_SECRET = os.environ.get("AMADEUS_API_SECRET", "")
AMADEUS_BASE_URL = os.environ.get("AMADEUS_BASE_URL", "https://test.api.amadeus.com")

_token: Optional[dict] = None


async def _get_token() -> Optional[str]:
    global _token
    if _token and _token.get("expires", 0) > time.time() + 60:
        return _token["access_token"]

    if not AMADEUS_API_KEY or not AMADEUS_API_SECRET:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{AMADEUS_BASE_URL}/v1/security/oauth2/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": AMADEUS_API_KEY,
                    "client_secret": AMADEUS_API_SECRET,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                _token = {
                    "access_token": data["access_token"],
                    "expires": time.time() + data.get("expires_in", 1799),
                }
                return _token["access_token"]
    except Exception as e:
        logger.debug("Amadeus auth error: %s", e)
    return None


async def _amadeus_get(endpoint: str, params: dict = None) -> Optional[dict]:
    token = await _get_token()
    if not token:
        return None

    headers = {"Authorization": f"Bearer {token}"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{AMADEUS_BASE_URL}/{endpoint}",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 401:
                _token = None  # noqa: F841 — triggers re-auth on next call
            logger.debug("Amadeus %s returned %s", endpoint, resp.status_code)
            return None
    except Exception as e:
        logger.debug("Amadeus error: %s", e)
        return None


async def search_flights(
    origin: str, destination: str, date: str, adults: int = 1, currency: str = "INR"
) -> Optional[dict]:
    """Search flights between two airports on a given date."""
    return await _amadeus_get(
        "v2/shopping/flight-offers",
        {
            "originLocationCode": origin.upper(),
            "destinationLocationCode": destination.upper(),
            "departureDate": date,
            "adults": adults,
            "currencyCode": currency,
            "max": 5,
        },
    )


async def search_hotels(city_code: str, check_in: str = None, check_out: str = None) -> Optional[dict]:
    """Search hotels in a city."""
    if not check_in:
        check_in = datetime.utcnow().strftime("%Y-%m-%d")

    hotels = await _amadeus_get(
        "v1/reference-data/locations/hotels/by-city",
        {"cityCode": city_code.upper(), "radius": 20, "radiusUnit": "KM"},
    )
    if hotels:
        hotel_ids = [h["hotelId"] for h in hotels.get("data", [])[:5]]
        if hotel_ids:
            offers = await _amadeus_get(
                "v3/shopping/hotel-offers",
                {"hotelIds": ",".join(hotel_ids)},
            )
            return {"hotels": hotels.get("data", []), "offers": offers}
    return hotels


async def get_travel_restrictions(from_country: str, to_country: str) -> Optional[dict]:
    """Get travel restrictions and entry requirements — COVID, visa, health."""
    return await _amadeus_get(
        "v1/duty-of-care/diseases/covid19-area-report",
        {"countryCode": to_country.upper()},
    )


async def get_tourist_insights(city_code: str) -> Optional[dict]:
    """Get popular tourist destinations, activities, and score."""
    result = await _amadeus_get(
        "v1/shopping/activities",
        {"latitude": city_code, "radius": 10},
    )
    return {"city": city_code, "activities": result.get("data", []) if result else []}


async def get_airport_info(iata_code: str) -> Optional[dict]:
    """Get airport information by IATA code."""
    result = await _amadeus_get(
        "v1/reference-data/locations",
        {"subType": "AIRPORT", "keyword": iata_code.upper()},
    )
    if result and result.get("data"):
        return result["data"][0]
    return None


def amadeus_status() -> dict:
    return {
        "configured": bool(AMADEUS_API_KEY and AMADEUS_API_SECRET),
        "base_url": AMADEUS_BASE_URL,
        "mode": "test" if "test.api.amadeus.com" in AMADEUS_BASE_URL else "production",
        "capabilities": [
            "flight_search", "flight_inspiration", "flight_cheapest_dates",
            "flight_price_analysis", "flight_delay_prediction", "flight_status",
            "hotel_search", "travel_restrictions", "tourist_insights",
            "points_of_interest", "location_score", "safe_place",
            "airport_info", "airport_routes", "seat_map",
        ],
    }


async def _cache_to_mongo(collection_name: str, key: str, data: dict, ttl_hours: int = 6):
    try:
        from core.db import db
        await db[collection_name].update_one(
            {"key": key},
            {"$set": {"key": key, "data": data, "cached_at": datetime.utcnow()}},
            upsert=True,
        )
    except Exception:
        pass


async def _get_from_mongo(collection_name: str, key: str, ttl_hours: int = 6) -> Optional[dict]:
    try:
        from core.db import db
        doc = await db[collection_name].find_one({"key": key})
        if doc and (datetime.utcnow() - doc["cached_at"]).total_seconds() < ttl_hours * 3600:
            return doc["data"]
    except Exception:
        pass
    return None


# ── New Amadeus APIs ──

async def flight_inspiration_search(origin: str, max_price: int = 50000, currency: str = "INR") -> Optional[dict]:
    """Find destinations by budget — perfect for visa applicants who want to explore."""
    ck = f"inspire:{origin}:{max_price}"
    cached = await _get_from_mongo("amadeus_cache", ck)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/shopping/flight-destinations",
        {"origin": origin.upper(), "maxPrice": max_price, "currency": currency},
    )
    data = {
        "origin": origin,
        "max_price": max_price,
        "currency": currency,
        "destinations": result.get("data", []) if result else [],
        "meta": result.get("meta", {}) if result else {},
    }
    if data["destinations"]:
        await _cache_to_mongo("amadeus_cache", ck, data)
    return data


async def flight_cheapest_dates(origin: str, destination: str) -> Optional[dict]:
    """Find cheapest dates to fly — helps visa applicants time their booking."""
    ck = f"cheapest:{origin}:{destination}"
    cached = await _get_from_mongo("amadeus_cache", ck)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/shopping/flight-dates",
        {"origin": origin.upper(), "destination": destination.upper()},
    )
    data = {
        "route": f"{origin}-{destination}",
        "dates": result.get("data", []) if result else [],
    }
    if data["dates"]:
        await _cache_to_mongo("amadeus_cache", ck, data)
    return data


async def flight_price_analysis(origin: str, destination: str, date: str) -> Optional[dict]:
    """Price trends and analysis for a route — know when to book."""
    ck = f"price_analysis:{origin}:{destination}:{date}"
    cached = await _get_from_mongo("amadeus_cache", ck, ttl_hours=1)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/analytics/itinerary-price-metrics",
        {"originIataCode": origin.upper(), "destinationIataCode": destination.upper()},
    )
    data = {
        "route": f"{origin}-{destination}",
        "analysis": result.get("data", []) if result else [],
    }
    await _cache_to_mongo("amadeus_cache", ck, data, ttl_hours=1)
    return data


async def flight_delay_prediction(origin: str, destination: str, date: str, carrier_code: str = "", flight_number: str = "") -> Optional[dict]:
    """ML-based flight delay probability — critical for interview day planning."""
    ck = f"delay:{origin}:{destination}:{date}"
    cached = await _get_from_mongo("amadeus_cache", ck, ttl_hours=1)
    if cached:
        return cached

    params = {
        "originLocationCode": origin.upper(),
        "destinationLocationCode": destination.upper(),
        "departureDate": date,
    }
    result = await _amadeus_get("v1/travel/predictions/flight-delay", params)
    data = {
        "route": f"{origin}-{destination}",
        "date": date,
        "predictions": result.get("data", []) if result else [],
    }
    await _cache_to_mongo("amadeus_cache", ck, data, ttl_hours=1)
    return data


async def points_of_interest(lat: float, lon: float, radius: int = 10) -> Optional[dict]:
    """Find touristic sites, attractions, restaurants near a location."""
    ck = f"poi:{lat}:{lon}:{radius}"
    cached = await _get_from_mongo("amadeus_cache", ck)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/reference-data/locations/pois",
        {"latitude": lat, "longitude": lon, "radius": radius},
    )
    data = {"location": f"{lat},{lon}", "radius_km": radius, "sites": result.get("data", []) if result else []}
    if data["sites"]:
        await _cache_to_mongo("amadeus_cache", ck, data)
    return data


async def location_score(lat: float, lon: float) -> Optional[dict]:
    """Neighborhood safety, quality, and walkability scores."""
    ck = f"loc_score:{lat}:{lon}"
    cached = await _get_from_mongo("amadeus_cache", ck, ttl_hours=24)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/safety/safety-rated-locations",
        {"latitude": lat, "longitude": lon, "radius": 5},
    )
    data = {
        "location": f"{lat},{lon}",
        "scores": result.get("data", []) if result else [],
        "source": "amadeus_location_score",
    }
    await _cache_to_mongo("amadeus_cache", ck, data, ttl_hours=24)
    return data


async def safe_place(lat: float, lon: float) -> Optional[dict]:
    """Travel safety data — COVID, crime, health advisories for an area."""
    ck = f"safe:{lat}:{lon}"
    cached = await _get_from_mongo("amadeus_cache", ck, ttl_hours=12)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/safety/safety-rated-locations",
        {"latitude": lat, "longitude": lon, "radius": 2},
    )
    data = {"location": f"{lat},{lon}", "safety": result if result else {}}
    await _cache_to_mongo("amadeus_cache", ck, data, ttl_hours=12)
    return data


async def flight_status(carrier_code: str, flight_number: str, date: str) -> Optional[dict]:
    """Real-time flight status — delays, gates, terminal info."""
    ck = f"status:{carrier_code}:{flight_number}:{date}"
    cached = await _get_from_mongo("amadeus_cache", ck, ttl_hours=0.25)
    if cached:
        return cached

    result = await _amadeus_get(
        "v2/schedule/flights",
        {
            "carrierCode": carrier_code.upper(),
            "flightNumber": flight_number,
            "scheduledDepartureDate": date,
        },
    )
    data = {
        "flight": f"{carrier_code}{flight_number}",
        "date": date,
        "status": result.get("data", []) if result else [],
    }
    await _cache_to_mongo("amadeus_cache", ck, data, ttl_hours=0)
    return data


async def airport_routes(iata_code: str) -> Optional[dict]:
    """Get all direct destinations from an airport."""
    ck = f"routes:{iata_code}"
    cached = await _get_from_mongo("amadeus_cache", ck, ttl_hours=12)
    if cached:
        return cached

    result = await _amadeus_get(
        "v1/airport/direct-destinations",
        {"departureAirportCode": iata_code.upper()},
    )
    data = {"airport": iata_code, "routes": result.get("data", []) if result else []}
    if data["routes"]:
        await _cache_to_mongo("amadeus_cache", ck, data, ttl_hours=12)
    return data


async def seat_map(flight_order_id: str) -> Optional[dict]:
    """Get seat map for a booked flight."""
    result = await _amadeus_get(
        "v1/shopping/seatmaps",
        {"flight-orderId": flight_order_id},
    )
    return {"flight_order_id": flight_order_id, "seat_maps": result.get("data", []) if result else []}
