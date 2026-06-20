"""Centralized settings service — all dynamic config stored in MongoDB settings collection.

Every module reads config through this service instead of os.environ directly,
so admin can change values via the dashboard without restarting the server.
"""

import os
from datetime import datetime
from db import db

settings_col = db['settings']

_cache: dict[str, dict] = {}
_cache_ts: float = 0
_CACHE_TTL = 30  # seconds


async def _load(namespace: str) -> dict:
    doc = await settings_col.find_one({'_id': namespace})
    return (doc or {}).get('config', {})


async def get(namespace: str, key: str, default=None):
    doc = await _load(namespace)
    return doc.get(key, default)


async def get_all(namespace: str) -> dict:
    return await _load(namespace)


async def set_all(namespace: str, config: dict):
    await settings_col.update_one(
        {'_id': namespace},
        {'$set': {'config': config, 'updated_at': datetime.utcnow()}},
        upsert=True,
    )


async def get_razorpay_keys() -> tuple[str, str, str]:
    cfg = await _load('razorpay')
    key_id = cfg.get('key_id') or os.environ.get('RAZORPAY_KEY_ID', '')
    key_secret = cfg.get('key_secret') or os.environ.get('RAZORPAY_KEY_SECRET', '')
    webhook_secret = cfg.get('webhook_secret') or os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')
    return key_id, key_secret, webhook_secret


async def get_firebase_config() -> dict:
    cfg = await _load('firebase')
    return cfg if cfg else {}


async def get_smtp_config() -> dict:
    return await _load('smtp')


async def get_twilio_config() -> dict:
    return await _load('twilio')


async def get_general_config() -> dict:
    return await _load('general')


async def get_notification_config() -> dict:
    return await _load('notifications')


async def get_branding_config() -> dict:
    return await _load('branding')


async def get_r2_config() -> dict:
    return await _load('r2')


async def get_default_llm_config() -> dict:
    return await _load('default_llm')
