"""Admin case management: deadline alert rules, document review guards, assignment."""
import os
import sys
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import routes_admin_cases as cases  # noqa: E402

TODAY = date(2026, 10, 16)


def _kinds(app, **kw):
    return [a['kind'] for a in cases._case_alerts(app, TODAY, **kw)]


def test_alerts_flag_everything_urgent_most_severe_first():
    app = {
        'status': 'in_review',
        'updated_at': datetime(2026, 10, 1),
        'travel_date': '2026-10-24',
        'visa_appointment': {'date': '2026-10-18'},
        'form_data': {'expiry_date': '2027-01-10'},
        'documents': [{'status': 'uploaded'}, {'status': 'approved'}],
    }
    alerts = cases._case_alerts(app, TODAY)
    assert [a['severity'] for a in alerts] == sorted([a['severity'] for a in alerts], key=['critical', 'warning', 'info'].index)
    assert set(a['kind'] for a in alerts) == {'stale', 'appointment', 'travel_soon', 'passport_expiring', 'documents_pending'}
    assert next(a for a in alerts if a['kind'] == 'documents_pending')['message'].startswith('1 document')


def test_closed_cases_and_far_dates_raise_nothing():
    assert _kinds({'status': 'approved', 'travel_date': '2026-10-17'}) == []
    assert _kinds({'status': 'submitted', 'updated_at': datetime(2026, 10, 15), 'travel_date': '2027-06-01',
                   'visa_appointment': {'date': '2027-01-01'}, 'form_data': {'expiry_date': '2030-01-01'}}) == []


def test_bad_dates_are_ignored():
    assert _kinds({'status': 'submitted', 'updated_at': datetime(2026, 10, 15), 'travel_date': 'next week',
                   'form_data': {'expiry_date': ''}}) == []


def test_stale_threshold_is_configurable():
    app = {'status': 'submitted', 'updated_at': datetime(2026, 10, 12)}
    assert _kinds(app) == []
    assert _kinds(app, stale_days=3) == ['stale']


@pytest.mark.asyncio
async def test_rejecting_a_document_needs_a_reason():
    with pytest.raises(HTTPException) as exc:
        await cases.admin_review_document('a1', 'd1', cases.DocReview(status='rejected', reason='  '), admin={'_id': 'x'})
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_assign_only_to_staff(monkeypatch):
    monkeypatch.setattr(cases, 'applications', MagicMock(find_one=AsyncMock(return_value={'_id': 'a1'}), update_one=AsyncMock()))
    monkeypatch.setattr(cases, 'users', MagicMock(find_one=AsyncMock(return_value=None)))
    with pytest.raises(HTTPException) as exc:
        await cases.admin_assign('a1', cases.AssignBody(staff_id='random-user'), admin={'_id': 'x'})
    assert exc.value.status_code == 404
    cases.applications.update_one.assert_not_called()


def test_case_alert_dates_tolerate_datetimes():
    assert cases._date(datetime(2026, 1, 2, 3, 4)) == date(2026, 1, 2)
    assert cases._date('2026-01-02T10:00:00') == date(2026, 1, 2)
    assert cases._date(None) is None and cases._date('garbage') is None
    assert (TODAY + timedelta(days=1)).isoformat() == '2026-10-17'
