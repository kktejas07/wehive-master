"""OTP and messaging providers — Twilio (SMS/WhatsApp), OpenWA (WhatsApp), SMTP email.
"""

import os
import base64
import logging
from typing import Tuple, Optional
import httpx

logger = logging.getLogger('wehive.otp')


def _env(k: str, default: str = '') -> str:
    v = os.environ.get(k, default)
    return v.strip() if isinstance(v, str) else v


def _twilio_client():
    sid = _env('TWILIO_ACCOUNT_SID')
    token = _env('TWILIO_AUTH_TOKEN')
    if not sid or not token:
        return None
    try:
        from twilio.rest import Client
        return Client(sid, token)
    except Exception as e:
        logger.warning('Twilio client init failed: %s', e)
        return None


def _send_twilio_sms(to: str, body: str) -> bool:
    client = _twilio_client()
    if not client:
        return False
    from_num = _env('TWILIO_PHONE_NUMBER')
    if not from_num:
        return False
    try:
        client.messages.create(to=to, from_=from_num, body=body)
        return True
    except Exception as e:
        logger.error('Twilio SMS send failed: %s', e)
        return False


def _send_twilio_whatsapp(to: str, body: str) -> bool:
    client = _twilio_client()
    if not client:
        return False
    from_addr = _env('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
    to_addr = to if to.startswith('whatsapp:') else f'whatsapp:{to}'
    try:
        client.messages.create(to=to_addr, from_=from_addr, body=body)
        return True
    except Exception as e:
        logger.error('Twilio WhatsApp send failed: %s', e)
        return False


async def _get_openwa_config() -> dict:
    from settings_service import get_all as _get_settings
    cfg = await _get_settings('openwa')
    if not cfg:
        return {}
    return cfg


async def _send_openwa_whatsapp(to: str, body: str) -> bool:
    """Send WhatsApp message via OpenWA API (open-wa / whatsapp-web.js based).

    Supports self-hosted OpenWA instances. Expects:
    - OPENWA_API_URL  (e.g. https://your-openwa-server.com)
    - OPENWA_API_KEY  (API key for authentication)
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

    payload = {
        'chatId': f'{phone}@c.us',
        'body': body,
    }

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
    }

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.post(
                f'{api_url.rstrip("/")}/api/{instance_id}/sendText',
                json=payload,
                headers=headers,
            )
            if resp.status_code in (200, 201):
                logger.info('OpenWA sent WhatsApp to %s', phone)
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

    if kind in ('phone', 'sms'):
        ok = _send_twilio_sms(identifier, f'Your We Hive verification code: {code}')
        if not ok:
            ok = await _send_openwa_whatsapp(identifier, f'Your We Hive verification code: {code}')
            return ok, 'whatsapp', False
        return ok, 'sms', False

    if kind == 'whatsapp':
        ok = await _send_openwa_whatsapp(identifier, f'Your We Hive verification code is: {code}. Valid for 10 minutes.')
        if not ok:
            ok = _send_twilio_whatsapp(identifier, f'Your We Hive verification code is: {code}. Valid for 10 minutes.')
        return ok, 'whatsapp', False

    return False, kind, False


async def deliver_whatsapp_message(to: str, message: str) -> dict:
    """Send a WhatsApp message via OpenWA (preferred) or Twilio (fallback) for notifications/invites."""
    ok = await _send_openwa_whatsapp(to, message)
    if ok:
        return {'ok': True, 'provider': 'openwa'}

    client = _twilio_client()
    if not client:
        return {'ok': False, 'error': 'Neither OpenWA nor Twilio is configured'}

    from_addr = _env('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
    to_addr = to if to.startswith('whatsapp:') else f'whatsapp:{to}'
    try:
        msg = client.messages.create(to=to_addr, from_=from_addr, body=message)
        return {'ok': True, 'sid': msg.sid, 'provider': 'twilio'}
    except Exception as e:
        logger.error('WhatsApp message send failed: %s', e)
        return {'ok': False, 'error': str(e)}
