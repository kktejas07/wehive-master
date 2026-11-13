"""Request IDs, the access log, JSON log lines and the client crash intake."""
import json
import logging
import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import request_context as rc  # noqa: E402
import routes_client_errors as ce  # noqa: E402


def _request(path='/api/countries', headers=None):
    req = MagicMock()
    req.headers = headers or {}
    req.method = 'GET'
    req.url.path = path
    req.state = MagicMock(spec=[])
    return req


def _response(status=200):
    return MagicMock(status_code=status, headers={})


# ── request ID ────────────────────────────────────────────────────────────────

def test_a_wellformed_caller_id_is_reused_and_anything_else_is_replaced():
    assert rc.new_request_id('abc-123_DEF.456') == 'abc-123_DEF.456'
    for bad in ('', 'short', 'x' * 65, 'has space in it', 'evil\r\nSet-Cookie: a=b', '<script>alert(1)</script>'):
        minted = rc.new_request_id(bad)
        assert minted != bad and len(minted) == 32 and minted.isalnum()
    assert rc.new_request_id() != rc.new_request_id()


@pytest.mark.asyncio
async def test_middleware_tags_the_request_the_response_and_every_log_line(caplog):
    seen = {}

    async def call_next(request):
        seen['during'] = rc.request_id_var.get()
        return _response(201)

    req = _request(headers={'X-Request-ID': 'trace-from-gateway'})
    with caplog.at_level(logging.INFO, logger='wehive.access'):
        res = await rc.request_context_middleware(req, call_next)

    assert seen['during'] == 'trace-from-gateway' == req.state.request_id
    assert res.headers['X-Request-ID'] == 'trace-from-gateway'
    assert rc.request_id_var.get() is None, 'the ID must not leak into the next request'
    assert len(caplog.records) == 1
    assert caplog.records[0].getMessage().startswith('GET /api/countries -> 201 in ')


@pytest.mark.asyncio
async def test_a_crashing_handler_is_logged_as_500_and_the_error_still_propagates(caplog):
    async def call_next(request):
        raise RuntimeError('handler blew up')

    with caplog.at_level(logging.INFO, logger='wehive.access'):
        with pytest.raises(RuntimeError):
            await rc.request_context_middleware(_request('/api/payments/order'), call_next)

    assert '/api/payments/order -> 500' in caplog.records[0].getMessage()
    assert rc.request_id_var.get() is None


@pytest.mark.asyncio
async def test_health_checks_do_not_flood_the_access_log(caplog):
    async def call_next(request):
        return _response()

    with caplog.at_level(logging.INFO, logger='wehive.access'):
        res = await rc.request_context_middleware(_request('/api/health'), call_next)
    assert caplog.records == [] and 'X-Request-ID' in res.headers


# ── JSON log lines ────────────────────────────────────────────────────────────

def _format(**kwargs):
    record = logging.LogRecord('wehive', logging.ERROR, __file__, 10, 'boom %s', ('x',), kwargs.pop('exc_info', None))
    for k, v in kwargs.items():
        setattr(record, k, v)
    return json.loads(rc.JsonFormatter().format(record))


def test_log_line_is_json_without_request_fields_outside_a_request():
    line = _format()
    assert line['level'] == 'ERROR' and line['logger'] == 'wehive' and line['message'] == 'boom x'
    assert 'request_id' not in line and 'exc' not in line


def test_log_line_carries_the_request_id_from_context_or_from_the_record():
    token = rc.request_id_var.set('from-context')
    try:
        assert _format()['request_id'] == 'from-context'
        assert _format(request_id='explicit')['request_id'] == 'explicit'
    finally:
        rc.request_id_var.reset(token)


def test_log_line_includes_the_traceback_of_a_logged_exception():
    try:
        raise ValueError('bad input')
    except ValueError:
        line = _format(exc_info=sys.exc_info())
    assert 'Traceback' in line['exc'] and 'ValueError: bad input' in line['exc']


# ── client crash intake ───────────────────────────────────────────────────────

REPORT = dict(message='Cannot read properties of undefined', name='TypeError', stack='at Screen (app.js:1:2)',
              platform='android', app_version='1.0.0', screen='/track/42', fatal=True)


@pytest.mark.asyncio
async def test_a_crash_report_is_logged_and_stored(monkeypatch, caplog):
    coll = MagicMock(insert_one=AsyncMock())
    monkeypatch.setattr(ce, 'db', {'client_errors': coll})

    with caplog.at_level(logging.ERROR, logger='wehive.client_error'):
        out = await ce.report_client_error(ce.ClientErrorReport(**REPORT))

    assert out == {'ok': True}
    msg = caplog.records[0].getMessage()
    assert 'android 1.0.0 FATAL' in msg and 'TypeError: Cannot read properties' in msg and 'screen=/track/42' in msg
    doc = coll.insert_one.await_args.args[0]
    assert {k: doc[k] for k in REPORT} == REPORT
    assert doc['created_at'].tzinfo is not None, 'the 30-day TTL index needs a real datetime'


@pytest.mark.asyncio
async def test_a_storage_failure_does_not_lose_the_report_or_fail_the_client(monkeypatch, caplog):
    coll = MagicMock(insert_one=AsyncMock(side_effect=RuntimeError('mongo down')))
    monkeypatch.setattr(ce, 'db', {'client_errors': coll})

    with caplog.at_level(logging.WARNING, logger='wehive.client_error'):
        out = await ce.report_client_error(ce.ClientErrorReport(message='x'))

    assert out == {'ok': True}
    levels = [r.levelname for r in caplog.records]
    assert levels == ['ERROR', 'WARNING'] and 'mongo down' in caplog.records[1].getMessage()


def test_crash_reports_have_defaults_and_hard_size_limits():
    minimal = ce.ClientErrorReport(message='x')
    assert (minimal.name, minimal.platform, minimal.fatal, minimal.stack) == ('Error', 'unknown', False, '')
    for bad in ({'message': ''}, {'message': 'm' * 2001}, {'stack': 's' * 8001}, {'platform': 'windows'},
                {'screen': 'p' * 301}, {'app_version': 'v' * 41}, {'name': 'n' * 201}):
        with pytest.raises(ValidationError):
            ce.ClientErrorReport(**{'message': 'x', **bad})


def test_crash_intake_is_rate_limited_per_ip():
    assert (ce._limiter.max_calls, ce._limiter.window, ce._limiter.by) == (20, 600, 'ip')
