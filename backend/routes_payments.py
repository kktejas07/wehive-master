"""Razorpay payment integration with mock bypass mode."""

from __future__ import annotations

import io
import hashlib
import hmac
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth_utils import get_current_user
from db import db, users, payments

router = APIRouter(prefix='/payments', tags=['payments'])

PAYMENT_BYPASS_ENABLED = os.environ.get('PAYMENT_BYPASS_ENABLED', '').lower() in ('1', 'true', 'yes')

PLANS = {
    'lite': {'name': 'Lite', 'amount_usd': 399, 'description': 'One visa application with expert review'},
    'standard': {'name': 'Standard', 'amount_usd': 799, 'description': 'Most popular — priority support, on-time guarantee'},
    'concierge': {'name': 'Concierge', 'amount_usd': 1099, 'description': 'Dedicated specialist, 24/7 phone support'},
}


async def _get_razorpay():
    from settings_service import get_razorpay_keys
    try:
        key_id, key_secret, _ = await get_razorpay_keys()
        if not key_id or not key_secret:
            return None
        import razorpay
        client = razorpay.Client(auth=(key_id, key_secret))
        return client
    except Exception:
        return None


class CreateOrderRequest(BaseModel):
    plan_id: str


class OrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    plan_id: str
    razorpay_key: str


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str


@router.post('/create-order', response_model=OrderResponse)
async def create_order(req: CreateOrderRequest, user=Depends(get_current_user)):
    from settings_service import get_razorpay_keys

    plan = PLANS.get(req.plan_id)
    if not plan:
        raise HTTPException(400, 'Invalid plan_id')

    if PAYMENT_BYPASS_ENABLED:
        mock_order_id = f"mock-{uuid.uuid4().hex[:16]}"
        payment_doc = {
            '_id': str(uuid.uuid4()),
            'user_id': user['_id'],
            'plan_id': req.plan_id,
            'razorpay_order_id': mock_order_id,
            'razorpay_payment_id': None,
            'amount_usd': plan['amount_usd'],
            'status': 'mock',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        await payments.insert_one(payment_doc)
        return {
            'order_id': mock_order_id,
            'amount': plan['amount_usd'],
            'currency': 'USD',
            'plan_id': req.plan_id,
            'razorpay_key': 'mock',
        }

    key_id, _, _ = await get_razorpay_keys()
    if not key_id:
        raise HTTPException(503, 'Payment gateway not configured — set Razorpay keys in admin Settings')

    client = await _get_razorpay()
    if not client:
        raise HTTPException(503, 'Payment gateway unavailable')

    amount_cents = plan['amount_usd']
    receipt = f"wehive-{user['_id']}-{req.plan_id}-{uuid.uuid4().hex[:8]}"

    try:
        order = client.order.create({
            'amount': amount_cents,
            'currency': 'USD',
            'receipt': receipt,
            'notes': {
                'user_id': user['_id'],
                'plan_id': req.plan_id,
                'user_email': user.get('email') or '',
            },
        })
    except Exception as e:
        raise HTTPException(502, f'Failed to create order: {e}')

    payment_doc = {
        '_id': str(uuid.uuid4()),
        'user_id': user['_id'],
        'plan_id': req.plan_id,
        'razorpay_order_id': order.get('id'),
        'razorpay_payment_id': None,
        'amount_usd': plan['amount_usd'],
        'status': 'created',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    await payments.insert_one(payment_doc)

    return {
        'order_id': order.get('id'),
        'amount': plan['amount_usd'],
        'currency': 'USD',
        'plan_id': req.plan_id,
        'razorpay_key': key_id,
    }


@router.post('/verify')
async def verify_payment(req: VerifyRequest, user=Depends(get_current_user)):
    from settings_service import get_razorpay_keys

    plan = PLANS.get(req.plan_id)
    if not plan:
        raise HTTPException(400, 'Invalid plan_id')

    doc = await payments.find_one({'razorpay_order_id': req.razorpay_order_id, 'user_id': user['_id']})
    if not doc:
        raise HTTPException(404, 'Order not found')
    if doc.get('status') == 'paid':
        return {'ok': True, 'is_premium': True, 'message': 'Already upgraded'}

    if doc.get('status') == 'mock' or (req.razorpay_order_id or '').startswith('mock-'):
        now = datetime.utcnow()
        await payments.update_one(
            {'_id': doc['_id']},
            {'$set': {
                'razorpay_payment_id': req.razorpay_payment_id or f"mock-pay-{uuid.uuid4().hex[:12]}",
                'status': 'paid',
                'updated_at': now,
            }}
        )
        await users.update_one(
            {'_id': user['_id']},
            {'$set': {'is_premium': True, 'premium_since': now, 'updated_at': now}}
        )
        return {
            'ok': True,
            'is_premium': True,
            'premium_since': now.isoformat(),
            'plan': plan['name'],
        }

    _, key_secret, _ = await get_razorpay_keys()
    if not key_secret:
        raise HTTPException(503, 'Payment gateway not configured')

    payload = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    generated = hmac.new(
        key_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(generated, req.razorpay_signature):
        raise HTTPException(400, 'Invalid signature')

    now = datetime.utcnow()
    await payments.update_one(
        {'_id': doc['_id']},
        {'$set': {
            'razorpay_payment_id': req.razorpay_payment_id,
            'status': 'paid',
            'updated_at': now,
        }}
    )
    await users.update_one(
        {'_id': user['_id']},
        {'$set': {'is_premium': True, 'premium_since': now, 'updated_at': now}}
    )

    return {
        'ok': True,
        'is_premium': True,
        'premium_since': now.isoformat(),
        'plan': plan['name'],
    }


@router.post('/webhook')
async def razorpay_webhook(payload: dict, x_razorpay_signature: str = Header(None)):
    """Razorpay sends this when a payment succeeds or fails."""
    from settings_service import get_razorpay_keys

    _, _, webhook_secret = await get_razorpay_keys()
    if not webhook_secret:
        raise HTTPException(503, 'Webhook not configured')

    if x_razorpay_signature:
        digest = hmac.new(
            webhook_secret.encode(),
            str(payload).encode(),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(digest, x_razorpay_signature):
            raise HTTPException(400, 'Invalid webhook signature')

    event = payload.get('event', '')
    payload_data = payload.get('payload', {})
    order = payload_data.get('order', {})
    order_id = order.get('entity', {}).get('receipt') or ''
    payment_id = payload_data.get('payment', {}).get('entity', {}).get('id')

    if event in ('payment.success', 'order.paid'):
        doc = await payments.find_one_and_update(
            {'razorpay_order_id': order_id},
            {'$set': {
                'razorpay_payment_id': payment_id,
                'status': 'paid',
                'updated_at': datetime.utcnow(),
            }},
            return_document=True,
        )
        if doc:
            await users.update_one(
                {'_id': doc['user_id']},
                {'$set': {
                    'is_premium': True,
                    'premium_since': datetime.utcnow(),
                }}
            )
    elif event == 'payment.failed':
        await payments.update_one(
            {'razorpay_order_id': order_id},
            {'$set': {'status': 'failed', 'updated_at': datetime.utcnow()}}
        )

    return {'ok': True}


@router.get('/plans')
async def get_plans():
    return {
        'plans': [
            {'id': k, 'name': v['name'], 'amount_usd': v['amount_usd'], 'description': v['description']}
            for k, v in PLANS.items()
        ],
        'currency': 'USD',
    }


@router.get('/my-subscription')
async def my_subscription(user=Depends(get_current_user)):
    payments_list = []
    async for p in payments.find({'user_id': user['_id']}).sort('created_at', -1).limit(5):
        payments_list.append({
            'id': p['_id'],
            'plan_id': p.get('plan_id'),
            'amount_usd': p.get('amount_usd'),
            'status': p.get('status'),
            'created_at': p.get('created_at').isoformat() if p.get('created_at') else None,
        })
    return {
        'is_premium': user.get('is_premium', False),
        'premium_since': user.get('premium_since').isoformat() if user.get('premium_since') else None,
        'payments': payments_list,
    }


# ---------- Invoice PDF ----------

@router.get('/invoice/{payment_id}.pdf')
async def invoice_pdf(payment_id: str, user=Depends(get_current_user)):
    """Download a payment invoice as PDF."""
    from agents.pdf_agent import generate_invoice_pdf

    payment = await payments.find_one({'_id': payment_id, 'user_id': user['_id']})
    if not payment:
        raise HTTPException(404, 'Payment not found')
    if payment.get('status') != 'paid':
        raise HTTPException(400, 'Cannot generate invoice for unpaid payment')

    plan = PLANS.get(payment.get('plan_id', ''), {})
    pdf_bytes = generate_invoice_pdf(
        invoice_id=payment_id[:8].upper(),
        customer_name=user.get('name', 'Customer'),
        customer_email=user.get('email', ''),
        items=[{'name': plan.get('name', 'Service'), 'amount': payment.get('amount_usd', 0)}],
        amount_paid=payment.get('amount_usd', 0),
        payment_method='Razorpay',
    )
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="wehive-invoice-{payment_id[:8]}.pdf"'},
    )