"""Unit tests for newsletter double opt-in. No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import datetime, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routes_newsletter  # noqa: E402
from admin_auth import get_current_admin_flex  # noqa: E402
from server import app  # noqa: E402


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *_a, **_k):
        return self

    def skip(self, n):
        self._docs = self._docs[n:]
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    def __aiter__(self):
        self._it = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return dict(next(self._it))
        except StopIteration:
            raise StopAsyncIteration


class FakeCol:
    def __init__(self):
        self.docs = []

    def _match(self, doc, q):
        return all(doc.get(k) == v for k, v in q.items())

    async def find_one(self, q):
        return next((d for d in self.docs if self._match(d, q)), None)

    async def update_one(self, q, update, upsert=False):
        doc = await self.find_one(q)
        if doc is None:
            if not upsert:
                return
            doc = {'_id': len(self.docs) + 1, **{k: v for k, v in q.items()}}
            doc.update(update.get('$setOnInsert', {}))
            self.docs.append(doc)
        doc.update(update.get('$set', {}))
        for k in update.get('$unset', {}):
            doc.pop(k, None)

    async def count_documents(self, q):
        return sum(1 for d in self.docs if self._match(d, q))

    def find(self, q, projection=None):
        rows = [{k: v for k, v in d.items() if not projection or projection.get(k)} for d in self.docs if self._match(d, q)]
        return _Cursor(rows)


@pytest.fixture
def env(monkeypatch):
    col = FakeCol()
    sent = []

    async def fake_send(email, confirm_token, unsubscribe_token):
        sent.append({'email': email, 'confirm': confirm_token, 'unsubscribe': unsubscribe_token})

    monkeypatch.setenv('RATE_LIMIT_DISABLED', '1')
    monkeypatch.setattr(routes_newsletter, 'newsletter_col', col)
    monkeypatch.setattr(routes_newsletter, '_send_confirmation', fake_send)
    return TestClient(app), col, sent


def test_subscribe_requires_consent(env):
    client, col, sent = env
    r = client.post('/api/newsletter/subscribe', json={'email': 'a@example.com', 'consent': False})
    assert r.status_code == 400
    assert not col.docs and not sent


def test_subscribe_rejects_invalid_email(env):
    client, _, _ = env
    r = client.post('/api/newsletter/subscribe', json={'email': 'not-an-email', 'consent': True})
    assert r.status_code == 422


def test_double_opt_in_flow(env):
    client, col, sent = env
    r = client.post('/api/newsletter/subscribe', json={'email': 'Reader@Example.com', 'consent': True})
    assert r.status_code == 200 and r.json()['ok'] is True
    doc = col.docs[0]
    assert doc['email'] == 'reader@example.com' and doc['status'] == 'pending'
    assert doc['confirm_token_hash'] != sent[0]['confirm']  # only the hash is stored

    r = client.post('/api/newsletter/confirm', json={'token': sent[0]['confirm']})
    assert r.status_code == 200 and r.json()['status'] == 'active'
    assert 'confirm_token_hash' not in doc

    # Link is single-use.
    assert client.post('/api/newsletter/confirm', json={'token': sent[0]['confirm']}).status_code == 400

    r = client.post('/api/newsletter/unsubscribe', json={'token': sent[0]['unsubscribe']})
    assert r.status_code == 200 and doc['status'] == 'unsubscribed'


def test_response_does_not_reveal_existing_subscriber(env):
    client, col, sent = env
    first = client.post('/api/newsletter/subscribe', json={'email': 'x@example.com', 'consent': True}).json()
    client.post('/api/newsletter/confirm', json={'token': sent[0]['confirm']})
    second = client.post('/api/newsletter/subscribe', json={'email': 'x@example.com', 'consent': True}).json()
    assert first == second
    assert len(sent) == 1  # active subscribers get no new email


def test_resend_cooldown(env):
    client, _, sent = env
    for _ in range(3):
        client.post('/api/newsletter/subscribe', json={'email': 'y@example.com', 'consent': True})
    assert len(sent) == 1


def test_expired_confirm_link(env):
    client, col, sent = env
    client.post('/api/newsletter/subscribe', json={'email': 'z@example.com', 'consent': True})
    col.docs[0]['confirm_expires_at'] = datetime.utcnow() - timedelta(minutes=1)
    r = client.post('/api/newsletter/confirm', json={'token': sent[0]['confirm']})
    assert r.status_code == 400 and 'expired' in r.json()['detail']


def test_resubscribe_after_unsubscribe_keeps_unsubscribe_token(env):
    client, col, sent = env
    client.post('/api/newsletter/subscribe', json={'email': 'w@example.com', 'consent': True})
    client.post('/api/newsletter/unsubscribe', json={'token': sent[0]['unsubscribe']})
    col.docs[0]['last_sent_at'] = datetime.utcnow() - timedelta(hours=1)
    client.post('/api/newsletter/subscribe', json={'email': 'w@example.com', 'consent': True})
    assert col.docs[0]['status'] == 'pending'
    assert sent[1]['unsubscribe'] == sent[0]['unsubscribe']


def test_unknown_tokens_rejected(env):
    client, _, _ = env
    bad = 'x' * 40
    assert client.post('/api/newsletter/confirm', json={'token': bad}).status_code == 400
    assert client.post('/api/newsletter/unsubscribe', json={'token': bad}).status_code == 400


def test_subscriber_list_is_admin_only(env):
    client, col, _ = env
    client.post('/api/newsletter/subscribe', json={'email': 'list@example.com', 'consent': True})
    assert client.get('/api/newsletter/subscribers').status_code == 401
    app.dependency_overrides[get_current_admin_flex] = lambda: {'_id': 'admin', 'is_admin': True}
    try:
        body = client.get('/api/newsletter/subscribers').json()
    finally:
        app.dependency_overrides.pop(get_current_admin_flex, None)
    assert body['total'] == 1 and body['counts']['pending'] == 1
    assert 'confirm_token_hash' not in body['items'][0] and 'unsubscribe_token' not in body['items'][0]


def test_whatsapp_number_is_normalised_and_stored(env):
    client, col, _ = env
    r = client.post('/api/newsletter/subscribe',
                    json={'email': 'wa@example.com', 'consent': True, 'whatsapp': '98765 43210'})
    assert r.status_code == 200
    assert col.docs[0]['whatsapp'] == '+919876543210' and col.docs[0]['whatsapp_opt_in'] is True


def test_whatsapp_number_is_optional_and_validated(env):
    client, col, _ = env
    assert client.post('/api/newsletter/subscribe',
                       json={'email': 'nowa@example.com', 'consent': True, 'whatsapp': ''}).status_code == 200
    assert col.docs[0]['whatsapp'] is None and col.docs[0]['whatsapp_opt_in'] is False
    r = client.post('/api/newsletter/subscribe', json={'email': 'bad@example.com', 'consent': True, 'whatsapp': '+12'})
    assert r.status_code == 422
