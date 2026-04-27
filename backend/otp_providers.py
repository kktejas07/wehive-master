"""OTP delivery providers — pluggable via OTP_CHANNEL env var.

Channels:
  - mock          : prints to logs, returns code in dev_code response
  - twilio_sms    : Twilio SMS for phone numbers
  - twilio_whatsapp : Twilio WhatsApp for phone numbers (international friendly)
  - email         : SMTP for email addresses

If a phone identifier is supplied while the global channel is `email`, we'll
fall back to mock (and vice versa). For `auto`, we pick by identifier type.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple

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


def _send_email(to: str, subject: str, body: str) -> bool:
    host = _env('SMTP_HOST')
    user = _env('SMTP_USER')
    password = _env('SMTP_PASSWORD')
    port = int(_env('SMTP_PORT', '587') or 587)
    sender = _env('SMTP_FROM', user or 'noreply@wehive.co.in')
    sender_name = _env('SMTP_FROM_NAME', 'We Hive')
    if not host or not user or not password:
        return False
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'{sender_name} <{sender}>'
    msg['To'] = to
    msg.attach(MIMEText(body, 'plain'))
    html = f"""
    <div style='font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;'>
      <div style='font-size:18px;font-weight:700;color:#0a2c8a'>We Hive</div>
      <p style='color:#334155'>Use the code below to verify your account:</p>
      <div style='font-size:32px;font-weight:800;letter-spacing:8px;color:#0a2c8a;background:#f1f5f9;padding:18px;text-align:center;border-radius:12px;'>{body.split()[-1] if body else ''}</div>
      <p style='color:#64748b;font-size:13px;margin-top:18px'>This code expires in 10 minutes. If you did not request it, ignore this email.</p>
    </div>"""
    msg.attach(MIMEText(html, 'html'))
    try:
        with smtplib.SMTP(host, port) as s:
            s.starttls()
            s.login(user, password)
            s.sendmail(sender, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error('SMTP send failed: %s', e)
        return False


def deliver_otp(identifier: str, kind: str, code: str) -> Tuple[bool, str, bool]:
    """Returns (delivered, channel_used, is_mock).

    `kind` is 'email' or 'phone' (classified from identifier).
    Resolves global OTP_CHANNEL into the actual transport.
    """
    cfg = _env('OTP_CHANNEL', 'mock').lower()
    body = f'Your We Hive verification code is {code}. It expires in 10 minutes.'

    # Decide channel
    if cfg == 'mock':
        logger.info('[MOCK OTP] %s -> %s', identifier, code)
        return True, 'mock', True
    if cfg in ('auto', 'twilio_sms') and kind == 'phone':
        ok = _send_twilio_sms(identifier, body)
        if ok:
            return True, 'sms', False
    if cfg in ('auto', 'twilio_whatsapp') and kind == 'phone':
        ok = _send_twilio_whatsapp(identifier, body)
        if ok:
            return True, 'whatsapp', False
    if cfg in ('auto', 'email') and kind == 'email':
        ok = _send_email(identifier, 'Your We Hive verification code', body)
        if ok:
            return True, 'email', False

    # Fallback to mock if real provider not configured
    logger.warning('OTP_CHANNEL=%s but real provider not ready for %s. Fallback to mock.', cfg, identifier)
    logger.info('[MOCK OTP fallback] %s -> %s', identifier, code)
    return True, 'mock', True
