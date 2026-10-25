"""OTP and messaging providers — OpenWA (WhatsApp) and email (SMTP / Postal).

Phone numbers get codes and messages on WhatsApp through OpenWA; there is no SMS provider.
"""

import os
import logging
from typing import Tuple
import httpx

logger = logging.getLogger('wehive.otp')

WHATSAPP_FOOTER = (
    '\n\nVisit website: https://wehive.co.in'
    '\n© WeHive. All rights reserved. · Powered by Axiss Groups'
)


def _with_footer(body: str) -> str:
    if WHATSAPP_FOOTER.strip() in body:
        return body
    return body + WHATSAPP_FOOTER


def _env(k: str, default: str = '') -> str:
    v = os.environ.get(k, default)
    return v.strip() if isinstance(v, str) else v


async def _get_openwa_config() -> dict:
    from settings_service import get_all as _get_settings
    cfg = await _get_settings('openwa')
    if not cfg:
        return {}
    return cfg


async def _send_openwa_whatsapp(to: str, body: str) -> bool:
    """Send WhatsApp message via OpenWA API.

    Supports self-hosted OpenWA instances. Expects:
    - OPENWA_API_URL  (e.g. http://167.233.39.15:2785)
    - OPENWA_API_KEY  (API key starting with owa_k1_...)
    - OPENWA_INSTANCE_ID  (Session ID from OpenWA dashboard)
    """
    cfg = await _get_openwa_config()
    api_url = cfg.get('api_url') or _env('OPENWA_API_URL', '')
    api_key = cfg.get('api_key') or _env('OPENWA_API_KEY', '')
    instance_id = cfg.get('instance_id') or _env('OPENWA_INSTANCE_ID', 'default')

    if not api_url or not api_key:
        logger.warning('OpenWA not configured — cannot send WhatsApp message to %s', to)
        return False

    phone = to.replace('whatsapp:', '').replace('+', '').strip()
    if not phone.startswith('91') and len(phone) <= 10:
        phone = '91' + phone

    endpoint = f'{api_url.rstrip("/")}/api/sessions/{instance_id}/messages/send-text'
    payload = {
        'chatId': f'{phone}@c.us',
        'text': _with_footer(body),
    }

    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': api_key,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.post(endpoint, json=payload, headers=headers)
            data = resp.json()
            if resp.status_code in (200, 201) and data.get('messageId'):
                logger.info('OpenWA sent WhatsApp to %s (msgId=%s)', phone, data.get('messageId'))
                return True
            logger.error('OpenWA send failed: %s %s', resp.status_code, resp.text[:300])
            return False
        except Exception as e:
            logger.exception('OpenWA send error to %s: %s', phone, e)
            return False


async def deliver_otp(identifier: str, kind: str, code: str) -> Tuple[bool, str, bool]:
    """Deliver OTP via the appropriate channel.

    Returns (success, channel_used, is_async).
    """
    if kind == 'email':
        from email_service import build_otp_html, send_email
        from otp_service import OTP_EXPIRY_MINUTES
        html = build_otp_html(code, 'login', OTP_EXPIRY_MINUTES)
        ok = await send_email(
            to_email=identifier,
            subject=f'Your We Hive verification code: {code}',
            html_body=html,
            text_body=f'Your verification code is: {code}',
        )
        return ok, 'email', False

    if kind in ('phone', 'sms', 'whatsapp'):
        ok = await _send_openwa_whatsapp(identifier, f'Your We Hive verification code is: {code}. Valid for 10 minutes.')
        return ok, 'whatsapp', False

    return False, kind, False


async def deliver_whatsapp_message(to: str, message: str) -> dict:
    """Send a WhatsApp message via OpenWA (notifications, reminders, invites)."""
    if await _send_openwa_whatsapp(to, message):
        return {'ok': True, 'provider': 'openwa'}
    return {'ok': False, 'error': 'WhatsApp (OpenWA) is not configured or the send failed'}
