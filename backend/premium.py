"""Premium access: paid plans unlock AI tools; everyone else gets a few free uses.

Premium is granted only by a verified Razorpay payment (routes_payments.py) or an
admin. Free users can try premium AI tools PREMIUM_FREE_USES times in total; after
that the API answers 402 and the app takes them to the plans page.
"""
import os

from fastapi import HTTPException

FREE_USES = int(os.environ.get('PREMIUM_FREE_USES', '3'))


def free_left(user: dict) -> int:
    if user.get('is_premium'):
        return 0
    return max(0, FREE_USES - int(user.get('premium_free_used') or 0))


def ensure_access(user: dict, feature: str = 'This AI tool') -> None:
    """402 when a non-premium user has used up their free tries."""
    if user.get('is_premium') or free_left(user) > 0:
        return
    raise HTTPException(
        status_code=402,
        detail=f'You have used your {FREE_USES} free tries. {feature} is part of Premium: upgrade to keep using it.',
    )


async def record_use(user: dict) -> None:
    """Count one free try after it succeeded (premium users are not counted)."""
    if user.get('is_premium'):
        return
    from db import users
    await users.update_one({'_id': user['_id']}, {'$inc': {'premium_free_used': 1}})
