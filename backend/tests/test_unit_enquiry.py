"""Landing-page visa enquiry: validation, storage shape, honeypot, admin filter."""
import os
import sys
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import routes_admin_backoffice as backoffice  # noqa: E402
import routes_leads  # noqa: E402

GOOD = dict(purpose='student_f1', name='  Priya   Sharma ', email='Priya@Example.com', phone='+91 98765 43210',
            destination='United States', travel_date=(date.today() + timedelta(days=60)).isoformat(),
            travellers=1, message='Fall intake, need I-20 guidance', consent=True)


def test_enquiry_normalises_and_validates():
    e = routes_leads.EnquiryCreate(**GOOD)
    assert e.name == 'Priya Sharma' and e.phone == '+919876543210'
    for bad in ({'purpose': 'holiday'}, {'phone': '12'}, {'email': 'nope'},
                {'travel_date': (date.today() - timedelta(days=1)).isoformat()}, {'travellers': 0}):
        with pytest.raises(ValidationError):
            routes_leads.EnquiryCreate(**{**GOOD, **bad})


@pytest.mark.asyncio
async def test_enquiry_is_stored_as_a_lead(monkeypatch):
    coll = MagicMock(insert_one=AsyncMock())
    monkeypatch.setattr(routes_leads, 'leads', coll)
    bg = MagicMock()
    out = await routes_leads.create_enquiry(routes_leads.EnquiryCreate(**GOOD), bg)
    rec = coll.insert_one.await_args.args[0]
    assert out['ok'] and rec['type'] == 'enquiry' and rec['status'] == 'new'
    assert rec['email'] == 'priya@example.com' and rec['purpose'] == 'student_f1' and rec['destination'] == 'United States'
    assert rec['message'].startswith('Student (F-1 / study) visa enquiry for United States')
    assert 'Fall intake' in rec['message'] and 'Phone: +919876543210' in rec['message']
    assert bg.add_task.called


@pytest.mark.asyncio
async def test_enquiry_needs_consent_and_ignores_bots(monkeypatch):
    coll = MagicMock(insert_one=AsyncMock())
    monkeypatch.setattr(routes_leads, 'leads', coll)
    with pytest.raises(HTTPException):
        await routes_leads.create_enquiry(routes_leads.EnquiryCreate(**{**GOOD, 'consent': False}), MagicMock())
    out = await routes_leads.create_enquiry(routes_leads.EnquiryCreate(**{**GOOD, 'website': 'http://spam'}), MagicMock())
    assert out == {'ok': True, 'id': None}
    coll.insert_one.assert_not_called()


def test_admin_can_filter_leads_by_purpose():
    assert backoffice._lead_filter('all', None, 'business') == {'purpose': 'business'}
    lead = backoffice._lead({'_id': 'l1', 'name': 'A', 'type': 'enquiry', 'purpose': 'tourist', 'phone': '+911234567890'})
    assert lead['purpose'] == 'tourist' and lead['type'] == 'enquiry' and lead['phone'] == '+911234567890'
    assert backoffice._lead({'_id': 'l2', 'name': 'B'})['type'] == 'contact'  # old contact-form leads


@pytest.mark.asyncio
async def test_enquiry_records_referring_branch(monkeypatch):
    coll = MagicMock(insert_one=AsyncMock())
    monkeypatch.setattr(routes_leads, 'leads', coll)
    await routes_leads.create_enquiry(routes_leads.EnquiryCreate(**{**GOOD, 'branch': 'habsiguda'}), MagicMock())
    rec = coll.insert_one.await_args.args[0]
    assert rec['branch'] == 'habsiguda' and 'Referred by location: Habsiguda, Hyderabad' in rec['message']
    with pytest.raises(ValidationError):
        routes_leads.EnquiryCreate(**{**GOOD, 'branch': 'mars'})
    assert routes_leads.EnquiryCreate(**GOOD).branch is None
    assert backoffice._lead_filter('all', None, None, 'manikonda') == {'branch': 'manikonda'}
    assert backoffice._lead({'_id': 'l2', 'branch': 'ballari'})['branch'] == 'ballari'
