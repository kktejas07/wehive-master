"""Daily Drafts Agent: auto-generate Social Studio drafts from recent aggregated news.

Called manually via POST /api/admin/social-studio/daily-drafts or from a scheduler.
Picks the most recent news items that haven't been drafted yet, generates post fields
using the same AI logic as the single-draft endpoint, and stores them in social_drafts.
"""
import logging
from datetime import datetime, timezone

from db import db, global_news_col

logger = logging.getLogger('wehive.daily_drafts')
social_drafts_col = db['social_drafts']


async def run_daily_drafts(limit: int = 5) -> dict:
    """Generate up to *limit* drafts from recent undrafted news items."""
    already = {d['news_id'] async for d in social_drafts_col.find({}, {'news_id': 1})}

    cursor = global_news_col.find(
        {'draft_generated': {'$ne': True}},
        sort=[('created_at', -1)],
    ).limit(limit * 2)

    candidates = []
    async for doc in cursor:
        nid = str(doc['_id'])
        if nid not in already:
            candidates.append(doc)
        if len(candidates) >= limit:
            break

    if not candidates:
        logger.info('Daily drafts: no undrafted news items found')
        return {'generated': 0, 'skipped': 0}

    from routes_social_studio import SYSTEM, SHAPE, _clip, _fallback
    generated, skipped = 0, 0

    for news in candidates:
        nid = str(news['_id'])
        fields = _fallback(news, '')
        ai = False
        try:
            from ai_marketplace import marketplace
            import json
            import re
            source = (f"Title: {news['title']}\nPublisher: {news.get('source_name', '')}\n"
                      f"Date: {news.get('date') or ''}\nText: {_clip(news.get('content'), 1500)}")
            prompt = (f"{source}\n\nWrite one post as JSON with keys eyebrow (max 5 words), "
                      f"headline (max 12 words; wrap the 1-3 most important words in *stars*), "
                      f"body (max 30 words), items, cta (max 7 words), tags (4-6 hashtags in one line). "
                      f"{SHAPE['alert']}. Use \\n between item lines.")
            raw = await marketplace.chat('anonymous', SYSTEM, prompt, max_tokens=600)
            m = re.search(r'\{.*\}', raw or '', re.DOTALL)
            data = json.loads(m.group(0)) if m else {}
            limits = {'eyebrow': 40, 'headline': 110, 'body': 260, 'items': 600, 'cta': 60, 'tags': 160}
            got = {k: str(data[k]).replace('\\n', '\n').strip()[:n] for k, n in limits.items() if data.get(k)}
            if got.get('headline'):
                fields, ai = {**fields, **got}, True
        except Exception as e:
            logger.warning('Daily draft for %s fell back to news text: %s', nid, type(e).__name__)

        # Always cite the real source
        fields['items'] = _fallback(news, '')['items']

        await social_drafts_col.insert_one({
            'news_id': nid,
            'fields': fields,
            'ai': ai,
            'status': 'pending',
            'source_url': news.get('source_url'),
            'news_title': news.get('title', ''),
            'created_at': datetime.now(timezone.utc),
        })
        await global_news_col.update_one({'_id': news['_id']}, {'$set': {'draft_generated': True}})
        generated += 1
        logger.info('Generated draft for news %s: %s', nid, fields.get('headline', '')[:60])

    logger.info('Daily drafts done: %d generated, %d skipped', generated, skipped)
    return {'generated': generated, 'skipped': skipped}
