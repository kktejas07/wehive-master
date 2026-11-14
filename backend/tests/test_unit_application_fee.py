"""Visa application fee at submit, plus the small fixes shipped with it.

The fee charged is the "to be paid now" amount: embassy fee + appointment fee per
applicant, computed on the server.
"""
import hashlib
import hmac
import os
import sys
import types
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import routes_application_fee as fee  # noqa: E402
import routes_payments as rp  # noqa: E402
import application_status_answer as status_answer  # noqa: E402

USER = {'_id': 'u1', 'email': 'priya@example.com', 'name': 'Priya'}
JAPAN = {'id': 'jp', 'name': 'Japan', 'requires_appointment': True, 'appointment_fee_inr': 1800,
         'categories': {'Tourist': {'fees_inr': 8000}}}
PRICING = {'base_fees': {'Tourist': 3500}, 'surcharge_inr': 350, 'gst_rate': 0.18}


class Col:
    """Just enough of a Mongo collection: equality filters and $set."""

    def __init__(self, *docs):
        self.docs = [dict(d) for d in docs]

    def _match(self, d, q):
        for k, v in q.items():
            if isinstance(v, dict) and '$nin' in v:
                if d.get(k) in v['$nin']:
                    return False
            elif d.get(k) != v:
                return False
        return True

    async def find_one(self, q, *_):
        return next((dict(d) for d in self.docs if self._match(d, q)), None)

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, q, upd):
        for d in self.docs:
            if self._match(d, q):
                d.update(upd['$set'])
                return MagicMock(modified_count=1)
        return MagicMock(modified_count=0)

    def find(self, q):
        rows = [dict(d) for d in self.docs if self._match(d, q)]
        cur = MagicMock()
        cur.sort.return_value = cur
        cur.to_list = AsyncMock(return_value=rows)
        return cur


@pytest.fixture
def world(monkeypatch):
    apps = Col({'_id': 'app-12345678', 'user_id': 'u1', 'country_id': 'jp', 'visa_type': 'Tourist',
                'applicants': 2, 'status': 'draft', 'timeline': []})
    pays = Col()
    monkeypatch.setattr(fee, 'applications', apps)
    monkeypatch.setattr(fee, 'payments', pays)
    monkeypatch.setattr(fee, 'countries_v2', Col(JAPAN))
    monkeypatch.setattr(fee, 'load_pricing', AsyncMock(return_value=PRICING))
    monkeypatch.setattr(rp, 'PAYMENT_BYPASS_ENABLED', False)
    keys = AsyncMock(return_value=('rzp_key', 'secret', 'whsec'))
    monkeypatch.setitem(sys.modules, 'settings_service', types.SimpleNamespace(get_razorpay_keys=keys))
    monkeypatch.setitem(sys.modules, 'notify', types.SimpleNamespace(notify_user=AsyncMock()))
    return types.SimpleNamespace(apps=apps, pays=pays, keys=keys)


async def _app(world):
    return await world.apps.find_one({'_id': 'app-12345678'})


# ── what is charged ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pay_now_is_embassy_plus_appointment_fee_per_applicant(world):
    q = await fee.fee_quote(await _app(world))
    assert q['pay_now_inr'] == (8000 + 1800) * 2
    # Service fee, GST and the extra-applicant surcharge are due later, not at submit.
    assert q['pay_later_inr'] == 3500 * 2 + round((3500 * 2 + 1800 * 2) * 0.18) + 350
    assert q['total_inr'] == q['pay_now_inr'] + q['pay_later_inr']


@pytest.mark.asyncio
async def test_nothing_is_due_for_a_visa_free_country_or_an_unknown_one(world, monkeypatch):
    monkeypatch.setattr(fee, 'countries_v2', Col({**JAPAN, 'no_visa': True}))
    assert await fee.fee_due_inr(await _app(world)) == 0
    monkeypatch.setattr(fee, 'countries_v2', Col())
    assert await fee.fee_due_inr(await _app(world)) == 0


@pytest.mark.asyncio
async def test_nothing_is_due_online_when_no_gateway_is_configured(world):
    world.keys.return_value = ('', '', '')
    assert await fee.fee_due_inr(await _app(world)) == 0
    with pytest.raises(HTTPException) as e:
        await fee.create_order('app-12345678', user=USER)
    assert e.value.status_code == 503


# ── order and verify ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_order_amount_comes_from_the_server_in_paise(world, monkeypatch):
    client = MagicMock()
    client.order.create.return_value = {'id': 'order_9'}
    monkeypatch.setattr(rp, '_get_razorpay', AsyncMock(return_value=client))
    out = await fee.create_order('app-12345678', user=USER)
    assert out['amount'] == 19600 * 100 and out['razorpay_key'] == 'rzp_key'
    assert client.order.create.call_args.args[0]['amount'] == 19600 * 100
    saved = world.pays.docs[0]
    assert (saved['kind'], saved['application_id'], saved['amount_inr'], saved['status']) == (
        'application_fee', 'app-12345678', 19600, 'created')


@pytest.mark.asyncio
async def test_someone_elses_application_cannot_be_quoted_or_paid(world):
    with pytest.raises(HTTPException) as e:
        await fee.create_order('app-12345678', user={'_id': 'intruder'})
    assert e.value.status_code == 404


@pytest.mark.asyncio
async def test_a_valid_signature_marks_the_application_fee_paid_once(world):
    world.pays.docs.append({'_id': 'p1', 'user_id': 'u1', 'kind': 'application_fee', 'application_id': 'app-12345678',
                            'razorpay_order_id': 'order_9', 'amount_inr': 19600, 'status': 'created'})
    sig = hmac.new(b'secret', b'order_9|pay_9', hashlib.sha256).hexdigest()
    out = await fee.verify(fee.VerifyFee(razorpay_order_id='order_9', razorpay_payment_id='pay_9', razorpay_signature=sig), user=USER)
    assert out['paid'] is True
    app = await _app(world)
    assert app['fee']['status'] == 'paid' and app['fee']['amount_inr'] == 19600
    assert app['timeline'][-1]['label'] == 'Application fee received'
    assert await fee.fee_due_inr(app) == 0
    # Paying again is refused, and verifying again adds nothing.
    with pytest.raises(HTTPException) as e:
        await fee.create_order('app-12345678', user=USER)
    assert e.value.status_code == 409
    await fee.verify(fee.VerifyFee(razorpay_order_id='order_9', razorpay_payment_id='pay_9', razorpay_signature=sig), user=USER)
    assert len((await _app(world))['timeline']) == 1


@pytest.mark.asyncio
async def test_a_forged_signature_fails_the_order_and_leaves_the_fee_unpaid(world):
    world.pays.docs.append({'_id': 'p1', 'user_id': 'u1', 'kind': 'application_fee', 'application_id': 'app-12345678',
                            'razorpay_order_id': 'order_9', 'amount_inr': 19600, 'status': 'created'})
    with pytest.raises(HTTPException) as e:
        await fee.verify(fee.VerifyFee(razorpay_order_id='order_9', razorpay_payment_id='pay_9', razorpay_signature='forged'), user=USER)
    assert e.value.status_code == 400
    assert world.pays.docs[0]['status'] == 'failed'
    assert 'fee' not in await _app(world)


@pytest.mark.asyncio
async def test_a_mock_order_is_only_redeemable_with_the_dev_bypass(world, monkeypatch):
    monkeypatch.setattr(rp, 'PAYMENT_BYPASS_ENABLED', True)
    out = await fee.create_order('app-12345678', user=USER)
    assert out['razorpay_key'] == 'mock'
    monkeypatch.setattr(rp, 'PAYMENT_BYPASS_ENABLED', False)
    with pytest.raises(HTTPException) as e:
        await fee.verify(fee.VerifyFee(razorpay_order_id=out['order_id']), user=USER)
    assert e.value.status_code == 400
    monkeypatch.setattr(rp, 'PAYMENT_BYPASS_ENABLED', True)
    assert (await fee.verify(fee.VerifyFee(razorpay_order_id=out['order_id']), user=USER))['paid'] is True


@pytest.mark.asyncio
async def test_an_application_fee_order_cannot_be_redeemed_as_a_premium_plan(world, monkeypatch):
    doc = {'_id': 'p1', 'user_id': 'u1', 'kind': 'application_fee', 'plan_id': 'application_fee',
           'razorpay_order_id': 'order_9', 'amount_inr': 19600, 'status': 'created'}
    users = MagicMock(update_one=AsyncMock())
    monkeypatch.setattr(rp, 'payments', MagicMock(find_one=AsyncMock(return_value=doc)))
    monkeypatch.setattr(rp, 'users', users)
    with pytest.raises(HTTPException) as e:
        await rp.verify_payment(rp.VerifyRequest(razorpay_order_id='order_9', razorpay_payment_id='pay_9',
                                                 razorpay_signature='x', plan_id='concierge'), user=USER, bg=MagicMock())
    assert e.value.status_code == 400
    users.update_one.assert_not_awaited()


# ── submit ────────────────────────────────────────────────────────────────────

@pytest.fixture
def submit(monkeypatch, world):
    import routes_apps
    app = {'_id': 'app-12345678', 'user_id': 'u1', 'country_id': 'jp', 'visa_type': 'Tourist', 'applicants': 1,
           'status': 'draft', 'documents': [{'doc_type': 'passport'}], 'timeline': []}
    world.apps.docs[:] = [app]
    async def own_app(*_):
        return await world.apps.find_one({'_id': 'app-12345678'})
    monkeypatch.setattr(routes_apps, '_get_app_for_user', own_app)
    monkeypatch.setattr(routes_apps, '_build_doc_report', lambda *_: {'missing_docs': []})
    monkeypatch.setattr(routes_apps, 'applications', world.apps)
    monkeypatch.setattr(routes_apps, 'notify_status_change', AsyncMock())
    return routes_apps


@pytest.mark.asyncio
async def test_submit_is_refused_with_the_amount_until_the_fee_is_paid(submit, world):
    with pytest.raises(HTTPException) as e:
        await submit.submit_application('app-12345678', user=USER)
    assert e.value.status_code == 402 and e.value.detail['amount_inr'] == 9800
    assert (await _app(world))['status'] == 'draft'

    await world.apps.update_one({'_id': 'app-12345678'}, {'$set': {'fee': {'status': 'paid', 'amount_inr': 9800}}})
    assert (await submit.submit_application('app-12345678', user=USER))['status'] == 'submitted'
    assert (await _app(world))['fee']['status'] == 'paid'


@pytest.mark.asyncio
async def test_without_a_gateway_submit_goes_through_and_records_the_fee_as_due(submit, world):
    world.keys.return_value = ('', '', '')
    await submit.submit_application('app-12345678', user=USER)
    app = await _app(world)
    assert app['status'] == 'submitted' and app['fee'] == {'status': 'due', 'amount_inr': 9800}


# ── webhook ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_webhook_for_an_application_fee_settles_the_application_and_grants_no_premium(world, monkeypatch):
    import json
    doc = {'_id': 'p1', 'user_id': 'u1', 'kind': 'application_fee', 'application_id': 'app-12345678',
           'razorpay_order_id': 'order_9', 'amount_inr': 19600, 'status': 'paid'}
    users = MagicMock(update_one=AsyncMock(), find_one=AsyncMock(return_value=USER))
    monkeypatch.setattr(rp, 'payments', MagicMock(find_one_and_update=AsyncMock(return_value=doc)))
    monkeypatch.setattr(rp, 'users', users)
    raw = json.dumps({'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': 'pay_9', 'order_id': 'order_9'}}}}).encode()
    sig = hmac.new(b'whsec', raw, hashlib.sha256).hexdigest()
    await rp.razorpay_webhook(MagicMock(body=AsyncMock(return_value=raw)), x_razorpay_signature=sig, bg=MagicMock())
    users.update_one.assert_not_awaited()
    assert (await _app(world))['fee']['status'] == 'paid'


def test_fee_payments_get_a_readable_name_on_invoices_and_lists():
    assert rp._item_name({'kind': 'application_fee', 'application_id': 'app-12345678'}) == 'Visa application fee (#APP-1234)'
    assert rp._item_name({}) == 'Service'


# ── Hive: "what is my application status?" ────────────────────────────────────

@pytest.mark.parametrize('text,expected', [
    ('What is my application status?', True),
    ('where is my visa application', True),
    ('has my application been approved yet', True),
    ('track my application', True),
    ('What documents do I need for a Japan tourist visa?', False),
    ('How much is the application fee for Canada?', False),
])
def test_status_questions_are_recognised(text, expected):
    assert status_answer.is_status_question(text) is expected


@pytest.mark.asyncio
async def test_status_answer_lists_the_users_own_applications(monkeypatch):
    apps = Col({'_id': 'abcdef12-0000', 'user_id': 'u1', 'country_id': 'jp', 'visa_type': 'Tourist', 'status': 'in_review',
                'timeline': [{'note': 'A consultant is checking your bank statement.'}], 'visa_appointment': {'date': '2026-12-01'}},
               {'_id': 'zzzz', 'user_id': 'someone-else', 'country_id': 'jp', 'status': 'approved'})
    monkeypatch.setattr(status_answer, 'applications', apps)
    monkeypatch.setattr(status_answer, 'countries', Col(JAPAN))
    text = await status_answer.status_answer(USER)
    assert 'Japan Tourist' in text and '#ABCDEF12' in text and 'In review' in text
    assert 'bank statement' in text and '2026-12-01' in text
    assert 'ZZZZ' not in text
    assert 'Sign in' in await status_answer.status_answer(None)
    monkeypatch.setattr(status_answer, 'applications', Col())
    assert "don't have any applications" in await status_answer.status_answer(USER)


# ── tracker, auto-reply, appointment date ─────────────────────────────────────

@pytest.mark.asyncio
async def test_tracker_accepts_the_short_reference_shown_on_the_site(monkeypatch):
    import routes_public
    full = 'abcdef12-3456-7890-abcd-ef1234567890'
    app = {'_id': full, 'country_id': 'jp', 'status': 'submitted'}

    def find(q):
        cur = MagicMock()
        cur.to_list = AsyncMock(return_value=[app] if q['_id']['$regex'] == '^abcdef12' else [])
        return cur
    col = MagicMock(find_one=AsyncMock(side_effect=lambda q: app if q['_id'] == full else None), find=find)
    monkeypatch.setattr(routes_public, 'applications_col', col)
    monkeypatch.setattr(routes_public, 'countries_col', MagicMock(find_one=AsyncMock(return_value={'name': 'Japan'})))
    assert (await routes_public.track_application('#ABCDEF12'))['id'] == full
    assert (await routes_public.track_application(full))['country_name'] == 'Japan'
    for bad in ('abcdef1', 'not-a-ref', '00000000'):
        with pytest.raises(HTTPException) as e:
            await routes_public.track_application(bad)
        assert e.value.status_code == 404


@pytest.mark.asyncio
async def test_tracker_refuses_a_short_reference_that_matches_two_applications(monkeypatch):
    import routes_public
    cur = MagicMock(to_list=AsyncMock(return_value=[{'_id': 'abcdef12-1'}, {'_id': 'abcdef12-2'}]))
    monkeypatch.setattr(routes_public, 'applications_col', MagicMock(find_one=AsyncMock(return_value=None), find=lambda q: cur))
    with pytest.raises(HTTPException):
        await routes_public.track_application('abcdef12')


@pytest.mark.asyncio
async def test_the_auto_reply_is_labelled_automatic_and_not_repeated(monkeypatch):
    import routes_apps
    app = {'_id': 'a1', 'user_id': 'u1', 'messages': []}
    pushed = []

    async def update_one(q, upd):
        new = upd['$push']['messages']['$each']
        pushed.append(new)
        app['messages'].extend(new)
    monkeypatch.setattr(routes_apps, '_get_app_for_user', AsyncMock(side_effect=lambda *_: dict(app, messages=list(app['messages']))))
    monkeypatch.setattr(routes_apps, 'applications', MagicMock(update_one=update_one))
    first = await routes_apps.post_message('a1', routes_apps._MessageRequest(text='Hello'), user=USER)
    assert len(first) == 2 and pushed[0][1]['auto'] is True
    assert 'Automatic reply' in pushed[0][1]['name'] and 'Kiran' not in pushed[0][1]['name']
    second = await routes_apps.post_message('a1', routes_apps._MessageRequest(text='Any update?'), user=USER)
    assert len(second) == 1


@pytest.mark.asyncio
async def test_admin_can_set_and_clear_the_appointment_date(monkeypatch):
    import routes_admin
    app = {'_id': 'a1', 'user_id': 'u1', 'status': 'in_review', 'timeline': [], 'visa_appointment': {'embassy': 'Tokyo'}}
    apps = MagicMock(find_one=AsyncMock(return_value=app), update_one=AsyncMock())
    monkeypatch.setattr(routes_admin, 'applications', apps)
    monkeypatch.setattr(routes_admin, 'audit_record', AsyncMock())
    await routes_admin.admin_update_application('a1', routes_admin.AppPatch(appointment_date='2026-12-01'), admin={'email': 'a@b.c'})
    update = apps.update_one.await_args.args[1]['$set']
    assert update['visa_appointment'] == {'embassy': 'Tokyo', 'date': '2026-12-01'}
    assert update['timeline'][-1]['label'] == 'Appointment date updated'
    with pytest.raises(ValueError):
        routes_admin.AppPatch(appointment_date='next tuesday')


def test_the_checklist_and_greeting_no_longer_disagree():
    from agents.document_validator import REQUIRED_DOCS, get_required_doc_types
    import local_llm
    assert 'Bank statements (6 months)' in REQUIRED_DOCS['tourist']
    assert len(get_required_doc_types('Tourist', 'IN')) == 8
    assert 'Ballari' not in local_llm.GREETINGS[0]


@pytest.mark.asyncio
async def test_refunding_an_application_fee_marks_the_application_and_leaves_premium_alone(monkeypatch):
    import db
    import routes_admin_refunds as refunds
    p = {'_id': 'p1', 'user_id': 'u1', 'kind': 'application_fee', 'application_id': 'app-12345678',
         'status': 'paid', 'amount_inr': 9800, 'razorpay_payment_id': 'pay_abc'}
    after = {**p, 'status': 'refunded', 'refunded_inr': 9800, 'refunds': []}
    monkeypatch.setattr(refunds, 'payments', MagicMock(find_one_and_update=AsyncMock(return_value=p), update_one=AsyncMock(),
                                                       find_one=AsyncMock(return_value=after)))
    users = MagicMock(update_one=AsyncMock(), find_one=AsyncMock(return_value={'_id': 'u1', 'email': 'u@x.com'}))
    monkeypatch.setattr(refunds, 'users', users)
    apps = MagicMock(update_one=AsyncMock())
    monkeypatch.setattr(db, 'applications', apps)
    monkeypatch.setattr(refunds, '_razorpay_refund', AsyncMock(return_value={'id': 'rfnd_1', 'status': 'processed'}))
    monkeypatch.setattr(refunds, 'audit_record', AsyncMock())
    out = await refunds.admin_refund('p1', refunds.RefundBody(reason='customer cancelled', revoke_premium=True), MagicMock(),
                                     admin={'_id': 'a', 'email': 'a@x.com'})
    assert out['premium_revoked'] is False
    users.update_one.assert_not_awaited()
    query, update = apps.update_one.await_args.args
    assert query == {'_id': 'app-12345678', 'fee.payment_id': 'p1'} and update['$set']['fee.status'] == 'refunded'
