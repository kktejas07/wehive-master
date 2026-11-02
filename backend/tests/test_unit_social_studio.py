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


def test_user_email_carries_poster_image():
    import notify
    html = notify._email_html('Diwali offer', 'Up to 4 travellers.', 'https://wehive.co.in', 'https://cdn.x/p.png')
    assert '<img src="https://cdn.x/p.png"' in html and 'Open in WeHive' in html
    assert '<img' not in notify._email_html('t', 'b', None)


@pytest.mark.asyncio
async def test_custom_list_whatsapp_needs_consent(monkeypatch):
    import routes_announcements as ra
    from fastapi import BackgroundTasks, HTTPException
    monkeypatch.setattr(ra, 'announcements_col', MagicMock(find_one=AsyncMock(return_value=None), insert_one=AsyncMock()))
    monkeypatch.setattr(ra, 'audit_record', AsyncMock())
    body = dict(title='Diwali offer', message='Up to 4 travellers for 999.', audience='custom',
                channels={'inapp': False, 'email': True, 'whatsapp': True},
                recipients={'emails': ['A@x.com', 'a@x.com'], 'phones': ['+919000666149']})
    with pytest.raises(HTTPException) as exc:
        await ra.send_announcement(ra.SendBody(**body), BackgroundTasks(), admin={'_id': 'a'})
    assert exc.value.status_code == 400 and 'WhatsApp' in exc.value.detail
    out = await ra.send_announcement(ra.SendBody(**body, whatsapp_consent=True), BackgroundTasks(), admin={'_id': 'a'})
    assert out['recipients'] == 2  # one email after de-duplication + one phone


@pytest.mark.asyncio
async def test_opt_out_link_is_signed_and_blocks_future_sends(monkeypatch):
    import routes_announcements as ra
    from fastapi import HTTPException
    store = {}

    async def upd(q, u, upsert=False):
        new = q['_id'] not in store
        store.setdefault(q['_id'], u['$setOnInsert'])
        return MagicMock(upserted_id=q['_id'] if new else None)

    class Cur:
        def __init__(self, ids):
            self.ids = ids

        def __aiter__(self):
            async def gen():
                for i in self.ids:
                    yield {'_id': i}
            return gen()

    monkeypatch.setattr(ra, 'opt_outs_col', MagicMock(update_one=upd,
                        find=lambda q, p: Cur([i for i in q['_id']['$in'] if i in store])))
    url = ra.opt_out_url('ravi@x.com')
    sig = url.split('t=')[1]
    with pytest.raises(HTTPException):
        await ra.opt_out(v='ravi@x.com', t='0' * 24)
    await ra.opt_out(v='ravi@x.com', t=sig)
    assert await ra._without_opt_outs(['ravi@x.com', 'sita@y.in']) == ['sita@y.in']


def test_leads_audience_requires_offers_opt_in():
    import routes_announcements as ra
    consent = ra.LEADS_QUERY['$and'][1]['$or']
    assert {'marketing_consent_at': {'$exists': True, '$ne': None}} in consent and {'type': 'social'} in consent
