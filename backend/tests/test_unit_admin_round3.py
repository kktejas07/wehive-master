"""Admin round 3: TOTP 2FA, admin roles, refunds, refund-safe payment states, newsletter campaigns,
suspicious-document checks, suspended login."""
import os
import sys
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import admin_auth  # noqa: E402
import auth_utils  # noqa: E402
import routes_admin_auth as aa  # noqa: E402
import routes_admin_doc_review as review  # noqa: E402
import routes_admin_refunds as refunds  # noqa: E402
import routes_newsletter_campaigns as camp  # noqa: E402
import totp  # noqa: E402

RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'  # "12345678901234567890" — RFC 6238 test vector  verify:allow-secret


# ── TOTP ──────────────────────────────────────────────────────────────────────
def test_totp_matches_rfc6238_vectors():
    assert totp.code_at(RFC_SECRET, 59 // 30) == '287082'
    assert totp.code_at(RFC_SECRET, 1111111109 // 30) == '081804'


def test_totp_verify_window_and_replay():
    now = 1111111109
    step = now // 30
    assert totp.verify(RFC_SECRET, '081804', now=now) == step
    assert totp.verify(RFC_SECRET, '081804', now=now + 30) == step  # one step of drift is fine
    assert totp.verify(RFC_SECRET, '081804', now=now + 90) is None
    assert totp.verify(RFC_SECRET, '081804', now=now, last_step=step) is None  # replay
    assert totp.verify(RFC_SECRET, 'abc123', now=now) is None


def test_recovery_codes_are_hashed_and_normalised():
    codes, hashes = totp.new_recovery_codes()
    assert len(codes) == 10 and len(set(codes)) == 10
    assert totp.hash_recovery(codes[0].upper().replace('-', ' ')) == hashes[0]
    assert totp.looks_like_recovery(codes[0]) and not totp.looks_like_recovery('123456')
    assert totp.otpauth_uri(RFC_SECRET, 'a@b.com').startswith('otpauth://totp/We%20Hive%20Admin:a%40b.com?secret=')


# ── MFA tokens and the admin gate ─────────────────────────────────────────────
def _users(doc):
    return MagicMock(find_one=AsyncMock(return_value=doc), update_one=AsyncMock(return_value=MagicMock(modified_count=1)))


@pytest.mark.asyncio
async def test_mfa_ticket_is_not_a_session(monkeypatch):
    import db
    ticket = admin_auth.sign_mfa_token('a1')
    assert admin_auth.decode_mfa_token(ticket) == 'a1'
    monkeypatch.setattr(db, 'users', _users({'_id': 'a1', 'is_admin': True}))
    with pytest.raises(HTTPException) as exc:
        await admin_auth.get_current_admin_flex(f'Bearer {ticket}')
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException):
        await auth_utils.get_current_user(f'Bearer {ticket}')
    with pytest.raises(HTTPException):
        admin_auth.decode_mfa_token(admin_auth.sign_admin_jwt('a1'))


@pytest.mark.asyncio
async def test_admin_with_2fa_needs_mfa_session(monkeypatch):
    import db
    monkeypatch.setattr(db, 'users', _users({'_id': 'a1', 'is_admin': True, 'totp_enabled': True}))
    with pytest.raises(HTTPException) as exc:
        await admin_auth.get_current_admin_flex(f'Bearer {admin_auth.sign_admin_jwt("a1")}')
    assert exc.value.status_code == 401
    assert (await admin_auth.get_current_admin_flex(f'Bearer {admin_auth.sign_admin_jwt("a1", mfa=True)}'))['_id'] == 'a1'
    with pytest.raises(HTTPException) as exc:  # a student OTP session can't stand in for it
        await admin_auth.get_current_admin_flex(f'Bearer {auth_utils.sign_jwt("a1")}')
    assert exc.value.status_code == 403


def test_password_step_returns_ticket_when_2fa_on():
    out = aa._session_or_mfa({'_id': 'a1', 'is_admin': True, 'totp_enabled': True})
    assert out['mfa_required'] is True and 'access_token' not in out
    assert 'access_token' in aa._session_or_mfa({'_id': 'a1', 'is_admin': True})


@pytest.mark.asyncio
async def test_second_factor_accepts_totp_and_locks_on_wrong(monkeypatch):
    from byok_vault import encrypt_key
    monkeypatch.setattr(aa, 'is_locked_out', AsyncMock(return_value=(False, 0)))
    monkeypatch.setattr(aa, 'clear_attempts', AsyncMock())
    failed = AsyncMock()
    monkeypatch.setattr(aa, 'record_failed_attempt', failed)
    coll = _users(None)
    monkeypatch.setattr(aa, 'users', coll)
    user = {'_id': 'a1', 'totp_secret': encrypt_key(RFC_SECRET), 'totp_last_step': -1}
    import time
    good = totp.code_at(RFC_SECRET, int(time.time()) // 30)
    await aa._check_second_factor(user, good)
    with pytest.raises(HTTPException) as exc:
        await aa._check_second_factor(user, '000000' if good != '000000' else '111111')
    assert exc.value.status_code == 401 and failed.await_count == 1


@pytest.mark.asyncio
async def test_second_factor_recovery_code_is_single_use(monkeypatch):
    monkeypatch.setattr(aa, 'is_locked_out', AsyncMock(return_value=(False, 0)))
    monkeypatch.setattr(aa, 'clear_attempts', AsyncMock())
    monkeypatch.setattr(aa, 'record_failed_attempt', AsyncMock())
    monkeypatch.setattr(aa, 'audit_record', AsyncMock())
    coll = MagicMock(update_one=AsyncMock(side_effect=[MagicMock(modified_count=1), MagicMock(modified_count=0)]))
    monkeypatch.setattr(aa, 'users', coll)
    await aa._check_second_factor({'_id': 'a1'}, 'abcde-12345')
    assert coll.update_one.await_args.args[1] == {'$pull': {'totp_recovery': totp.hash_recovery('abcde12345')}}
    with pytest.raises(HTTPException):
        await aa._check_second_factor({'_id': 'a1'}, 'abcde-12345')


# ── roles ─────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize('role,method,path,ok', [
    ('viewer', 'GET', '/api/admin/payments', True),
    ('viewer', 'PATCH', '/api/admin/applications/a1', False),
    ('viewer', 'POST', '/api/admin-auth/2fa/setup', True),
    ('viewer', 'POST', '/api/rag/query', True),
    ('support', 'PATCH', '/api/admin/applications/a1/assign', True),
    ('support', 'PATCH', '/api/admin/leads/l1', True),
    ('support', 'POST', '/api/admin/payments/p1/refund', False),
    ('support', 'PATCH', '/api/admin/pricing', False),
    ('finance', 'PATCH', '/api/admin/pricing', True),
    ('finance', 'POST', '/api/promotions/create', True),
    ('finance', 'PATCH', '/api/admin/applications/a1', False),
    ('manager', 'DELETE', '/api/admin/events/e1', True),
    (None, 'DELETE', '/api/admin/events/e1', True),
])
def test_role_policy(role, method, path, ok):
    assert admin_auth.role_allows(role, method, path) is ok


@pytest.mark.asyncio
async def test_gate_applies_role_to_request(monkeypatch):
    import db
    monkeypatch.setattr(db, 'users', _users({'_id': 'a1', 'is_admin': True, 'admin_role': 'viewer', 'email': 'v@x.com'}))
    monkeypatch.setattr(admin_auth, 'ADMIN_EMAILS', set())
    req = MagicMock(method='PATCH', url=MagicMock(path='/api/admin/applications/a1'))
    with pytest.raises(HTTPException) as exc:
        await admin_auth.get_current_admin_flex(f'Bearer {admin_auth.sign_admin_jwt("a1")}', req)
    assert exc.value.status_code == 403 and 'viewer' in exc.value.detail


def test_new_super_admin_endpoints_are_gated():
    from fastapi.routing import APIRoute
    import server
    guarded = {('PATCH', '/api/admin-auth/admins/{user_id}/role'), ('DELETE', '/api/admin-auth/admins/{user_id}/2fa'),
               ('POST', '/api/admin/payments/{payment_id}/refund'), ('POST', '/api/newsletter/admin/campaigns')}
    found = set()
    for r in server.app.routes:
        if isinstance(r, APIRoute):
            for m in r.methods:
                if (m, r.path) in guarded:
                    assert admin_auth.get_super_admin in {d.call for d in r.dependant.dependencies}, (m, r.path)
                    found.add((m, r.path))
    assert found == guarded


# ── refunds ───────────────────────────────────────────────────────────────────
def _payments(locked_doc, existing=None):
    return MagicMock(
        find_one_and_update=AsyncMock(return_value=locked_doc),
        find_one=AsyncMock(return_value=existing if existing is not None else locked_doc),
        update_one=AsyncMock(),
    )


@pytest.mark.asyncio
async def test_refund_refuses_more_than_remaining(monkeypatch):
    p = {'_id': 'p1', 'user_id': 'u1', 'status': 'partially_refunded', 'amount_inr': 1000, 'refunded_inr': 600,
         'razorpay_payment_id': 'pay_x'}
    coll = _payments(p)
    monkeypatch.setattr(refunds, 'payments', coll)
    with pytest.raises(HTTPException) as exc:
        await refunds.admin_refund('p1', refunds.RefundBody(amount_inr=500, reason='dup charge'), MagicMock(), admin={'_id': 'a'})
    assert exc.value.status_code == 400 and '400' in exc.value.detail
    assert coll.update_one.await_args.args[1] == {'$unset': {'refund_lock': ''}}  # lock released


@pytest.mark.asyncio
async def test_refund_in_progress_is_409(monkeypatch):
    coll = _payments(None, existing={'_id': 'p1', 'status': 'paid'})
    monkeypatch.setattr(refunds, 'payments', coll)
    with pytest.raises(HTTPException) as exc:
        await refunds.admin_refund('p1', refunds.RefundBody(reason='dup charge'), MagicMock(), admin={'_id': 'a'})
    assert exc.value.status_code == 409 and 'in progress' in exc.value.detail


@pytest.mark.asyncio
async def test_full_refund_calls_razorpay_and_revokes_premium(monkeypatch):
    p = {'_id': 'p1', 'user_id': 'u1', 'status': 'paid', 'amount_inr': 4999, 'razorpay_payment_id': 'pay_abc'}
    after = {**p, 'status': 'refunded', 'refunded_inr': 4999, 'refunds': []}
    coll = MagicMock(find_one_and_update=AsyncMock(return_value=p), update_one=AsyncMock(),
                     find_one=AsyncMock(side_effect=[None, after]))
    monkeypatch.setattr(refunds, 'payments', coll)
    ucoll = MagicMock(update_one=AsyncMock(), find_one=AsyncMock(return_value={'_id': 'u1', 'email': 'u@x.com'}))
    monkeypatch.setattr(refunds, 'users', ucoll)
    rp = AsyncMock(return_value={'id': 'rfnd_1', 'status': 'processed'})
    monkeypatch.setattr(refunds, '_razorpay_refund', rp)
    monkeypatch.setattr(refunds, 'audit_record', AsyncMock())
    bg = MagicMock()
    out = await refunds.admin_refund('p1', refunds.RefundBody(reason='customer request'), bg, admin={'_id': 'a', 'email': 'a@x.com'})
    assert rp.await_args.args[:2] == ('pay_abc', 4999)
    setdoc = coll.update_one.await_args_list[0].args[1]
    assert setdoc['$set']['status'] == 'refunded' and setdoc['$set']['refunded_inr'] == 4999
    assert ucoll.update_one.await_args.args[1]['$set']['is_premium'] is False
    assert out['premium_revoked'] is True and bg.add_task.called


@pytest.mark.asyncio
async def test_failed_refund_webhook_restores_amount_once(monkeypatch):
    p = {'_id': 'p1', 'status': 'refunded', 'amount_inr': 1000, 'refunded_inr': 1000,
         'refunds': [{'id': 'rfnd_1', 'amount_inr': 1000, 'status': 'pending'}]}
    coll = MagicMock(find_one=AsyncMock(return_value=p), update_one=AsyncMock())
    monkeypatch.setattr(refunds, 'payments', coll)
    await refunds.apply_refund_webhook('refund.failed', {'id': 'rfnd_1'})
    s = coll.update_one.await_args.args[1]['$set']
    assert s['refunded_inr'] == 0 and s['status'] == 'paid' and s['refunds.$.status'] == 'failed'
    p['refunds'][0]['status'] = 'failed'  # retry of the same webhook
    await refunds.apply_refund_webhook('refund.failed', {'id': 'rfnd_1'})
    assert 'refunded_inr' not in coll.update_one.await_args.args[1]['$set']


@pytest.mark.asyncio
async def test_verify_refuses_refunded_order(monkeypatch):
    import routes_payments as rp
    monkeypatch.setattr(rp, 'payments', MagicMock(find_one=AsyncMock(return_value={
        '_id': 'p1', 'user_id': 'u1', 'plan_id': next(iter(rp.PLANS)), 'status': 'refunded'})))
    req = rp.VerifyRequest(razorpay_order_id='o', razorpay_payment_id='pay', razorpay_signature='sig', plan_id='x')
    with pytest.raises(HTTPException) as exc:
        await rp.verify_payment(req, user={'_id': 'u1'}, bg=MagicMock())
    assert exc.value.status_code == 409


def test_webhook_never_reopens_settled_orders():
    import inspect
    import routes_payments as rp
    src = inspect.getsource(rp.razorpay_webhook)
    assert "{'$ne': 'paid'}" not in src and src.count("'$nin': list(SETTLED)") == 2
    assert {'refunded', 'partially_refunded', 'paid'} <= rp.SETTLED


# ── suspended login ───────────────────────────────────────────────────────────
def test_suspended_user_cannot_get_a_token():
    import routes_auth
    with pytest.raises(HTTPException) as exc:
        routes_auth._ensure_not_suspended({'_id': 'u1', 'suspended': True})
    assert exc.value.status_code == 403 and 'suspended' in exc.value.detail
    routes_auth._ensure_not_suspended({'_id': 'u1'})


# ── newsletter campaigns ──────────────────────────────────────────────────────
def test_campaign_body_is_escaped_and_formatted():
    out = camp.render_body('Hi <script>x</script>\n\n**New** rules: https://wehive.co.in/visa.')
    assert '<script>' not in out and '&lt;script&gt;' in out
    assert '<strong>New</strong>' in out
    assert '<a href="https://wehive.co.in/visa"' in out and out.count('<p ') == 2


@pytest.mark.asyncio
async def test_campaign_send_requires_matching_audience(monkeypatch):
    monkeypatch.setattr(camp, 'campaigns_col', MagicMock(find_one=AsyncMock(return_value=None)))
    monkeypatch.setattr(camp, 'newsletter_col', MagicMock(count_documents=AsyncMock(return_value=42)))
    with pytest.raises(HTTPException) as exc:
        await camp.send_campaign(camp.SendBody(subject='Hello', body='Some news for you', expected_recipients=40),
                                 MagicMock(), admin={'_id': 'a'})
    assert exc.value.status_code == 409 and '42' in exc.value.detail


@pytest.mark.asyncio
async def test_only_one_campaign_sends_at_a_time(monkeypatch):
    monkeypatch.setattr(camp, 'campaigns_col', MagicMock(find_one=AsyncMock(return_value={'_id': 'c0'})))
    with pytest.raises(HTTPException) as exc:
        await camp.send_campaign(camp.SendBody(subject='Hello', body='Some news for you', expected_recipients=1),
                                 MagicMock(), admin={'_id': 'a'})
    assert exc.value.status_code == 409


# ── suspicious documents ──────────────────────────────────────────────────────
ICAO_LINE2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'  # ICAO 9303 specimen


def test_mrz_specimen_passes_and_tampering_fails():
    ok = review.parse_mrz_line2(ICAO_LINE2)
    assert ok['failed'] == [] and ok['passport_number'] == 'L898902C3'
    assert ok['date_of_birth'] == date(1974, 8, 12) and ok['expiry_date'] == date(2012, 4, 15)
    forged = ICAO_LINE2.replace('L898902C3', 'L898902C4')
    assert 'passport_number' in review.parse_mrz_line2(forged)['failed']
    assert review.parse_mrz_line2('too short') is None


def test_scan_flags_rank_problems():
    today = date(2026, 10, 17)
    scan = {'kind': 'passport', 'extracted': {
        'mrz_line2': ICAO_LINE2, 'passport_number': 'L898902C3', 'date_of_birth': '1974-08-12', 'expiry_date': '2013-04-15',
        'full_name': 'Anna Maria Eriksson', 'confidence': 40, 'warnings': ['Photo area looks edited'],
    }}
    kinds = [f['kind'] for f in review.scan_flags(scan, 'Rahul Verma', today)]
    assert kinds[0] == 'mrz_mismatch'  # printed expiry ≠ MRZ expiry
    assert set(kinds) == {'mrz_mismatch', 'expired', 'name_mismatch', 'low_confidence', 'ai_warnings'}


def test_clean_scan_has_no_flags():
    scan = {'kind': 'document', 'extracted': {'issued_to': 'Rahul Verma', 'valid_until': '2027-01-01', 'confidence': 92,
                                              'warnings': [], 'issuer_verification': {'found': True}}}
    assert review.scan_flags(scan, 'Rahul K Verma', date(2026, 10, 17)) == []
    scan['extracted']['issuer_verification'] = {'found': False, 'query': 'Bank of Nowhere'}
    assert [f['kind'] for f in review.scan_flags(scan, 'Rahul Verma', date(2026, 10, 17))] == ['issuer_unknown']


@pytest.mark.asyncio
async def test_marking_suspicious_needs_a_note_and_adds_case_note(monkeypatch):
    monkeypatch.setattr(review, 'scans', MagicMock(find_one=AsyncMock(return_value={'_id': 's1', 'application_id': 'app1', 'kind': 'passport'}),
                                                   update_one=AsyncMock()))
    notes = MagicMock(insert_one=AsyncMock())
    monkeypatch.setattr(review, 'internal_notes', notes)
    monkeypatch.setattr(review, 'audit_record', AsyncMock())
    with pytest.raises(HTTPException):
        await review.admin_review_scan('s1', review.ReviewDecision(decision='suspicious'), admin={'_id': 'a'})
    await review.admin_review_scan('s1', review.ReviewDecision(decision='suspicious', note='MRZ does not add up'), admin={'_id': 'a'})
    assert notes.insert_one.await_args.args[0]['application_id'] == 'app1'
    assert 'MRZ does not add up' in notes.insert_one.await_args.args[0]['text']


def test_mrz_date_century():
    assert review._mrz_date('991231', future=False) == date(1999, 12, 31)
    assert review._mrz_date('310101', future=True) == date(2031, 1, 1)
    assert review._mrz_date('xx0101', future=True) is None
    assert (date.today() - timedelta(days=1)) < date.today()


# ── mandatory 2FA ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_required_2fa_only_allows_enrolment(monkeypatch):
    import config
    import db
    monkeypatch.setattr(config, 'ADMIN_REQUIRE_2FA', True)
    monkeypatch.setattr(db, 'users', _users({'_id': 'a1', 'is_admin': True, 'email': 'a@x.com'}))
    tok = f'Bearer {admin_auth.sign_admin_jwt("a1")}'

    def req(method, path):
        return MagicMock(method=method, url=MagicMock(path=path))

    with pytest.raises(HTTPException) as exc:
        await admin_auth.get_current_admin_flex(tok, req('GET', '/api/admin/metrics'))
    assert exc.value.detail == admin_auth.TWO_FACTOR_SETUP_REQUIRED
    for path in ('/api/admin-auth/me', '/api/admin-auth/2fa/setup', '/api/admin-auth/2fa/enable'):
        assert (await admin_auth.get_current_admin_flex(tok, req('POST', path)))['_id'] == 'a1'
    monkeypatch.setattr(config, 'ADMIN_REQUIRE_2FA', False)
    assert (await admin_auth.get_current_admin_flex(tok, req('GET', '/api/admin/metrics')))['_id'] == 'a1'
