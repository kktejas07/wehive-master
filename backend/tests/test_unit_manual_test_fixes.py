"""Regressions for bugs found by hands-on testing of the user and admin journeys."""
import os
import sys
import types
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import ai_marketplace as am  # noqa: E402
import routes_admin_cases as cases  # noqa: E402
import routes_offers as offers  # noqa: E402
from agents import document_validator as dv  # noqa: E402
from viewmodels import application_viewmodel as avm  # noqa: E402


# ── a user's application list ─────────────────────────────────────────────────

def test_application_list_item_carries_what_the_cards_render():
    """The account page crashed on `country_id.toUpperCase()` because the list left it out."""
    now = datetime(2026, 11, 14, 0, 8)
    item = avm._serialize_app({
        '_id': 'a1', 'country_id': 'fr', 'visa_type': 'Tourist', 'status': 'submitted', 'travel_date': '2026-12-05',
        'applicants': 2, 'form_data': {'university_name': 'TU Munich'}, 'created_at': now, 'updated_at': now,
    })
    assert item['country_id'] == 'fr' and item['visa_type'] == 'Tourist' and item['status'] == 'submitted'
    assert item['travel_date'] == '2026-12-05' and item['applicants'] == 2
    assert item['form_data'] == {'university_name': 'TU Munich'}
    assert item['created_at'] == '2026-11-14T00:08:00'


def test_application_list_item_tolerates_sparse_records():
    item = avm._serialize_app({'_id': 'a2', 'form_data': None, 'created_at': 'x', 'updated_at': 'y'})
    assert item['country_id'] == '' and item['form_data'] == {} and item['destination'] == ''
    assert item['applicants'] == 1 and item['status'] == 'draft'


# ── automatic document check ──────────────────────────────────────────────────

async def _run_validator(monkeypatch, filename, size):
    apps = MagicMock(update_one=AsyncMock())
    notes = MagicMock(insert_one=AsyncMock())
    monkeypatch.setitem(sys.modules, 'db', types.SimpleNamespace(applications=apps, notifications_col=notes))
    await dv.validate_document_background('app1', 'doc1', 'u1', b'x' * min(size, 10), filename, size)
    return apps.update_one.await_args.args[1]['$set'], notes.insert_one.await_args.args[0]


@pytest.mark.asyncio
async def test_a_usable_upload_waits_for_a_consultant_and_is_not_called_verified(monkeypatch):
    """Any readable file used to be marked "verified" at once, even the wrong document."""
    update, notification = await _run_validator(monkeypatch, 'passport.jpg', 250_000)
    assert update['documents.$.status'] == 'reviewing'
    assert 'consultant' in update['documents.$.note']
    assert notification['title'] == 'Document received' and 'verified' not in notification['title'].lower()


@pytest.mark.asyncio
@pytest.mark.parametrize('filename,size,reason', [('empty.pdf', 0, 'empty'), ('thumb.png', 2_000, 'resolution')])
async def test_an_unusable_upload_asks_for_a_new_file(monkeypatch, filename, size, reason):
    update, notification = await _run_validator(monkeypatch, filename, size)
    assert update['documents.$.status'] == 'needs_reupload'
    assert reason in update['documents.$.note'].lower()
    assert notification['severity'] == 'warning'


# ── admin case status ─────────────────────────────────────────────────────────

# The options in the admin case page (STATUSES in frontend/src/components/admin/ApplicationCase.jsx).
ADMIN_UI_STATUSES = ['draft', 'submitted', 'in_review', 'awaiting_docs', 'appointment_scheduled', 'biometrics_done',
                     'interview_scheduled', 'visa_approved', 'visa_rejected', 'cancelled']


def test_every_status_the_admin_page_offers_is_accepted_and_labelled():
    for status in ADMIN_UI_STATUSES:
        assert status in cases.VALID_STATUSES, f'{status} would be rejected with a 400'
        assert status in cases._STATUS_LABELS, f'{status} would show a raw key in the timeline'


@pytest.mark.asyncio
async def test_admin_status_change_is_recorded_on_the_timeline(monkeypatch):
    app = {'_id': 'a1', 'user_id': 'u1', 'status': 'submitted', 'timeline': [{'status': 'submitted'}]}
    apps = MagicMock(find_one=AsyncMock(return_value=app), update_one=AsyncMock())
    monkeypatch.setattr(cases, 'applications', apps)
    monkeypatch.setattr(cases, '_app_or_404', AsyncMock(return_value=app))
    notify = AsyncMock()
    monkeypatch.setattr(cases, '_notify', notify)
    status_change = AsyncMock()
    monkeypatch.setitem(sys.modules, 'routes_chatbot', types.SimpleNamespace(notify_status_change=status_change))
    monkeypatch.setattr(cases, 'audit_record', AsyncMock(), raising=False)

    body = cases._StatusBody(status='interview_scheduled', note='20 Nov, 10:30 am, Hyderabad')
    await cases.admin_set_status('a1', body, admin={'email': 'admin@test.com'})

    update = apps.update_one.await_args.args[1]['$set']
    assert update['status'] == 'interview_scheduled'
    last = update['timeline'][-1]
    assert (last['status'], last['label'], last['note']) == ('interview_scheduled', 'Interview Scheduled', '20 Nov, 10:30 am, Hyderabad')
    # Exactly one notification per change (there used to be a specific one plus a generic one).
    notify.assert_not_awaited()
    status_change.assert_awaited_once()
    assert status_change.await_args.kwargs['title'] == 'Interview Scheduled'


@pytest.mark.asyncio
async def test_admin_status_rejects_unknown_values_and_a_rejection_without_a_reason(monkeypatch):
    with pytest.raises(HTTPException) as e:
        await cases.admin_set_status('a1', cases._StatusBody(status='teleported'), admin={})
    assert e.value.status_code == 400
    with pytest.raises(HTTPException) as e:
        await cases.admin_set_status('a1', cases._StatusBody(status='visa_rejected', note='  '), admin={})
    assert e.value.status_code == 400 and 'reason' in e.value.detail


# ── AI document generation without a model ────────────────────────────────────

@pytest.fixture
def no_model(monkeypatch):
    """No provider configured and no local model: only the visa-FAQ rule engine is left."""
    market = am.AIMarketplace.__new__(am.AIMarketplace)
    monkeypatch.setattr(market, 'get_active_provider', AsyncMock(return_value=(None, None)), raising=False)
    monkeypatch.setattr(market, '_check_quota', AsyncMock(return_value=True), raising=False)
    return market


@pytest.mark.asyncio
async def test_generation_never_returns_the_faq_engine_text_as_a_document(no_model, monkeypatch):
    """Cover letters and SOPs came back as a visa fee table marked "generated successfully"."""
    faq = AsyncMock(return_value=('💰 **Visa Fees for France** …', {'id': 'local', 'model': 'template-v1'}))
    monkeypatch.setitem(sys.modules, 'local_llm', types.SimpleNamespace(local_chat_with_info=faq))
    with pytest.raises(am.AIUnavailableError):
        await no_model.chat('u1', 'You are a visa consultant.', 'Write a cover letter for a France tourist visa.')
    faq.assert_awaited_once()


@pytest.mark.asyncio
async def test_generation_may_use_a_real_local_model(no_model, monkeypatch):
    local = AsyncMock(return_value=('Dear Visa Officer, …', {'id': 'local', 'model': 'llama3'}))
    monkeypatch.setitem(sys.modules, 'local_llm', types.SimpleNamespace(local_chat_with_info=local))
    assert await no_model.chat('u1', 'system', 'Write a cover letter.') == 'Dear Visa Officer, …'


@pytest.mark.asyncio
async def test_the_chat_assistant_still_answers_from_the_faq_engine(no_model, monkeypatch):
    faq = AsyncMock(return_value=('Visa fees for France …', {'id': 'local', 'model': 'template-v1'}))
    monkeypatch.setitem(sys.modules, 'local_llm', types.SimpleNamespace(local_chat_with_info=faq))
    reply, info = await no_model.chat_with_info('u1', 'system', 'What does a France visa cost?')
    assert reply == 'Visa fees for France …' and info['id'] == 'local'


def test_ai_unavailable_is_a_runtime_error_so_existing_handlers_still_catch_it():
    assert issubclass(am.AIUnavailableError, RuntimeError)


# ── admin offers list ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_offers_list_includes_inactive_offers_with_claim_counts(monkeypatch):
    """The admin Offers tab called GET /admin/offers, which did not exist (405)."""
    rows = [{'_id': 'o1', 'brand': 'Airtel', 'active': True}, {'_id': 'o2', 'brand': 'Nike', 'active': False}]

    async def gen():
        for r in rows:
            yield r
    cursor = MagicMock()
    cursor.sort.return_value.limit.return_value = gen()
    col = MagicMock(find=MagicMock(return_value=cursor))
    monkeypatch.setattr(offers, 'offers_col', col)
    monkeypatch.setattr(offers, 'offer_claims_col', MagicMock(count_documents=AsyncMock(side_effect=[3, 0])))
    monkeypatch.setattr(offers, '_out', lambda o: {'id': o['_id'], 'brand': o['brand'], 'active': o['active']})

    out = await offers.admin_list_offers(admin={'email': 'admin@test.com'})

    col.find.assert_called_once_with({})  # no active filter
    assert [(o['id'], o['active'], o['claim_count']) for o in out] == [('o1', True, 3), ('o2', False, 0)]
