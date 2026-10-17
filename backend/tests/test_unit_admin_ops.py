"""Admin ops: suspension guards + enforcement, funnel maths, RAG upload text extraction."""
import io
import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import auth_utils  # noqa: E402
import routes_admin_ops as ops  # noqa: E402


def _users(doc):
    return MagicMock(find_one=AsyncMock(return_value=doc), update_one=AsyncMock())


# ── suspension ────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_cannot_suspend_self():
    with pytest.raises(HTTPException) as exc:
        await ops.admin_suspend_user('a1', ops.SuspendBody(reason='spam'), admin={'_id': 'a1'})
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_cannot_suspend_super_admin(monkeypatch):
    monkeypatch.setattr(ops, 'ADMIN_EMAILS', {'owner@example.com'})
    monkeypatch.setattr(ops, 'users', _users({'_id': 'u1', 'email': 'Owner@example.com'}))
    with pytest.raises(HTTPException) as exc:
        await ops.admin_suspend_user('u1', ops.SuspendBody(reason='spam'), admin={'_id': 'a1', 'email': 'x@example.com'})
    assert exc.value.status_code == 403
    ops.users.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_invited_admin_cannot_suspend_another_admin(monkeypatch):
    monkeypatch.setattr(ops, 'ADMIN_EMAILS', set())
    monkeypatch.setattr(ops, 'is_super_admin', lambda u: False)
    monkeypatch.setattr(ops, 'users', _users({'_id': 'u1', 'email': 'peer@example.com', 'is_admin': True}))
    with pytest.raises(HTTPException) as exc:
        await ops.admin_suspend_user('u1', ops.SuspendBody(reason='spam'), admin={'_id': 'a1'})
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_suspend_sets_flag_and_audits(monkeypatch):
    coll = _users({'_id': 'u1', 'email': 'user@example.com'})
    monkeypatch.setattr(ops, 'ADMIN_EMAILS', set())
    monkeypatch.setattr(ops, 'users', coll)
    audit = AsyncMock()
    monkeypatch.setattr(ops, 'audit_record', audit)
    await ops.admin_suspend_user('u1', ops.SuspendBody(reason='  chargeback fraud '), admin={'_id': 'a1'})
    update = coll.update_one.await_args.args[1]['$set']
    assert update['suspended'] is True and update['suspended_reason'] == 'chargeback fraud'
    assert audit.await_args.args[1] == 'suspend'


def test_suspend_requires_reason():
    with pytest.raises(Exception):
        ops.SuspendBody(reason='')


@pytest.mark.asyncio
async def test_suspended_user_token_is_rejected(monkeypatch):
    import db
    monkeypatch.setattr(db, 'users', _users({'_id': 'u1', 'suspended': True}))
    token = auth_utils.sign_jwt('u1')
    with pytest.raises(HTTPException) as exc:
        await auth_utils.get_current_user(f'Bearer {token}')
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_suspended_admin_is_rejected(monkeypatch):
    import admin_auth
    import db
    monkeypatch.setattr(db, 'users', _users({'_id': 'u1', 'is_admin': True, 'suspended': True}))
    token = auth_utils.sign_jwt('u1')
    with pytest.raises(HTTPException) as exc:
        await admin_auth.get_current_admin_flex(f'Bearer {token}')
    assert exc.value.status_code == 403


# ── funnel ────────────────────────────────────────────────────────────────────
def test_funnel_conversion_percentages():
    steps = ops._funnel_steps({'signups': 200, 'started': 50, 'submitted': 20, 'paid': 10, 'approved': 0})
    assert [s['count'] for s in steps] == [200, 50, 20, 10, 0]
    assert steps[0]['from_previous'] is None and steps[0]['from_top'] == 100.0
    assert steps[1]['from_previous'] == 25.0 and steps[3]['from_top'] == 5.0
    assert steps[4]['from_previous'] == 0.0


def test_funnel_with_no_signups_has_no_division_by_zero():
    steps = ops._funnel_steps({})
    assert all(s['count'] == 0 and s['from_top'] is None for s in steps)


# ── RAG uploads ───────────────────────────────────────────────────────────────
def test_extract_text_rejects_other_types():
    with pytest.raises(HTTPException) as exc:
        ops.extract_text('virus.exe', b'MZ' * 50)
    assert exc.value.status_code == 400


def test_extract_text_normalises_plain_text():
    text = ops.extract_text('Notes.MD', b'# Schengen\n\n\n\n\nApply   90 days\tbefore travel.')
    assert text == '# Schengen\n\nApply 90 days before travel.'


def test_extract_text_rejects_empty():
    with pytest.raises(HTTPException):
        ops.extract_text('blank.txt', b'   \n  ')


def test_extract_text_reads_pdf():
    pypdf = pytest.importorskip('pypdf')
    w = pypdf.PdfWriter()
    w.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    w.write(buf)
    with pytest.raises(HTTPException) as exc:  # a blank page has no text → asks for OCR
        ops.extract_text('scan.pdf', buf.getvalue())
    assert 'OCR' in exc.value.detail
    with pytest.raises(HTTPException) as exc:
        ops.extract_text('broken.pdf', b'%PDF-1.4 not really')
    assert exc.value.status_code == 400


def test_chatbot_searches_uploaded_documents():
    import routes_chatbot
    assert ops.KB_COLLECTION in routes_chatbot.RAG_COLLECTIONS
