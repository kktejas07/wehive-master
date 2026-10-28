"""Dispatcher for scheduled broadcasts (newsletter campaigns + announcements).

Polls both collections; a due item is claimed (scheduled → sending) and delivered
inline, one at a time. Safe to run as a single asyncio task from server startup.
"""
import asyncio
import logging

logger = logging.getLogger('wehive.broadcast')


async def dispatch_due() -> dict:
    from routes_newsletter_campaigns import dispatch_due_campaigns
    from routes_announcements import dispatch_due_announcements
    started = {'campaigns': 0, 'announcements': 0}
    try:
        started['campaigns'] = await dispatch_due_campaigns()
    except Exception:
        logger.exception('Scheduled campaign dispatch failed')
    try:
        started['announcements'] = await dispatch_due_announcements()
    except Exception:
        logger.exception('Scheduled announcement dispatch failed')
    return started


async def mark_interrupted_on_boot() -> None:
    from routes_newsletter_campaigns import mark_interrupted_on_boot as campaigns_boot
    from routes_announcements import mark_interrupted_on_boot as announcements_boot
    try:
        await campaigns_boot()
    except Exception:
        logger.exception('Campaign boot cleanup failed')
    try:
        await announcements_boot()
    except Exception:
        logger.exception('Announcement boot cleanup failed')


def start_broadcast_scheduler(interval_seconds: int = 60) -> None:
    async def _loop():
        while True:
            await asyncio.sleep(interval_seconds)
            await dispatch_due()

    try:
        asyncio.get_event_loop().create_task(_loop())
    except Exception as exc:
        logger.debug('Broadcast scheduler not started: %s', exc)
