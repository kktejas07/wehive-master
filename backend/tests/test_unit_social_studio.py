"""Social Studio admin endpoints: manual social enquiries land in leads; calendar/branch state merges."""
from unittest.mock import AsyncMock, MagicMock

import pytest

import routes_admin_backoffice as bo


@pytest.mark.asyncio
async def test_social_lead_is_saved_with_ref_and_readable_message(monkeypatch):
    coll = MagicMock(insert_one=AsyncMock())
    monkeypatch.setattr(bo, 'leads', coll)
    monkeypatch.setattr(bo, 'audit_record', AsyncMock())
    body = bo.SocialLeadCreate(name='Ravi', phone='9000000000', interest='EB-1A / EB-2 NIW', destination='USA',
                               ref='wh-1102', platform='Instagram', branch='manikonda')
    out = await bo.admin_create_lead(body, admin={'_id': 'a1'})
    rec = coll.insert_one.await_args.args[0]
    assert rec['type'] == 'social' and rec['ref'] == 'WH-1102' and rec['source'] == 'Instagram'
    assert rec['message'].startswith('Social enquiry via Instagram (ref wh-1102)')
    assert out['ref'] == 'WH-1102' and out['status'] == 'new' and out['branch'] == 'manikonda'


@pytest.mark.asyncio
async def test_social_studio_state_merges_calendar(monkeypatch):
    import settings_service
    store = {'calendar': {'WH-1102': 'designed'}, 'branches': {'miyapur': '90006 66149'}}
    monkeypatch.setattr(settings_service, 'get_all', AsyncMock(return_value=dict(store)))
    saved = AsyncMock()
    monkeypatch.setattr(settings_service, 'set_all', saved)
    monkeypatch.setattr(bo, 'audit_record', AsyncMock())
    out = await bo.admin_put_social_studio(bo.StudioPatch(calendar={'WH-1103': 'posted'}), admin={'_id': 'a1'})
    assert out['calendar'] == {'WH-1102': 'designed', 'WH-1103': 'posted'}
    assert out['branches'] == {'miyapur': '90006 66149'}
    assert saved.await_args.args[0] == 'social_studio'


def test_social_studio_rejects_unknown_status():
    with pytest.raises(Exception):
        bo.StudioPatch(calendar={'WH-1102': 'published'})
