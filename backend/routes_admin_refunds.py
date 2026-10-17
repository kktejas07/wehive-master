"""Admin refunds (super admin only) through Razorpay.

  POST /api/admin/payments/{id}/refund   — full or partial refund, reason required

A payment is locked while its refund is in flight so two clicks can't refund twice, and the amount
can never exceed what is left unrefunded. Razorpay's refund.processed / refund.failed webhooks
update the refund entry later (see routes_payments.razorpay_webhook).
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from admin_auth import get_super_admin
from audit import record as audit_record
from config import IS_DEV
from db import payments, users

logger = logging.getLogger('wehive.refunds')
router = APIRouter(prefix='/admin', tags=['admin-refunds'])

REFUNDABLE = ('paid', 'partially_refunded')
REFUNDED_STATES = ('refunded', 'partially_refunded')
LOCK_TTL = timedelta(minutes=2)


class RefundBody(BaseModel):
    amount_inr: Optional[int] = Field(default=None, gt=0, description='Omit for a full refund of what is left')
    reason: str = Field(min_length=3, max_length=500)
    revoke_premium: bool = True


def refundable_inr(p: dict) -> int:
    return max(0, int(p.get('amount_inr') or 0) - int(p.get('refunded_inr') or 0))


def _out(p: dict) -> dict:
    return {
        'id': p['_id'],
        'status': p.get('status'),
        'amount_inr': p.get('amount_inr', 0),
        'refunded_inr': p.get('refunded_inr', 0),
        'refundable_inr': refundable_inr(p),
        'refunds': [{**r, 'at': r['at'].isoformat() if isinstance(r.get('at'), datetime) else r.get('at')}
                    for r in p.get('refunds', [])],
    }


async def _razorpay_refund(payment_id: str, amount_inr: int, notes: dict) -> dict:
    import razorpay
    from settings_service import get_razorpay_keys
    key_id, key_secret, _ = await get_razorpay_keys()
    if not key_id or not key_secret:
        raise HTTPException(503, 'Razorpay is not configured')
    client = razorpay.Client(auth=(key_id, key_secret))
    # The SDK is synchronous; keep the event loop free.
    return await asyncio.to_thread(client.payment.refund, payment_id, {'amount': amount_inr * 100, 'speed': 'normal', 'notes': notes})


@router.post('/payments/{payment_id}/refund')
async def admin_refund(payment_id: str, body: RefundBody, bg: BackgroundTasks, admin=Depends(get_super_admin)):
    now = datetime.utcnow()
    # Take the lock atomically; a stale lock (crash mid-refund) expires after LOCK_TTL.
    p = await payments.find_one_and_update(
        {'_id': payment_id, 'status': {'$in': list(REFUNDABLE)},
         '$or': [{'refund_lock': None}, {'refund_lock': {'$lt': now - LOCK_TTL}}]},
        {'$set': {'refund_lock': now}},
        return_document=True,
    )
    if not p:
        existing = await payments.find_one({'_id': payment_id})
        if not existing:
            raise HTTPException(404, 'Payment not found')
        if existing.get('status') not in REFUNDABLE:
            raise HTTPException(409, f"Only paid payments can be refunded (this one is {existing.get('status')})")
        raise HTTPException(409, 'A refund for this payment is already in progress')

    try:
        left = refundable_inr(p)
        amount = body.amount_inr or left
        if amount > left:
            raise HTTPException(400, f'At most ₹{left:,} can still be refunded')
        reason = body.reason.strip()
        rp_id = p.get('razorpay_payment_id') or ''
        if rp_id.startswith('pay_'):
            try:
                rp = await _razorpay_refund(rp_id, amount, {'reason': reason[:250], 'refunded_by': admin.get('email') or admin['_id']})
            except HTTPException:
                raise
            except Exception as e:
                # Razorpay error messages are safe to show (e.g. "The refund amount is greater than ...")
                msg = getattr(e, 'args', [''])[0] if getattr(e, 'args', None) else ''
                logger.warning('Razorpay refund failed for %s: %s', payment_id, type(e).__name__)
                raise HTTPException(502, f'Razorpay refused the refund{": " + str(msg)[:200] if msg else ""}')
            refund = {'id': rp.get('id'), 'status': rp.get('status') or 'pending'}
        elif IS_DEV:
            refund = {'id': f'mock_rfnd_{uuid.uuid4().hex[:10]}', 'status': 'processed'}
        else:
            raise HTTPException(400, 'This payment has no Razorpay payment id, so it cannot be refunded here')

        refunded = int(p.get('refunded_inr') or 0) + amount
        full = refunded >= int(p.get('amount_inr') or 0)
        entry = {**refund, 'amount_inr': amount, 'reason': reason, 'by': admin.get('email') or admin['_id'], 'at': now}
        await payments.update_one({'_id': payment_id}, {
            '$set': {'refunded_inr': refunded, 'status': 'refunded' if full else 'partially_refunded', 'updated_at': now},
            '$push': {'refunds': entry},
        })
    finally:
        await payments.update_one({'_id': payment_id}, {'$unset': {'refund_lock': ''}})

    revoked = False
    if full and body.revoke_premium:
        # Only drop premium if no other paid order still covers this user.
        other = await payments.find_one({'user_id': p['user_id'], 'status': 'paid', '_id': {'$ne': payment_id}})
        if not other:
            await users.update_one({'_id': p['user_id']}, {'$set': {'is_premium': False, 'updated_at': now},
                                                           '$unset': {'premium_since': '', 'plan_id': ''}})
            revoked = True

    await audit_record(admin, 'refund', 'payment', payment_id,
                       before={'status': p.get('status'), 'refunded_inr': p.get('refunded_inr', 0)},
                       after={'status': 'refunded' if full else 'partially_refunded', 'refunded_inr': refunded},
                       extra={'amount_inr': amount, 'reason': reason, 'refund_id': refund['id'], 'premium_revoked': revoked})
    user = await users.find_one({'_id': p['user_id']})
    if user and user.get('email'):
        bg.add_task(_send_refund_email, user, amount, full)
    return {**_out(await payments.find_one({'_id': payment_id})), 'premium_revoked': revoked}


async def _send_refund_email(user: dict, amount: int, full: bool) -> None:
    from email_service import send_email
    try:
        await send_email(
            to_email=user['email'],
            subject='Your We Hive refund is on its way',
            html_body=(f"<p>Hi {user.get('name') or 'there'},</p>"
                       f"<p>We've issued a {'full' if full else 'partial'} refund of <b>₹{amount:,}</b> to your original payment method. "
                       "Banks usually take 5–7 working days to show it.</p><p>— We Hive</p>"),
            text_body=f"We've issued a refund of INR {amount:,}. Banks usually take 5-7 working days to show it.",
        )
    except Exception:
        logger.warning('Refund email failed for user %s', user.get('_id'))


async def apply_refund_webhook(event: str, refund_entity: dict) -> None:
    """refund.processed / refund.failed → update the matching refund entry's status."""
    rid = refund_entity.get('id')
    if not rid:
        return
    status = 'processed' if event == 'refund.processed' else 'failed'
    p = await payments.find_one({'refunds.id': rid})
    if not p:
        return
    update = {'$set': {'refunds.$.status': status, 'updated_at': datetime.utcnow()}}
    if status == 'failed':
        entry = next(r for r in p['refunds'] if r.get('id') == rid)
        if entry.get('status') != 'failed':  # webhook retries must not give the amount back twice
            refunded = max(0, int(p.get('refunded_inr') or 0) - int(entry.get('amount_inr') or 0))
            update['$set'].update({'refunded_inr': refunded, 'status': 'partially_refunded' if refunded else 'paid'})
    await payments.update_one({'_id': p['_id'], 'refunds.id': rid}, update)
