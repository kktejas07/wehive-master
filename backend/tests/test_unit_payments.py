"""Razorpay checkout: order creation, signature verification, webhook, receipts.

The money paths: a user must become premium exactly once per genuine payment,
and never from a forged signature, a replayed webhook or a refunded order.
"""
import hashlib
import hmac
import json
import os
import sys
import types
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import routes_payments as rp  # noqa: E402

KEY_ID, KEY_SECRET, WEBHOOK_SECRET = 'rzp_test_key', 'test-key-secret', 'test-webhook-secret'
USER = {'_id': 'u1', 'email': 'priya@example.com', 'name': 'Priya'}


def _sign(secret: str, payload: bytes) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


@pytest.fixture
def gateway(monkeypatch):
    """Razorpay keys as the admin Settings page would provide them."""
    keys = AsyncMock(return_value=(KEY_ID, KEY_SECRET, WEBHOOK_SECRET))
    monkeypatch.setitem(sys.modules, 'settings_service', types.SimpleNamespace(get_razorpay_keys=keys))
    monkeypatch.setattr(rp, 'PAYMENT_BYPASS_ENABLED', False)
    return keys


@pytest.fixture
def store(monkeypatch):
    payments = MagicMock(find_one=AsyncMock(), insert_one=AsyncMock(), find_one_and_update=AsyncMock(),
                         update_one=AsyncMock(return_value=MagicMock(modified_count=1)))
    users = MagicMock(find_one=AsyncMock(return_value=USER), update_one=AsyncMock())
    monkeypatch.setattr(rp, 'payments', payments)
    monkeypatch.setattr(rp, 'users', users)
    return types.SimpleNamespace(payments=payments, users=users)


def _verify_req(order='order_1', payment='pay_1', signature=None, plan='standard'):
    signature = signature or _sign(KEY_SECRET, f'{order}|{payment}'.encode())
    return rp.VerifyRequest(razorpay_order_id=order, razorpay_payment_id=payment,
                            razorpay_signature=signature, plan_id=plan)


def _webhook_request(body: dict):
    raw = json.dumps(body).encode()
    return MagicMock(body=AsyncMock(return_value=raw)), _sign(WEBHOOK_SECRET, raw)


# ── create order ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_order_rejects_an_unknown_plan(gateway, store):
    with pytest.raises(HTTPException) as e:
        await rp.create_order(rp.CreateOrderRequest(plan_id='platinum'), user=USER)
    assert e.value.status_code == 400
    store.payments.insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_order_says_so_when_the_gateway_is_not_configured(gateway, store):
    gateway.return_value = ('', '', '')
    with pytest.raises(HTTPException) as e:
        await rp.create_order(rp.CreateOrderRequest(plan_id='lite'), user=USER)
    assert e.value.status_code == 503 and 'not configured' in e.value.detail


@pytest.mark.asyncio
async def test_create_order_charges_the_plan_price_in_paise_and_records_it(gateway, store, monkeypatch):
    client = MagicMock()
    client.order.create.return_value = {'id': 'order_abc'}
    monkeypatch.setattr(rp, '_get_razorpay', AsyncMock(return_value=client))

    out = await rp.create_order(rp.CreateOrderRequest(plan_id='standard'), user=USER)

    assert out == {'order_id': 'order_abc', 'amount': 99900, 'currency': 'INR', 'plan_id': 'standard', 'razorpay_key': KEY_ID}
    sent = client.order.create.call_args.args[0]
    assert sent['amount'] == 99900 and sent['currency'] == 'INR' and sent['notes']['user_id'] == 'u1'
    doc = store.payments.insert_one.await_args.args[0]
    assert (doc['user_id'], doc['plan_id'], doc['amount_inr'], doc['status'], doc['razorpay_order_id']) == \
        ('u1', 'standard', 999, 'created', 'order_abc')


@pytest.mark.asyncio
async def test_create_order_reports_a_gateway_failure_without_recording_a_payment(gateway, store, monkeypatch):
    client = MagicMock()
    client.order.create.side_effect = RuntimeError('razorpay timeout')
    monkeypatch.setattr(rp, '_get_razorpay', AsyncMock(return_value=client))
    with pytest.raises(HTTPException) as e:
        await rp.create_order(rp.CreateOrderRequest(plan_id='lite'), user=USER)
    assert e.value.status_code == 502
    store.payments.insert_one.assert_not_awaited()

    monkeypatch.setattr(rp, '_get_razorpay', AsyncMock(return_value=None))
    with pytest.raises(HTTPException) as e:
        await rp.create_order(rp.CreateOrderRequest(plan_id='lite'), user=USER)
    assert e.value.status_code == 503


@pytest.mark.asyncio
async def test_dev_bypass_creates_a_mock_order_without_calling_razorpay(gateway, store, monkeypatch):
    monkeypatch.setattr(rp, 'PAYMENT_BYPASS_ENABLED', True)
    monkeypatch.setattr(rp, '_get_razorpay', AsyncMock(side_effect=AssertionError('must not reach the gateway')))
    out = await rp.create_order(rp.CreateOrderRequest(plan_id='lite'), user=USER)
    assert out['order_id'].startswith('mock-') and out['razorpay_key'] == 'mock' and out['amount'] == 49900
    assert store.payments.insert_one.await_args.args[0]['status'] == 'mock'


# ── verify (browser callback) ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_only_finds_the_callers_own_order(gateway, store):
    store.payments.find_one.return_value = None
    with pytest.raises(HTTPException) as e:
        await rp.verify_payment(_verify_req(), user=USER, bg=MagicMock())
    assert e.value.status_code == 404
    assert store.payments.find_one.await_args.args[0] == {'razorpay_order_id': 'order_1', 'user_id': 'u1'}


@pytest.mark.asyncio
async def test_a_valid_signature_marks_the_order_paid_and_upgrades_the_user(gateway, store):
    order = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'standard', 'status': 'created', 'amount_inr': 999}
    store.payments.find_one.return_value = order
    bg = MagicMock()

    out = await rp.verify_payment(_verify_req(), user=USER, bg=bg)

    assert out['ok'] and out['is_premium'] and out['plan'] == 'Standard'
    flt, update = store.payments.update_one.await_args.args
    assert flt == {'_id': 'p1', 'status': {'$nin': list(rp.SETTLED)}}, 'must not overwrite a settled order'
    assert update['$set']['status'] == 'paid' and update['$set']['razorpay_payment_id'] == 'pay_1'
    user_set = store.users.update_one.await_args.args[1]['$set']
    assert user_set['is_premium'] is True and user_set['plan_id'] == 'standard'
    assert bg.add_task.call_args.args[0] is rp._send_payment_email and bg.add_task.call_args.args[-1] is True


@pytest.mark.asyncio
async def test_the_plan_granted_is_the_one_paid_for_not_the_one_the_client_claims(gateway, store):
    store.payments.find_one.return_value = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'lite', 'status': 'created'}
    out = await rp.verify_payment(_verify_req(plan='concierge'), user=USER, bg=MagicMock())
    assert out['plan'] == 'Lite'
    assert store.users.update_one.await_args.args[1]['$set']['plan_id'] == 'lite'


@pytest.mark.asyncio
async def test_a_forged_signature_fails_the_order_and_never_upgrades(gateway, store):
    store.payments.find_one.return_value = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'standard', 'status': 'created'}
    bg = MagicMock()
    with pytest.raises(HTTPException) as e:
        await rp.verify_payment(_verify_req(signature='0' * 64), user=USER, bg=bg)
    assert e.value.status_code == 400 and e.value.detail == 'Invalid signature'
    assert store.payments.update_one.await_args.args[1]['$set']['status'] == 'failed'
    store.users.update_one.assert_not_awaited()
    assert bg.add_task.call_args.args[-1] is False, 'the user is told the payment failed'


@pytest.mark.asyncio
async def test_verifying_an_already_paid_order_is_a_no_op(gateway, store):
    store.payments.find_one.return_value = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'standard', 'status': 'paid'}
    out = await rp.verify_payment(_verify_req(signature='anything'), user=USER, bg=MagicMock())
    assert out == {'ok': True, 'is_premium': True, 'message': 'Already upgraded'}
    store.payments.update_one.assert_not_awaited()
    store.users.update_one.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize('status', ['refunded', 'partially_refunded'])
async def test_a_refunded_order_cannot_be_verified_again(gateway, store, status):
    store.payments.find_one.return_value = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'standard', 'status': status}
    with pytest.raises(HTTPException) as e:
        await rp.verify_payment(_verify_req(), user=USER, bg=MagicMock())
    assert e.value.status_code == 409
    store.users.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_when_the_webhook_already_settled_the_order_verify_does_not_grant_twice(gateway, store):
    order = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'standard', 'status': 'created'}
    store.payments.update_one.return_value = MagicMock(modified_count=0)

    store.payments.find_one.side_effect = [order, {**order, 'status': 'paid'}]
    out = await rp.verify_payment(_verify_req(), user=USER, bg=MagicMock())
    assert out['message'] == 'Already upgraded'

    store.payments.find_one.side_effect = [order, {**order, 'status': 'refunded'}]
    with pytest.raises(HTTPException) as e:
        await rp.verify_payment(_verify_req(), user=USER, bg=MagicMock())
    assert e.value.status_code == 409
    store.users.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_verify_needs_the_gateway_secret(gateway, store):
    gateway.return_value = (KEY_ID, '', '')
    store.payments.find_one.return_value = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'standard', 'status': 'created'}
    with pytest.raises(HTTPException) as e:
        await rp.verify_payment(_verify_req(), user=USER, bg=MagicMock())
    assert e.value.status_code == 503


# ── webhook (server-to-server) ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_webhook_rejects_missing_or_wrong_signatures_before_touching_data(gateway, store):
    request, good = _webhook_request({'event': 'payment.captured'})
    for signature in (None, '', 'f' * 64):
        with pytest.raises(HTTPException) as e:
            await rp.razorpay_webhook(request, x_razorpay_signature=signature, bg=MagicMock())
        assert e.value.status_code == 400

    gateway.return_value = (KEY_ID, KEY_SECRET, '')  # webhook secret not set
    with pytest.raises(HTTPException) as e:
        await rp.razorpay_webhook(request, x_razorpay_signature=good, bg=MagicMock())
    assert e.value.status_code == 400
    store.payments.find_one_and_update.assert_not_awaited()


@pytest.mark.asyncio
async def test_webhook_rejects_a_signed_body_that_is_not_json(gateway, store):
    raw = b'not json'
    request = MagicMock(body=AsyncMock(return_value=raw))
    with pytest.raises(HTTPException) as e:
        await rp.razorpay_webhook(request, x_razorpay_signature=_sign(WEBHOOK_SECRET, raw), bg=MagicMock())
    assert e.value.status_code == 400 and e.value.detail == 'Invalid JSON'


@pytest.mark.asyncio
@pytest.mark.parametrize('event', ['payment.captured', 'payment.success', 'order.paid'])
async def test_webhook_payment_success_upgrades_the_user(gateway, store, event):
    paid = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'concierge', 'status': 'paid', 'amount_inr': 1499}
    store.payments.find_one_and_update.return_value = paid
    request, signature = _webhook_request({'event': event, 'payload': {'payment': {'entity': {'id': 'pay_9', 'order_id': 'order_9'}}}})
    bg = MagicMock()

    assert await rp.razorpay_webhook(request, x_razorpay_signature=signature, bg=bg) == {'ok': True}

    flt, update = store.payments.find_one_and_update.await_args.args[:2]
    assert flt == {'razorpay_order_id': 'order_9', 'status': {'$nin': list(rp.SETTLED)}}
    assert update['$set']['status'] == 'paid' and update['$set']['razorpay_payment_id'] == 'pay_9'
    user_flt, user_update = store.users.update_one.await_args.args
    assert user_flt == {'_id': 'u1'} and user_update['$set']['is_premium'] is True and user_update['$set']['plan_id'] == 'concierge'
    assert bg.add_task.call_args.args[-1] is True


@pytest.mark.asyncio
async def test_a_replayed_webhook_for_a_settled_order_grants_nothing(gateway, store):
    store.payments.find_one_and_update.return_value = None  # filter excluded the settled order
    request, signature = _webhook_request({'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': 'pay_9', 'order_id': 'order_9'}}}})
    bg = MagicMock()
    assert await rp.razorpay_webhook(request, x_razorpay_signature=signature, bg=bg) == {'ok': True}
    store.users.update_one.assert_not_awaited()
    bg.add_task.assert_not_called()


@pytest.mark.asyncio
async def test_webhook_payment_failed_marks_the_order_and_emails_without_upgrading(gateway, store):
    store.payments.find_one_and_update.return_value = {'_id': 'p1', 'user_id': 'u1', 'plan_id': 'lite', 'status': 'failed'}
    request, signature = _webhook_request({'event': 'payment.failed', 'payload': {'payment': {'entity': {'id': 'pay_9', 'order_id': 'order_9'}}}})
    bg = MagicMock()
    await rp.razorpay_webhook(request, x_razorpay_signature=signature, bg=bg)
    assert store.payments.find_one_and_update.await_args.args[1]['$set']['status'] == 'failed'
    store.users.update_one.assert_not_awaited()
    assert bg.add_task.call_args.args[-1] is False


@pytest.mark.asyncio
async def test_webhook_ignores_events_without_an_order_and_unknown_events(gateway, store):
    for body in ({'event': 'payment.captured', 'payload': {}}, {'event': 'invoice.paid', 'payload': {'payment': {'entity': {'order_id': 'o'}}}}):
        request, signature = _webhook_request(body)
        assert await rp.razorpay_webhook(request, x_razorpay_signature=signature, bg=MagicMock()) == {'ok': True}
    store.payments.find_one_and_update.assert_not_awaited()


@pytest.mark.asyncio
async def test_webhook_hands_refund_events_to_the_refund_handler(gateway, store, monkeypatch):
    handler = AsyncMock()
    monkeypatch.setitem(sys.modules, 'routes_admin_refunds', types.SimpleNamespace(apply_refund_webhook=handler))
    request, signature = _webhook_request({'event': 'refund.processed', 'payload': {'refund': {'entity': {'id': 'rfnd_1'}}}})
    assert await rp.razorpay_webhook(request, x_razorpay_signature=signature, bg=MagicMock()) == {'ok': True}
    handler.assert_awaited_once_with('refund.processed', {'id': 'rfnd_1'})
    store.payments.find_one_and_update.assert_not_awaited()


# ── plans, history, invoice ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plans_are_listed_in_rupees():
    out = await rp.get_plans()
    assert out['currency'] == 'INR'
    assert {p['id']: p['amount_inr'] for p in out['plans']} == {'lite': 499, 'standard': 999, 'concierge': 1499}


@pytest.mark.asyncio
async def test_my_subscription_lists_the_callers_recent_payments(store):
    rows = [{'_id': 'p2', 'plan_id': 'standard', 'amount_inr': 999, 'status': 'paid', 'created_at': datetime(2026, 10, 2, 10, 0)},
            {'_id': 'p1', 'plan_id': 'gone-plan', 'amount_usd': 12, 'status': 'failed'}]

    async def gen():
        for r in rows:
            yield r
    cursor = MagicMock()
    cursor.sort.return_value.limit.return_value = gen()
    store.payments.find = MagicMock(return_value=cursor)

    out = await rp.my_subscription(user={**USER, 'is_premium': True, 'premium_since': datetime(2026, 10, 2)})

    store.payments.find.assert_called_once_with({'user_id': 'u1'})
    assert out['is_premium'] is True and out['premium_since'] == '2026-10-02T00:00:00'
    assert out['payments'][0] == {'id': 'p2', 'plan_id': 'standard', 'plan_name': 'Standard', 'amount_inr': 999,
                                  'status': 'paid', 'created_at': '2026-10-02T10:00:00',
                                  'kind': 'plan', 'application_id': None}
    assert out['payments'][1]['plan_name'] is None and out['payments'][1]['amount_inr'] == 12 and out['payments'][1]['created_at'] is None


@pytest.mark.asyncio
async def test_invoice_is_only_for_the_callers_own_paid_payment(store, monkeypatch):
    store.payments.find_one.return_value = None
    with pytest.raises(HTTPException) as e:
        await rp.invoice_pdf('p1', user=USER)
    assert e.value.status_code == 404
    assert store.payments.find_one.await_args.args[0] == {'_id': 'p1', 'user_id': 'u1'}

    store.payments.find_one.return_value = {'_id': 'p1', 'status': 'created'}
    with pytest.raises(HTTPException) as e:
        await rp.invoice_pdf('p1', user=USER)
    assert e.value.status_code == 400


@pytest.mark.asyncio
async def test_payment_email_failures_never_break_the_payment(monkeypatch, caplog):
    boom = types.SimpleNamespace(send_email=AsyncMock(side_effect=RuntimeError('smtp down')),
                                 build_payment_success_html=MagicMock(), build_payment_failed_html=MagicMock(return_value='<p/>'),
                                 build_subscription_activated_html=MagicMock())
    monkeypatch.setitem(sys.modules, 'email_service', boom)
    await rp._send_payment_email(USER, rp.PLANS['lite'], {'_id': 'p1', 'amount_inr': 499}, False)  # must not raise
    assert 'Failed to send payment email' in caplog.text

    boom.send_email.reset_mock()
    await rp._send_payment_email({'_id': 'u2'}, rp.PLANS['lite'], {'_id': 'p1'}, True)  # no email address: nothing to send
    boom.send_email.assert_not_awaited()
