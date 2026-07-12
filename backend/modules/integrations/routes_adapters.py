"""Third-Party Adapters API — Manage VisaHQ, Amadeus, and other
first-class integration adapters.

Endpoints:
  GET  /api/adapters/list              List all adapters + status
  GET  /api/adapters/visahq/requirements   Visa requirements
  GET  /api/adapters/visahq/documents      Document checklist
  GET  /api/adapters/visahq/processing     Processing times
  GET  /api/adapters/visahq/fees           Visa fees
  GET  /api/adapters/visahq/slots          Wait-time estimates
  GET  /api/adapters/amadeus/flights       Flight search
  GET  /api/adapters/amadeus/hotels        Hotel search
  GET  /api/adapters/amadeus/restrictions  Travel restrictions
  GET  /api/adapters/status                All adapters health
"""

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/adapters", tags=["third-party-adapters"])


@router.get("/list")
async def list_adapters():
    from adapters.visahq_adapter import visahq_status
    from adapters.amadeus_adapter import amadeus_status
    return {
        "ok": True,
        "adapters": {
            "visahq": visahq_status(),
            "amadeus": amadeus_status(),
        },
    }


@router.get("/status")
async def adapter_status():
    from adapters.visahq_adapter import visahq_status
    from adapters.amadeus_adapter import amadeus_status
    vhq = visahq_status()
    amd = amadeus_status()
    return {
        "ok": True,
        "visahq_connected": vhq["configured"],
        "amadeus_connected": amd["configured"],
        "total_configured": sum([vhq["configured"], amd["configured"]]),
        "total_registered": 2,
    }


@router.get("/visahq/requirements")
async def visahq_requirements(
    from_country: str = Query("in", description="Source country code"),
    to_country: str = Query(..., description="Destination country code"),
):
    from adapters.visahq_adapter import get_visa_requirements
    result = await get_visa_requirements(from_country, to_country)
    if not result:
        raise HTTPException(status_code=502, detail="VisaHQ unavailable — set VISA_HQ_API_KEY")
    return {"ok": True, **result}


@router.get("/visahq/documents")
async def visahq_documents(
    from_country: str = Query("in"),
    to_country: str = Query(...),
    visa_type: str = Query("tourist"),
):
    from adapters.visahq_adapter import get_document_checklist
    result = await get_document_checklist(from_country, to_country, visa_type)
    if not result:
        raise HTTPException(status_code=502, detail="VisaHQ unavailable")
    return {"ok": True, **result}


@router.get("/visahq/processing")
async def visahq_processing(
    from_country: str = Query("in"),
    to_country: str = Query(...),
    visa_type: str = Query("tourist"),
):
    from adapters.visahq_adapter import get_processing_times
    result = await get_processing_times(from_country, to_country, visa_type)
    if not result:
        raise HTTPException(status_code=502, detail="VisaHQ unavailable")
    return {"ok": True, **result}


@router.get("/visahq/fees")
async def visahq_fees(
    from_country: str = Query("in"),
    to_country: str = Query(...),
    visa_type: str = Query("tourist"),
):
    from adapters.visahq_adapter import get_visa_fees
    result = await get_visa_fees(from_country, to_country, visa_type)
    if not result:
        raise HTTPException(status_code=502, detail="VisaHQ unavailable")
    return {"ok": True, **result}


@router.get("/visahq/slots")
async def visahq_slots(
    from_country: str = Query("in"),
    to_country: str = Query(...),
    location: str = Query(""),
):
    from adapters.visahq_adapter import get_slot_wait_time
    result = await get_slot_wait_time(from_country, to_country, location)
    return {"ok": True, **result}


@router.get("/amadeus/flights")
async def amadeus_flights(
    origin: str = Query(..., description="Origin airport IATA (e.g. BLR, DEL, BOM)"),
    destination: str = Query(..., description="Destination airport IATA (e.g. JFK, LHR, DXB)"),
    date: str = Query(..., description="Departure date (YYYY-MM-DD)"),
    adults: int = Query(1),
    currency: str = Query("INR"),
):
    from adapters.amadeus_adapter import search_flights
    result = await search_flights(origin, destination, date, adults, currency)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable — set AMADEUS_API_KEY and AMADEUS_API_SECRET")
    return {"ok": True, "flights": result.get("data", []), "meta": result.get("meta", {})}


@router.get("/amadeus/hotels")
async def amadeus_hotels(
    city_code: str = Query(..., description="City IATA code (e.g. NYC, LON, PAR)"),
):
    from adapters.amadeus_adapter import search_hotels
    result = await search_hotels(city_code)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, "hotels": result.get("data", result.get("hotels", []))}


@router.get("/amadeus/restrictions")
async def amadeus_restrictions(
    from_country: str = Query("IN"),
    to_country: str = Query("US"),
):
    from adapters.amadeus_adapter import get_travel_restrictions
    result = await get_travel_restrictions(from_country, to_country)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/insights")
async def amadeus_insights(city_code: str = Query(...)):
    from adapters.amadeus_adapter import get_tourist_insights
    result = await get_tourist_insights(city_code)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/inspiration")
async def amadeus_inspiration(
    origin: str = Query("DEL"), max_price: int = Query(50000), currency: str = Query("INR"),
):
    from adapters.amadeus_adapter import flight_inspiration_search
    result = await flight_inspiration_search(origin, max_price, currency)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/cheapest-dates")
async def amadeus_cheapest_dates(origin: str = Query(...), destination: str = Query(...)):
    from adapters.amadeus_adapter import flight_cheapest_dates
    result = await flight_cheapest_dates(origin, destination)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/price-analysis")
async def amadeus_price_analysis(
    origin: str = Query(...), destination: str = Query(...), date: str = Query(...),
):
    from adapters.amadeus_adapter import flight_price_analysis
    result = await flight_price_analysis(origin, destination, date)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/delay-prediction")
async def amadeus_delay_prediction(
    origin: str = Query(...), destination: str = Query(...), date: str = Query(...),
):
    from adapters.amadeus_adapter import flight_delay_prediction
    result = await flight_delay_prediction(origin, destination, date)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/poi")
async def amadeus_poi(lat: float = Query(...), lon: float = Query(...), radius: int = Query(10)):
    from adapters.amadeus_adapter import points_of_interest
    result = await points_of_interest(lat, lon, radius)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/location-score")
async def amadeus_location_score(lat: float = Query(...), lon: float = Query(...)):
    from adapters.amadeus_adapter import location_score
    result = await location_score(lat, lon)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/safe-place")
async def amadeus_safe_place(lat: float = Query(...), lon: float = Query(...)):
    from adapters.amadeus_adapter import safe_place
    result = await safe_place(lat, lon)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/flight-status")
async def amadeus_flight_status(
    carrier_code: str = Query(...), flight_number: str = Query(...), date: str = Query(...),
):
    from adapters.amadeus_adapter import flight_status
    result = await flight_status(carrier_code, flight_number, date)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/airport-routes")
async def amadeus_airport_routes(iata_code: str = Query(...)):
    from adapters.amadeus_adapter import airport_routes
    result = await airport_routes(iata_code)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}


@router.get("/amadeus/seat-map")
async def amadeus_seat_map(flight_order_id: str = Query(...)):
    from adapters.amadeus_adapter import seat_map
    result = await seat_map(flight_order_id)
    if not result:
        raise HTTPException(status_code=502, detail="Amadeus unavailable")
    return {"ok": True, **result}
