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

from settings_service import get_all as _get_settings

logger = logging.getLogger('wehive.email')

EMAIL_CSS = """
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <tr><td style="padding:32px 32px 0 32px;text-align:center">
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0">We Hive</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px 0">__SUBHEADING__</p>
    </td></tr>
    __CONTENT__
    <tr><td style="padding:0 32px 32px 32px;text-align:center">
      <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">
        Need help? Reply to this email or visit <a href="https://wehive.co.in/help" style="color:#e0212c">We Hive Help</a>.<br>
        &copy; 2026 We Hive. All rights reserved.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body>
"""


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
    port = int(cfg.get('smtp_port') or smtp_cfg.get('port') or os.environ.get('SMTP_PORT', '587'))
    user = cfg.get('smtp_user') or smtp_cfg.get('user') or os.environ.get('SMTP_USER', '')
    password = cfg.get('smtp_password') or smtp_cfg.get('password') or os.environ.get('SMTP_PASSWORD', '')
    from_addr = cfg.get('from_address') or smtp_cfg.get('from') or os.environ.get('SMTP_FROM', user or 'noreply@wehive.co.in')
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
    from_addr = cfg.get('from_address') or postal_cfg.get('from_address') or os.environ.get('POSTAL_FROM', 'noreply@wehive.co.in')
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


def _wrap_html(subheading: str, content_html: str) -> str:
    return EMAIL_CSS.replace('__SUBHEADING__', subheading).replace('__CONTENT__', content_html)


def build_otp_html(otp_code: str, purpose: str, expiry_minutes: int) -> str:
    purpose_label = 'sign in' if purpose == 'login' else 'account creation'
    content = f"""
    <tr><td style="padding:0 32px;text-align:center">
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px">
        <p style="font-size:13px;color:#64748b;margin:0 0 12px 0">Use this code to complete your {purpose_label}</p>
        <div style="font-size:36px;font-weight:800;color:#e0212c;letter-spacing:8px;margin:0">{otp_code}</div>
        <p style="font-size:12px;color:#94a3b8;margin:12px 0 0 0">This code expires in {expiry_minutes} minutes</p>
      </div>
    </td></tr>
    """
    return _wrap_html('Your verification code', content)


def build_welcome_html(name: str) -> str:
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0">Hi{f' {name}' if name else ''},</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Welcome to <strong>We Hive</strong> — your all-in-one platform for visa applications, university admissions, and immigration services.</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Here's what you can do now:</p>
      <ul style="font-size:14px;color:#475569;margin:0 0 20px 0;padding-left:20px;line-height:1.8">
        <li>Explore 190+ countries and check visa requirements</li>
        <li>Apply to 4,000+ universities worldwide</li>
        <li>Book flights, hotels, and travel insurance</li>
        <li>Track application status in real time</li>
        <li>Connect with expert immigration consultants</li>
      </ul>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wehive.co.in/account" style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Go to Dashboard</a>
      </div>
    </td></tr>
    """
    return _wrap_html("Welcome aboard!", content)


def build_payment_success_html(name: str, plan_name: str, amount: int, currency: str, invoice_id: str) -> str:
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0">Hi{f' {name}' if name else ''},</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Your payment was successful! Thank you for upgrading to <strong>{plan_name}</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Plan</td><td style="font-size:13px;color:#1a1a2e;font-weight:700;padding:4px 0;text-align:right">{plan_name}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Amount</td><td style="font-size:13px;color:#1a1a2e;font-weight:700;padding:4px 0;text-align:right">{currency} {amount:,}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Invoice</td><td style="font-size:13px;color:#1a1a2e;font-weight:700;padding:4px 0;text-align:right">#{invoice_id}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Status</td><td style="font-size:13px;color:#16a34a;font-weight:700;padding:4px 0;text-align:right">PAID</td></tr>
        </table>
      </div>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">You now have access to all premium features. Your invoice is attached to this email.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wehive.co.in/account" style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Explore Premium Features</a>
      </div>
    </td></tr>
    """
    return _wrap_html(f'Payment Confirmed — {plan_name}', content)


def build_payment_failed_html(name: str, plan_name: str, amount: int, currency: str) -> str:
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0">Hi{f' {name}' if name else ''},</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Your payment for <strong>{plan_name}</strong> ({currency} {amount:,}) could not be completed.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:16px 0">
        <p style="font-size:13px;color:#991b1b;margin:0 0 8px 0;font-weight:700">Payment unsuccessful</p>
        <p style="font-size:13px;color:#991b1b;margin:0;line-height:1.6">This could be due to insufficient funds, card limits, or a temporary network issue. Your account has not been charged.</p>
      </div>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Please try again or use a different payment method.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wehive.co.in/pricing" style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Try Again</a>
      </div>
    </td></tr>
    """
    return _wrap_html('Payment Failed — Action Required', content)


def build_subscription_activated_html(name: str, plan_name: str, since: str) -> str:
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0">Hi{f' {name}' if name else ''},</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Your <strong>{plan_name}</strong> subscription is now active, effective {since}.</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Premium benefits include:</p>
      <ul style="font-size:14px;color:#475569;margin:0 0 20px 0;padding-left:20px;line-height:1.8">
        <li>Priority application processing</li>
        <li>Dedicated specialist support</li>
        <li>Unlimited visa applications</li>
        <li>Advanced AI tools and document review</li>
      </ul>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wehive.co.in/account" style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">Go to Dashboard</a>
      </div>
    </td></tr>
    """
    return _wrap_html('Subscription Active!', content)


def build_subscription_cancelled_html(name: str, plan_name: str) -> str:
    content = f"""
    <tr><td style="padding:0 32px;text-align:left">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0">Hi{f' {name}' if name else ''},</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">Your <strong>{plan_name}</strong> subscription has been cancelled.</p>
      <p style="font-size:14px;color:#475569;margin:0 0 12px 0;line-height:1.6">You can still use all free features. Upgrade anytime from your account settings.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wehive.co.in/pricing" style="display:inline-block;background:#e0212c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px">View Plans</a>
      </div>
    </td></tr>
    """
    return _wrap_html('Subscription Update', content)
