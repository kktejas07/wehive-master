"""WhatsApp inbound webhook: STOP opt-outs and message routing."""
import os
import sys
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from routes_webhooks import _STOP_RE, _normalize_phone  # noqa: E402


class TestStopDetection:
    @pytest.mark.parametrize('text', ['STOP', 'stop', ' Stop ', 'UNSUBSCRIBE', 'cancel', 'opt-out', 'opt out', 'remove me', 'do not contact', 'do not send'])
    def test_stop_words_match(self, text):
        assert _STOP_RE.match(text)

    @pytest.mark.parametrize('text', ['Please stop the rain', 'I want to cancel my visa appointment', 'hello', 'stop doing that', ''])
    def test_non_stop_messages_ignored(self, text):
        assert not _STOP_RE.match(text)


class TestPhoneNormalization:
    def test_with_country_suffix(self):
        assert _normalize_phone('919121495077@c.us') == '+919121495077'

    def test_plain_digits(self):
        assert _normalize_phone('919121495077') == '+919121495077'


@pytest.mark.asyncio
async def test_stop_records_opt_out():
    from fastapi.testclient import TestClient

    with patch('routes_webhooks._webhook_secret', return_value=''):
        from routes_webhooks import router
        from fastapi import FastAPI
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)

        with patch('routes_announcements.add_opt_outs', new_callable=AsyncMock, return_value=1) as mock_add:
            resp = client.post('/webhooks/whatsapp', json={'from': '919121495077@c.us', 'body': 'STOP', 'type': 'chat'})
            assert resp.status_code == 200
            data = resp.json()
            assert data['action'] == 'opt_out'
            assert data['added'] == 1
            mock_add.assert_awaited_once_with(['+919121495077'], 'whatsapp_stop')


@pytest.mark.asyncio
async def test_non_stop_passes_through():
    from fastapi.testclient import TestClient

    with patch('routes_webhooks._webhook_secret', return_value=''):
        from routes_webhooks import router
        from fastapi import FastAPI
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)

        resp = client.post('/webhooks/whatsapp', json={'from': '919121495077@c.us', 'body': 'Hello, I need help', 'type': 'chat'})
        assert resp.status_code == 200
        assert resp.json()['action'] == 'received'


@pytest.mark.asyncio
async def test_invalid_secret_rejected():
    from fastapi.testclient import TestClient

    with patch('routes_webhooks._webhook_secret', return_value='my-secret'):
        from routes_webhooks import router
        from fastapi import FastAPI
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)

        resp = client.post('/webhooks/whatsapp', json={'from': '919121495077@c.us', 'body': 'STOP', 'type': 'chat'}, headers={'x-api-key': 'wrong'})
        assert resp.status_code == 401
