"""Crash intake for the web and mobile clients.

Clients post uncaught errors here. Each report is written to the structured
log (logger `wehive.client_error`) and kept for 30 days in `client_errors`.
Public and unauthenticated by design — a crash can happen before sign-in — so
it is rate-limited per IP and every field is length-capped.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from db import db
from rate_limit import RateLimit

logger = logging.getLogger('wehive.client_error')

router = APIRouter(prefix='/client-errors', tags=['observability'])

_limiter = RateLimit(max_calls=20, window_seconds=600)


class ClientErrorReport(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    name: str = Field('Error', max_length=200)
    stack: str = Field('', max_length=8000)
    platform: Literal['web', 'ios', 'android', 'unknown'] = 'unknown'
    app_version: str = Field('', max_length=40)
    screen: str = Field('', max_length=300)
    fatal: bool = False


@router.post('', status_code=202)
async def report_client_error(req: ClientErrorReport, _=Depends(_limiter)):
    logger.error(
        'client error [%s %s%s] %s: %s | screen=%s | %s',
        req.platform, req.app_version or '?', ' FATAL' if req.fatal else '',
        req.name, req.message, req.screen or '-', req.stack[:2000],
    )
    try:
        await db['client_errors'].insert_one({
            '_id': str(uuid.uuid4()),
            **req.model_dump(),
            'created_at': datetime.now(timezone.utc),
        })
    except Exception as exc:  # the log line above is the record of last resort
        logger.warning('could not store client error: %s', exc)
    return {'ok': True}
