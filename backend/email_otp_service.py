"""Email OTP delivery — SMTP with branded HTML template."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from settings_service import get_smtp_config

logger = logging.getLogger('wehive.email_otp')

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <tr><td style="padding:32px 32px 0 32px;text-align:center">
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0">We Hive</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px 0">Your verification code</p>
    </td></tr>
    <tr><td style="padding:0 32px;text-align:center">
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px">
        <p style="font-size:13px;color:#64748b;margin:0 0 12px 0">Use this code to complete your %s</p>
        <div style="font-size:36px;font-weight:800;color:#e0212c;letter-spacing:8px;margin:0">%s</div>
        <p style="font-size:12px;color:#94a3b8;margin:12px 0 0 0">This code expires in %s minutes</p>
      </div>
    </td></tr>
    <tr><td style="padding:0 32px 32px 32px;text-align:center">
      <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">
        If you didn't request this code, you can safely ignore this email.<br>
        &copy; 2026 We Hive. All rights reserved.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body>
</html>"""


def _get_smtp_config_sync():
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(get_smtp_config())
    finally:
        loop.close()


async def send_otp_email(to_email: str, otp_code: str, purpose: str = 'login') -> bool:
    cfg = await get_smtp_config()
    host = cfg.get('host') or ''
    port = int(cfg.get('port') or 587)
    user = cfg.get('user') or ''
    password = cfg.get('password') or ''
    from_addr = cfg.get('from_address') or 'noreply@wehive.co.in'
    from_name = cfg.get('from_name') or 'We Hive'

    if not host or not user or not password:
        logger.warning('SMTP not configured — cannot send email OTP to %s', to_email)
        return False

    html = HTML_TEMPLATE % (
        'sign in' if purpose == 'login' else 'account creation',
        otp_code,
        str(int(otp_expiry_minutes())),
    )

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'Your We Hive verification code: {otp_code}'
    msg['From'] = f'{from_name} <{from_addr}>'
    msg['To'] = to_email
    msg.attach(MIMEText(f'Your verification code is: {otp_code}', 'plain'))
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        logger.info('Email OTP sent to %s', to_email)
        return True
    except Exception as e:
        logger.exception('Failed to send email OTP to %s: %s', to_email, e)
        return False


def otp_expiry_minutes():
    from config import OTP_TTL_MIN
    return OTP_TTL_MIN
