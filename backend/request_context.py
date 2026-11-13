"""Structured logging: per-request ID, access log and the JSON log formatter.

Every request gets an ID (the caller's `X-Request-ID` if it is well-formed,
otherwise a new one). It is kept in a contextvar so the JSON log formatter can
stamp it on every line the request produces, and it is returned in the
`X-Request-ID` response header so a user-reported failure can be found in logs.
"""
import contextvars
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone

request_id_var: contextvars.ContextVar = contextvars.ContextVar('request_id', default=None)

_SAFE_ID = re.compile(r'^[A-Za-z0-9._-]{8,64}$')
_QUIET_PATHS = ('/api/health',)
_access_log = logging.getLogger('wehive.access')


def new_request_id(incoming: str = '') -> str:
    """Reuse a well-formed caller ID (so traces span services); otherwise mint one."""
    return incoming if _SAFE_ID.match(incoming or '') else uuid.uuid4().hex


async def request_context_middleware(request, call_next):
    rid = new_request_id(request.headers.get('X-Request-ID', ''))
    request.state.request_id = rid
    token = request_id_var.set(rid)
    start = time.perf_counter()
    status = 500  # stays 500 if the handler raises
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers['X-Request-ID'] = rid
        return response
    finally:
        if request.url.path not in _QUIET_PATHS:
            _access_log.info(
                '%s %s -> %s in %dms', request.method, request.url.path, status,
                (time.perf_counter() - start) * 1000,
            )
        request_id_var.reset(token)


class JsonFormatter(logging.Formatter):
    """One JSON object per line, with the request ID and (for errors) the traceback."""

    def format(self, record):
        entry = {
            'ts': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'line': record.lineno,
        }
        request_id = getattr(record, 'request_id', None) or request_id_var.get()
        if request_id:
            entry['request_id'] = request_id
        if record.exc_info:
            entry['exc'] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)
