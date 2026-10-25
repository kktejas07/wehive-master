"""Unified Email Service — SMTP, Postal API, and extensible provider support.

Config loaded from DB `email` settings namespace first, falling back to env vars.
Supports sending: OTP codes, welcome emails, payment receipts, invoices (HTML + PDF),
subscription updates, and manual admin notifications.
"""

import base64
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formataddr
from typing import Optional

import httpx

from config import DEFAULT_FROM_EMAIL, FRONTEND_URL
from settings_service import get_all as _get_settings

logger = logging.getLogger('wehive.email')

BRAND_RED = '#E0212C'
BRAND_DARK = '#1A1A2E'

EMAIL_SHELL = """\
<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">__PREHEADER__</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:32px 16px">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <tr><td style="height:4px;background:#E0212C;line-height:4px;font-size:0">&nbsp;</td></tr>
    <tr><td style="padding:28px 36px 0 36px;text-align:center">
      <div style="font-size:24px;font-weight:800;color:#1a1a2e;letter-spacing:-0.02em;margin:0">We&nbsp;Hive</div>
      <div style="font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin:6px 0 0 0">Your Global Journey Starts Here</div>
      <div style="font-size:15px;font-weight:700;color:#1a1a2e;margin:22px 0 4px 0">__SUBHEADING__</div>
    </td></tr>
    __CONTENT__
    <tr><td style="padding:8px 36px 32px 36px;text-align:center">
      <div style="border-top:1px solid #f1f5f9;padding-top:20px">
        <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.7">
          Need help? Reply to this email or call <a href="tel:+919121495077" style="color:#E0212C;text-decoration:none">+91 91214 95077</a> (Mon&ndash;Sat, 09:00&ndash;18:00 IST).<br>
          We Hive &middot; Miyapur, Hyderabad &middot; East Windsor, NJ<br>
          &copy; 2026 We Hive. All rights reserved.
        </p>
      </div>
    </td></tr>
  </table>
  <div style="font-size:11px;color:#b6c2d1;margin-top:14px">Sent by We Hive &lt;noreply@wehive.co.in&gt; &middot; <a href="__SITE_URL__/help" style="color:#b6c2d1">Help</a></div>
</td></tr></table>
</body></html>
"""
EMAIL_SHELL = EMAIL_SHELL.replace('__SITE_URL__', FRONTEND_URL)


def _btn(url: str, label: str) -> str:
    return (
        f'<div style="text-align:center;margin:24px 0">'
        f'<a href="{url}" style="display:inline-block;background:#E0212C;color:#ffffff;'
        f'text-decoration:none;font-weight:700;font-size:14px;padding:13px 34px;border-radius:10px">{label}</a>'
        f'</div>'
    )


async def _get_email_config() -> dict:
    cfg = await _get_settings('email')
    return cfg if cfg else {}


async def _get_provider() -> str:
    import os
    cfg = await _get_email_config()
    return cfg.get('provider') or os.environ.get('EMAIL_PROVIDER', 'smtp')


async def _send_via_smtp(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = '',
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: str = 'attachment.pdf',
    cc: Optional[list[str]] = None,
    bcc: Optional[list[str]] = None,
) -> bool:
    import os
    cfg = await _get_email_config()
    smtp_cfg = await _get_settings('smtp')

    host = cfg.get('smtp_host') or smtp_cfg.get('host') or os.environ.get('SMTP_HOST', '')
    port = int(cfg.get('smtp_port') or smtp_cfg.get('port') or os.environ.get('SMTP_PORT') or '587')
    user = cfg.get('smtp_user') or smtp_cfg.get('user') or os.environ.get('SMTP_USER', '')
    password = cfg.get('smtp_password') or smtp_cfg.get('password') or os.environ.get('SMTP_PASSWORD', '')
    from_addr = cfg.get('from_address') or smtp_cfg.get('from') or os.environ.get('SMTP_FROM', user or DEFAULT_FROM_EMAIL)
    from_name = cfg.get('from_name') or smtp_cfg.get('from_name') or os.environ.get('SMTP_FROM_NAME', 'We Hive')

    if not host or not user or not password or 'REPLACE' in password:
        logger.warning('SMTP not configured — cannot send email to %s', to_email)
        return False

    msg = MIMEMultipart('mixed' if pdf_bytes else 'alternative')
    msg['Subject'] = subject
    msg['From'] = formataddr((from_name, from_addr))
    msg['To'] = to_email
    if cc:
        msg['Cc'] = ', '.join(cc)
    if bcc:
        msg['Bcc'] = ', '.join(bcc)

    if pdf_bytes:
        alt = MIMEMultipart('alternative')
        if text_body:
            alt.attach(MIMEText(text_body, 'plain', 'utf-8'))
        alt.attach(MIMEText(html_body, 'html', 'utf-8'))
        msg.attach(alt)
        pdf_attachment = MIMEApplication(pdf_bytes, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment', filename=pdf_filename)
        msg.attach(pdf_attachment)
    else:
        if text_body:
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls(context=ctx)
            server.login(user, password)
            server.send_message(msg)
        logger.info('SMTP email sent to %s: %s', to_email, subject)
        return True
    except Exception as e:
        logger.exception('SMTP send failed to %s: %s', to_email, e)
        return False


async def _send_via_postal(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = '',
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: str = 'attachment.pdf',
    cc: Optional[list[str]] = None,
    bcc: Optional[list[str]] = None,
) -> bool:
    import os
    cfg = await _get_email_config()
    postal_cfg = await _get_settings('postal')

    api_url = cfg.get('postal_api_url') or postal_cfg.get('api_url') or os.environ.get('POSTAL_API_URL', '')
    api_key = cfg.get('postal_api_key') or postal_cfg.get('api_key') or os.environ.get('POSTAL_API_KEY', '')
    from_addr = cfg.get('from_address') or postal_cfg.get('from_address') or os.environ.get('POSTAL_FROM', DEFAULT_FROM_EMAIL)
    from_name = cfg.get('from_name') or postal_cfg.get('from_name') or os.environ.get('POSTAL_FROM_NAME', 'We Hive')

    if not api_url or not api_key:
        logger.warning('Postal not configured — cannot send email to %s', to_email)
        return False

    payload = {
        'to': [to_email],
        'from': f'{from_name} <{from_addr}>',
        'subject': subject,
        'html_body': html_body,
        'plain_body': text_body or 'Please view this email in HTML format.',
    }
    if cc:
        payload['cc'] = cc
    if bcc:
        payload['bcc'] = bcc
    if pdf_bytes:
        payload['attachments'] = [{
            'name': pdf_filename,
            'content_type': 'application/pdf',
            'data': base64.b64encode(pdf_bytes).decode('utf-8'),
        }]

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                f'{api_url.rstrip("/")}/api/v1/send/message',
                json=payload,
                headers={
                    'X-Server-API-Key': api_key,
                    'Content-Type': 'application/json',
                },
            )
            if resp.status_code in (200, 201):
                logger.info('Postal email sent to %s: %s', to_email, subject)
                return True
            logger.error('Postal send failed: %s %s', resp.status_code, resp.text[:300])
            return False
        except Exception as e:
            logger.exception('Postal send error to %s: %s', to_email, e)
            return False


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = '',
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: str = 'attachment.pdf',
    cc: Optional[list[str]] = None,
    bcc: Optional[list[str]] = None,
) -> bool:
    provider = await _get_provider()
    if provider == 'postal':
        return await _send_via_postal(to_email, subject, html_body, text_body, pdf_bytes, pdf_filename, cc, bcc)
    return await _send_via_smtp(to_email, subject, html_body, text_body, pdf_bytes, pdf_filename, cc, bcc)


def _wrap_html(subheading: str, content_html: str, preheader: str = '') -> str:
    return (EMAIL_SHELL
            .replace('__SUBHEADING__', subheading)
            .replace('__CONTENT__', content_html)
            .replace('__PREHEADER__', preheader or subheading))


def build_otp_html(otp_code: str, purpose: str, expiry_minutes: int) -> str:
    purpose_label = 'sign in' if purpose == 'login' else 'account creation'
    content = f"""
    <tr><td style="padding:8px 36px;text-align:center">
      <p style="font-size:14px;color:#475569;margin:0 0 16px 0;line-height:1.6">Hi there — use this code to complete your {purpose_label} on We Hive:</p>
      <div style="background:#fef2f2;border:1px dashed #E0212C;border-radius:12px;padding:22px;margin:0 0 8px 0">
        <div style="font-size:34px;font-weight:800;color:#E0212C;letter-spacing:10px;margin:0">{otp_code}</div>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:12px 0 0 0">Expires in {expiry_minutes} minutes. Never share this code — We Hive staff will never ask for it.</p>
    </td></tr>
    """
    return _wrap_html('Your verification code', content, f'Your We Hive code is {otp_code} — expires in {expiry_minutes} min.')


def build_newsletter_confirm_html(confirm_url: str, unsubscribe_url: str) -> str:
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">Thanks for signing up for We Hive updates.</p>
      <p style="font-size:14px;color:#475569;margin:0 0 8px 0;line-height:1.6">One click and you're in — visa rule changes, slot alerts and study-abroad news, straight to your inbox. If you didn't ask for this, just ignore this email.</p>
      {_btn(confirm_url, 'Confirm subscription')}
      <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">Link expires in 48 hours. <a href="{unsubscribe_url}" style="color:#94a3b8">Unsubscribe</a> anytime.</p>
    </td></tr>
    """
    return _wrap_html('Confirm your subscription', content, 'Confirm your We Hive subscription — one click.')


def build_email_verification_html(name: str, verify_url: str) -> str:
    greeting = f'Hi{name},' if name else 'Hello,'
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">{greeting}</p>
      <p style="font-size:14px;color:#475569;margin:0 0 8px 0;line-height:1.6">Welcome to <strong>We Hive</strong> — please verify your email address to unlock visa tracking, university applications and slot alerts.</p>
      {_btn(verify_url, 'Verify my email')}
      <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">Button not working? Paste this link into your browser:<br><a href="{verify_url}" style="color:#E0212C;word-break:break-all">{verify_url}</a></p>
      <p style="font-size:12px;color:#94a3b8;margin:12px 0 0 0;line-height:1.6">If you didn't create a We Hive account, you can safely ignore this email.</p>
    </td></tr>
    """
    return _wrap_html('Verify your email', content, 'Verify your We Hive email to get started.')


def build_password_reset_html(name: str, reset_url: str, expiry_minutes: int = 30) -> str:
    greeting = f'Hi{name},' if name else 'Hello,'
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">{greeting}</p>
      <p style="font-size:14px;color:#475569;margin:0 0 8px 0;line-height:1.6">We received a request to reset your We Hive password. Click below to choose a new one — this link expires in {expiry_minutes} minutes.</p>
      {_btn(reset_url, 'Reset my password')}
      <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">Didn't ask for a reset? Your password is safe — just ignore this email.</p>
    </td></tr>
    """
    return _wrap_html('Reset your password', content, f'Reset your We Hive password — expires in {expiry_minutes} min.')


def build_welcome_html(name: str) -> str:
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">Hi{f' {name}' if name else ''}, welcome aboard!</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6"><strong>Our Ambition. Our Guidance. No Frontiers</strong> — your all-in-one platform for visas, universities and immigration.</p>
      <ul style="font-size:14px;color:#475569;margin:0 0 8px 0;padding-left:20px;line-height:1.8">
        <li>Explore 190+ countries and check visa requirements</li>
        <li>Apply to 4,000+ universities worldwide</li>
        <li>Book flights, hotels, and travel insurance</li>
        <li>Track applications in real time</li>
        <li>Chat with expert immigration consultants</li>
      </ul>
      {_btn(f'{FRONTEND_URL}/account', 'Go to Dashboard')}
    </td></tr>
    """
    return _wrap_html('Your global journey starts here', content, 'Welcome to We Hive — explore visas, universities and more.')


def build_payment_success_html(name: str, plan_name: str, amount: int, currency: str, invoice_id: str) -> str:
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">Hi{f' {name}' if name else ''}, payment confirmed!</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Thank you for upgrading to <strong>{plan_name}</strong>. Your receipt is below and the invoice PDF is attached.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Plan</td><td style="font-size:13px;color:#1a1a2e;font-weight:700;padding:4px 0;text-align:right">{plan_name}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Amount</td><td style="font-size:13px;color:#1a1a2e;font-weight:700;padding:4px 0;text-align:right">{currency} {amount:,}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Invoice</td><td style="font-size:13px;color:#1a1a2e;font-weight:700;padding:4px 0;text-align:right">#{invoice_id}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Status</td><td style="font-size:13px;color:#16a34a;font-weight:700;padding:4px 0;text-align:right">PAID</td></tr>
        </table>
      </div>
      {_btn(f'{FRONTEND_URL}/account', 'Explore Premium Features')}
    </td></tr>
    """
    return _wrap_html(f'Payment confirmed — {plan_name}', content, f'Your {plan_name} payment was successful.')


def build_payment_failed_html(name: str, plan_name: str, amount: int, currency: str) -> str:
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">Hi{f' {name}' if name else ''}, your payment didn't go through.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:16px 0">
        <p style="font-size:13px;color:#991b1b;margin:0 0 8px 0;font-weight:700">{plan_name} — {currency} {amount:,} · unsuccessful</p>
        <p style="font-size:13px;color:#991b1b;margin:0;line-height:1.6">Usually low balance, card limits or a network blip. You have not been charged.</p>
      </div>
      {_btn(f'{FRONTEND_URL}/pricing', 'Try Again')}
    </td></tr>
    """
    return _wrap_html('Payment failed — action needed', content, f'Your {plan_name} payment could not be completed.')


def build_subscription_activated_html(name: str, plan_name: str, since: str) -> str:
    content = f"""
    <tr><td style="padding:8px 36px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 12px 0;line-height:1.6">Hi{f' {name}' if name else ''}, your <strong>{plan_name}</strong> is active 🎉</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Effective {since}. Here's what's unlocked:</p>
      <ul style="font-size:14px;color:#475569;margin:0 0 8px 0;padding-left:20px;line-height:1.8">
        <li>Priority application processing</li>
        <li>Dedicated specialist support</li>
        <li>Unlimited visa applications</li>
        <li>Advanced AI tools and document review</li>
      </ul>
      {_btn(f'{FRONTEND_URL}/account', 'Go to Dashboard')}
    </td></tr>
    """
    return _wrap_html('Subscription active', content, f'Your {plan_name} subscription is now active.')
