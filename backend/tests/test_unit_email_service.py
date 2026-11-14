"""Outgoing email: provider routing, SMTP and Postal delivery, and the HTML templates."""
import base64
import os
import sys
from email import message_from_bytes
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import email_service as es  # noqa: E402

SMTP = {'host': 'smtp.example.test', 'port': 2525, 'user': 'mailer', 'password': 'test-smtp-pass', 'from': 'hello@wehive.test', 'from_name': 'We Hive'}


def _settings(monkeypatch, **groups):
    async def get_all(group):
        return groups.get(group, {})
    monkeypatch.setattr(es, '_get_settings', get_all)
    for var in ('EMAIL_PROVIDER', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_PORT', 'SMTP_FROM', 'POSTAL_API_URL', 'POSTAL_API_KEY'):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def smtp_server(monkeypatch):
    server = MagicMock()
    server.__enter__ = MagicMock(return_value=server)
    server.__exit__ = MagicMock(return_value=False)
    factory = MagicMock(return_value=server)
    monkeypatch.setattr(es.smtplib, 'SMTP', factory)
    return factory, server


# ── routing ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_provider_comes_from_admin_settings_then_env_then_defaults_to_smtp(monkeypatch):
    _settings(monkeypatch)
    assert await es._get_provider() == 'smtp'
    monkeypatch.setenv('EMAIL_PROVIDER', 'postal')
    assert await es._get_provider() == 'postal'
    _settings(monkeypatch, email={'provider': 'smtp'})
    monkeypatch.setenv('EMAIL_PROVIDER', 'postal')
    assert await es._get_provider() == 'smtp', 'the admin Settings page wins over the environment'


@pytest.mark.asyncio
async def test_send_email_passes_everything_to_the_chosen_provider(monkeypatch):
    smtp, postal = AsyncMock(return_value=True), AsyncMock(return_value=True)
    monkeypatch.setattr(es, '_send_via_smtp', smtp)
    monkeypatch.setattr(es, '_send_via_postal', postal)
    args = ('to@example.com', 'Subject', '<p>hi</p>', 'hi', b'%PDF', 'invoice.pdf', ['cc@example.com'], ['bcc@example.com'])

    monkeypatch.setattr(es, '_get_provider', AsyncMock(return_value='postal'))
    assert await es.send_email(*args) is True
    postal.assert_awaited_once_with(*args)
    smtp.assert_not_awaited()

    monkeypatch.setattr(es, '_get_provider', AsyncMock(return_value='smtp'))
    await es.send_email(*args)
    smtp.assert_awaited_once_with(*args)


# ── SMTP ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize('broken', [{'host': ''}, {'user': ''}, {'password': ''}, {'password': 'REPLACE_ME'}])
async def test_smtp_is_not_attempted_until_it_is_configured(monkeypatch, smtp_server, caplog, broken):
    _settings(monkeypatch, smtp={**SMTP, **broken})
    assert await es._send_via_smtp('to@example.com', 'S', '<p>x</p>') is False
    smtp_server[0].assert_not_called()
    assert 'SMTP not configured' in caplog.text


@pytest.mark.asyncio
async def test_smtp_sends_a_tls_authenticated_message_with_text_and_html(monkeypatch, smtp_server):
    factory, server = smtp_server
    _settings(monkeypatch, smtp=SMTP)

    assert await es._send_via_smtp('asha@example.com', 'Payment Confirmed', '<p>Paid</p>', 'Paid', cc=['ops@wehive.test']) is True

    factory.assert_called_once_with('smtp.example.test', 2525, timeout=15)
    server.starttls.assert_called_once()
    server.login.assert_called_once_with('mailer', 'test-smtp-pass')
    msg = server.send_message.call_args.args[0]
    assert msg['To'] == 'asha@example.com' and msg['Cc'] == 'ops@wehive.test' and msg['Subject'] == 'Payment Confirmed'
    assert msg['From'] == 'We Hive <hello@wehive.test>'
    parts = {p.get_content_type(): p.get_payload(decode=True).decode() for p in msg.walk() if not p.is_multipart()}
    assert parts == {'text/plain': 'Paid', 'text/html': '<p>Paid</p>'}


@pytest.mark.asyncio
async def test_smtp_attaches_the_invoice_pdf(monkeypatch, smtp_server):
    _, server = smtp_server
    _settings(monkeypatch, smtp=SMTP)
    await es._send_via_smtp('asha@example.com', 'Invoice', '<p>x</p>', 'x', pdf_bytes=b'%PDF-1.4 test', pdf_filename='WeHive-Invoice-AB12.pdf')
    msg = message_from_bytes(server.send_message.call_args.args[0].as_bytes())
    pdfs = [p for p in msg.walk() if p.get_content_type() == 'application/pdf']
    assert len(pdfs) == 1 and pdfs[0].get_filename() == 'WeHive-Invoice-AB12.pdf'
    assert pdfs[0].get_payload(decode=True) == b'%PDF-1.4 test'


@pytest.mark.asyncio
async def test_an_smtp_failure_is_logged_and_reported_as_not_sent(monkeypatch, smtp_server, caplog):
    _, server = smtp_server
    server.login.side_effect = OSError('auth rejected')
    _settings(monkeypatch, smtp=SMTP)
    assert await es._send_via_smtp('asha@example.com', 'S', '<p>x</p>') is False
    assert 'SMTP send failed to asha@example.com' in caplog.text
    server.send_message.assert_not_called()


@pytest.mark.asyncio
async def test_admin_email_settings_override_the_smtp_group(monkeypatch, smtp_server):
    factory, server = smtp_server
    _settings(monkeypatch, smtp=SMTP, email={'smtp_host': 'override.example.test', 'smtp_port': '465', 'from_address': 'noreply@wehive.test'})
    await es._send_via_smtp('asha@example.com', 'S', '<p>x</p>')
    factory.assert_called_once_with('override.example.test', 465, timeout=15)
    assert server.send_message.call_args.args[0]['From'] == 'We Hive <noreply@wehive.test>'


# ── Postal ────────────────────────────────────────────────────────────────────

def _postal_client(monkeypatch, status=200, error=None):
    client = MagicMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    client.post = AsyncMock(side_effect=error, return_value=MagicMock(status_code=status, text='postal says no'))
    monkeypatch.setattr(es.httpx, 'AsyncClient', MagicMock(return_value=client))
    return client


@pytest.mark.asyncio
async def test_postal_is_not_attempted_until_it_is_configured(monkeypatch):
    _settings(monkeypatch)
    client = _postal_client(monkeypatch)
    assert await es._send_via_postal('to@example.com', 'S', '<p>x</p>') is False
    client.post.assert_not_awaited()


@pytest.mark.asyncio
async def test_postal_posts_the_message_with_its_api_key_and_attachment(monkeypatch):
    _settings(monkeypatch, postal={'api_url': 'https://postal.example.test/', 'api_key': 'test-postal-key', 'from_address': 'hello@wehive.test'})
    client = _postal_client(monkeypatch)

    ok = await es._send_via_postal('asha@example.com', 'Invoice', '<p>x</p>', '', b'%PDF', 'inv.pdf', bcc=['audit@wehive.test'])

    assert ok is True
    url = client.post.await_args.args[0]
    sent = client.post.await_args.kwargs
    assert url == 'https://postal.example.test/api/v1/send/message'
    assert sent['headers']['X-Server-API-Key'] == 'test-postal-key'
    body = sent['json']
    assert body['to'] == ['asha@example.com'] and body['from'] == 'We Hive <hello@wehive.test>' and body['bcc'] == ['audit@wehive.test']
    assert body['plain_body'], 'a text part is always sent, even when the caller gives none'
    assert body['attachments'] == [{'name': 'inv.pdf', 'content_type': 'application/pdf', 'data': base64.b64encode(b'%PDF').decode()}]
    assert 'cc' not in body


@pytest.mark.asyncio
@pytest.mark.parametrize('status,error', [(500, None), (401, None), (200, OSError('connection reset'))])
async def test_a_postal_failure_is_reported_as_not_sent(monkeypatch, caplog, status, error):
    _settings(monkeypatch, postal={'api_url': 'https://postal.example.test', 'api_key': 'test-postal-key'})
    _postal_client(monkeypatch, status=status, error=error)
    assert await es._send_via_postal('asha@example.com', 'S', '<p>x</p>') is False
    assert 'Postal send' in caplog.text


# ── templates ─────────────────────────────────────────────────────────────────

def test_otp_email_shows_the_code_purpose_and_expiry():
    html = es.build_otp_html('482913', 'login', 10)
    assert '482913' in html and 'sign in' in html and 'Expires in 10 minutes' in html
    assert 'account creation' in es.build_otp_html('111111', 'signup', 5)
    assert '__CONTENT__' not in html and '__SUBHEADING__' not in html, 'the shell placeholders are all filled'


def test_greetings_have_a_space_before_the_name():
    """Verification and reset emails used to open with "HiAsha,"."""
    assert 'Hi Asha,' in es.build_email_verification_html('Asha', 'https://wehive.test/verify?t=1')
    assert 'Hi Asha,' in es.build_password_reset_html('Asha', 'https://wehive.test/reset?t=1')
    assert 'Hello,' in es.build_password_reset_html('', 'https://wehive.test/reset?t=1')
    assert 'Hi Asha, welcome aboard!' in es.build_welcome_html('Asha')
    assert 'Hi, welcome aboard!' in es.build_welcome_html('')


def test_links_and_amounts_are_in_the_emails():
    assert es.build_email_verification_html('A', 'https://wehive.test/verify?t=abc').count('https://wehive.test/verify?t=abc') >= 2
    assert 'https://wehive.test/reset?t=xyz' in es.build_password_reset_html('A', 'https://wehive.test/reset?t=xyz', 45)
    confirm = es.build_newsletter_confirm_html('https://wehive.test/c', 'https://wehive.test/u')
    assert 'https://wehive.test/c' in confirm and 'https://wehive.test/u' in confirm
    paid = es.build_payment_success_html('Asha', 'Standard', 999, 'INR', 'AB12CD34')
    assert 'Standard' in paid and '999' in paid and 'AB12CD34' in paid
    assert 'Concierge' in es.build_payment_failed_html('Asha', 'Concierge', 1499, 'INR')
    assert 'Lite' in es.build_subscription_activated_html('Asha', 'Lite', '14 Nov 2026')


def test_a_name_cannot_inject_markup_into_an_email():
    evil = '<img src=x onerror=alert(1)>'
    for html in (es.build_welcome_html(evil), es.build_email_verification_html(evil, 'https://wehive.test/v'),
                 es.build_password_reset_html(evil, 'https://wehive.test/r'),
                 es.build_payment_success_html(evil, 'Standard', 999, 'INR', 'AB12')):
        assert evil not in html and '&lt;img src=x onerror=alert(1)&gt;' in html
