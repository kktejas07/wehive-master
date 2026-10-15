"""Server-side proxy for third-party visa-requirement APIs, so their keys never reach the browser."""
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from rate_limit import RateLimit

router = APIRouter(prefix='/visa-providers', tags=['visa-providers'])
logger = logging.getLogger('wehive.visa_providers')

_limiter = RateLimit(max_calls=20, window_seconds=600)


class SherpaTripRequest(BaseModel):
    citizenship: str = Field(min_length=2, max_length=3)
    destination: str = Field(min_length=2, max_length=3)
    travelDate: Optional[str] = Field(default=None, max_length=10)


@router.post('/sherpa/trips')
async def sherpa_trips(req: SherpaTripRequest, _=Depends(_limiter)):
    api_key = os.environ.get('SHERPA_API_KEY', '')
    if not api_key:
        raise HTTPException(503, 'Visa requirements provider not configured')
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                'https://api.joinsherpa.io/v2/trips',
                headers={'x-api-key': api_key},
                json=req.model_dump(),
            )
            res.raise_for_status()
            return res.json()
    except Exception:
        logger.exception('Sherpa request failed')
        raise HTTPException(502, 'Visa requirements provider unavailable')
