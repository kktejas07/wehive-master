"""Visa application fee, paid when the applicant submits.

What is charged is the "to be paid now" amount shown on the visa page: the embassy
(government) fee plus any appointment fee, per applicant. The We Hive service fee and
GST are due later, on delivery, and are not collected here.

The amount is always computed on the server from the application and the country
data; nothing the client sends decides it.
"""
import hashlib
import hmac
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user
from db import applications, countries_v2, payments
from fee_calculator import compute_fees
from pricing import load_pricing

router = APIRouter(prefix='/payments/application', tags=['payments'])
logger = logging.getLogger('wehive.payments')

KIND = 'application_fee'


async def _gateway() -> str:
    """'mock' (dev bypass), 'razorpay', or '' when no gateway is configured."""
    import routes_payments
    if routes_payments.PAYMENT_BYPASS_ENABLED:
        return 'mock'
    from settings_service import get_razorpay_keys
    try:
        key_id, key_secret, _ = await get_razorpay_keys()
    except Exception:
        logger.warning('Could not read Razorpay keys', exc_info=True)
        return ''
    return 'razorpay' if key_id and key_secret else ''


async def fee_quote(app: dict) -> dict:
    """Fee split for one application, in whole rupees."""
    visa_type = app.get('visa_type') or 'Tourist'
    country = await countries_v2.find_one({'id': app.get('country_id')}) if app.get('country_id') else None
    govt = appt = 0
    requires_appt = False
    if country and not country.get('no_visa'):
        cats = country.get('categories') or {}
        if isinstance(cats, dict):
            cat = cats.get(visa_type) or next(
                (v for k, v in cats.items() if str(k).lower() == visa_type.lower()), None)
        else:
            cat = next((c for c in cats if str(c.get('type') or c.get('name') or '').lower() == visa_type.lower()), None)
        if isinstance(cat, dict):
            govt = int(cat.get('fees_inr') or 0)
        requires_appt = bool(country.get('requires_appointment'))
        if requires_appt:
            appt = int(country.get('appointment_fee_inr') or 0)
    pricing = await load_pricing()
    fees = compute_fees(
        applicants=max(1, int(app.get('applicants') or 1)),
        visa_type=visa_type,
        govt_fee_inr=govt,
        requires_appointment=requires_appt,
        appointment_fee_inr=appt,
        base_fees_override=pricing['base_fees'],
        surcharge_inr=pricing['surcharge_inr'],
        gst_rate=pricing['gst_rate'],
    )
    pay_now = fees['govt'] + fees['appointment']
    return {
        'applicants': fees['applicants'],
        'embassy_fee_inr': fees['govt'],
        'appointment_fee_inr': fees['appointment'],
        'pay_now_inr': pay_now,
        'pay_later_inr': fees['total'] - pay_now,
        'total_inr': fees['total'],
        'currency': 'INR',
    }


def fee_paid(app: dict) -> bool:
    return (app.get('fee') or {}).get('status') == 'paid'


async def fee_due_inr(app: dict) -> int:
    """Rupees that must be paid before this application can be submitted (0 = nothing).

    When no payment gateway is configured the applicant cannot pay online, so nothing is
    due here: the application goes through and is flagged for the team to collect.
    """
    if fee_paid(app):
        return 0
    amount = (await fee_quote(app))['pay_now_inr']
    return amount if amount > 0 and await _gateway() else 0


async def mark_fee_paid(payment: dict) -> None:
    """Record a settled application-fee payment on its application. Safe to call twice."""
    app = await applications.find_one({'_id': payment.get('application_id')})
    if not app or fee_paid(app):
        return
    now = datetime.utcnow()
    amount = int(payment.get('amount_inr') or 0)
    events = list(app.get('timeline') or [])
    events.append({'id': str(uuid.uuid4()), 'status': app.get('status') or 'draft', 'label': 'Application fee received',
                   'at': now, 'note': f'₹{amount:,} paid (embassy and appointment fees).'})
    await applications.update_one({'_id': app['_id']}, {'$set': {
        'fee': {'status': 'paid', 'amount_inr': amount, 'payment_id': payment['_id'], 'paid_at': now},
        'timeline': events, 'updated_at': now,
    }})
    try:
        from notify import notify_user
        await notify_user(
            app['user_id'], title='Application fee received',
            body=f'We received ₹{amount:,} for application #{str(app["_id"])[:8].upper()}. You can submit it now.',
            kind='payment', link=f"/account/applications/{app['_id']}", application_id=app['_id'],
            dedupe_key=f"fee-paid-{payment['_id']}",
        )
    except Exception:
        logger.warning('Fee receipt notification failed for %s', app['_id'], exc_info=True)


async def _own_app(application_id: str, user: dict) -> dict:
    app = await applications.find_one({'_id': application_id, 'user_id': user['_id']})
    if not app:
        raise HTTPException(404, 'Application not found')
    return app


@router.get('/{application_id}/quote')
async def quote(application_id: str, user=Depends(get_current_user)):
    app = await _own_app(application_id, user)
    q = await fee_quote(app)
    paid = fee_paid(app)
    return {
        **q,
        'paid': paid,
        'paid_inr': (app.get('fee') or {}).get('amount_inr', 0) if paid else 0,
        'due_now_inr': await fee_due_inr(app),
        'online_payment': bool(await _gateway()),
    }


@router.post('/{application_id}/create-order')
async def create_order(application_id: str, user=Depends(get_current_user)):
    app = await _own_app(application_id, user)
    if fee_paid(app):
        raise HTTPException(409, 'The fee for this application is already paid')
    amount = (await fee_quote(app))['pay_now_inr']
    if amount <= 0:
        raise HTTPException(400, 'No fee is due for this application')
    gateway = await _gateway()
    if not gateway:
        raise HTTPException(503, 'Online payment is not available right now')

    now = datetime.utcnow()
    doc = {
        '_id': str(uuid.uuid4()), 'user_id': user['_id'], 'kind': KIND, 'plan_id': KIND,
        'application_id': application_id, 'razorpay_payment_id': None, 'amount_inr': amount,
        'created_at': now, 'updated_at': now,
    }
    if gateway == 'mock':
        doc.update(razorpay_order_id=f'mock-{uuid.uuid4().hex[:16]}', status='mock')
        key = 'mock'
    else:
        import routes_payments
        from settings_service import get_razorpay_keys
        key, _, _ = await get_razorpay_keys()
        client = await routes_payments._get_razorpay()
        if not client:
            raise HTTPException(503, 'Payment gateway unavailable')
        try:
            order = client.order.create({
                'amount': amount * 100, 'currency': 'INR',
                'receipt': f'wehive-app-{application_id[:8]}-{uuid.uuid4().hex[:8]}',
                'notes': {'user_id': user['_id'], 'kind': KIND, 'application_id': application_id},
            })
        except Exception:
            logger.exception('Razorpay order creation failed (application fee)')
            raise HTTPException(502, 'Failed to create order')
        doc.update(razorpay_order_id=order.get('id'), status='created')
    await payments.insert_one(doc)
    return {'order_id': doc['razorpay_order_id'], 'amount': amount * 100, 'amount_inr': amount,
            'currency': 'INR', 'razorpay_key': key, 'application_id': application_id}


class VerifyFee(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str = ''
    razorpay_signature: str = ''


@router.post('/verify')
async def verify(req: VerifyFee, user=Depends(get_current_user)):
    import routes_payments
    doc = await payments.find_one({'razorpay_order_id': req.razorpay_order_id, 'user_id': user['_id'], 'kind': KIND})
    if not doc:
        raise HTTPException(404, 'Order not found')
    if doc.get('status') == 'paid':
        await mark_fee_paid(doc)
        return {'ok': True, 'paid': True, 'amount_inr': doc.get('amount_inr')}
    if doc.get('status') in routes_payments.SETTLED:
        raise HTTPException(409, 'This payment was refunded. Start a new payment.')

    if doc.get('status') == 'mock':
        if not routes_payments.PAYMENT_BYPASS_ENABLED:
            raise HTTPException(400, 'Mock orders cannot be redeemed')
        payment_id = req.razorpay_payment_id or f'mock-pay-{uuid.uuid4().hex[:12]}'
    else:
        from settings_service import get_razorpay_keys
        _, key_secret, _ = await get_razorpay_keys()
        if not key_secret:
            raise HTTPException(503, 'Payment gateway not configured')
        expected = hmac.new(key_secret.encode(), f'{req.razorpay_order_id}|{req.razorpay_payment_id}'.encode(),
                            hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, req.razorpay_signature):
            await payments.update_one(
                {'_id': doc['_id'], 'status': {'$nin': list(routes_payments.SETTLED)}},
                {'$set': {'status': 'failed', 'razorpay_payment_id': req.razorpay_payment_id, 'updated_at': datetime.utcnow()}})
            raise HTTPException(400, 'Invalid signature')
        payment_id = req.razorpay_payment_id

    await payments.update_one(
        {'_id': doc['_id'], 'status': {'$nin': list(routes_payments.SETTLED)}},
        {'$set': {'razorpay_payment_id': payment_id, 'status': 'paid', 'updated_at': datetime.utcnow()}})
    fresh = await payments.find_one({'_id': doc['_id']})
    if fresh.get('status') != 'paid':
        raise HTTPException(409, 'This payment was refunded. Start a new payment.')
    await mark_fee_paid(fresh)
    return {'ok': True, 'paid': True, 'amount_inr': fresh.get('amount_inr'), 'payment_id': fresh['_id']}
