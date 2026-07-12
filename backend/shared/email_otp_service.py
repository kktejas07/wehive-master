"""Email OTP delivery — delegates to unified email_service."""
import logging

from shared.email_service import build_otp_html, send_email
from shared.otp_service import OTP_EXPIRY_MINUTES

logger = logging.getLogger('wehive.email_otp')


async def send_otp_email(to_email: str, otp_code: str, purpose: str = 'login') -> bool:
    html = build_otp_html(otp_code, purpose, OTP_EXPIRY_MINUTES)
    return await send_email(
        to_email=to_email,
        subject=f'Your We Hive verification code: {otp_code}',
        html_body=html,
        text_body=f'Your verification code is: {otp_code}',
    )


def otp_expiry_minutes():
    from core.config import OTP_TTL_MIN
    return OTP_TTL_MIN
