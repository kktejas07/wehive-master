import threading
from typing import Optional

from db import db
from fee_calculator import DEFAULT_BASE_FEE_BY_TYPE, DEFAULT_SURCHARGE_INR, DEFAULT_GST_RATE

settings_col = db['settings']

_pricing_cache: Optional[dict] = None
_pricing_lock = threading.Lock()


async def load_pricing() -> dict:
    """Read pricing config from `settings.pricing`, fall back to defaults."""
    global _pricing_cache
    if _pricing_cache is not None:
        return _pricing_cache
    doc = await settings_col.find_one({'_id': 'pricing'}) or {}
    cfg = {
        'base_fees': {**DEFAULT_BASE_FEE_BY_TYPE, **(doc.get('base_fees') or {})},
        'surcharge_inr': int(doc.get('surcharge_inr', DEFAULT_SURCHARGE_INR)),
        'gst_rate': float(doc.get('gst_rate', DEFAULT_GST_RATE)),
        'currency': doc.get('currency', 'INR'),
        'updated_at': doc.get('updated_at'),
    }
    with _pricing_lock:
        _pricing_cache = cfg
    return cfg


def invalidate_pricing_cache():
    global _pricing_cache
    _pricing_cache = None