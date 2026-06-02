"""Lightweight admin audit logging.

Every admin write (PATCH/POST/DELETE on /api/admin/*) is recorded as a row
in the `admin_audit` Mongo collection. The Overview tab consumes this via
GET /api/admin/audit?limit=N.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from db import db

logger = logging.getLogger('wehive.audit')

audit_col = db['admin_audit']


def _summarize(value: Any, max_len: int = 200) -> Any:
    """Avoid logging huge blobs (e.g. categories dicts)."""
    if isinstance(value, (dict, list)):
        s = repr(value)
        if len(s) > max_len:
            return s[:max_len] + '…'
        return value
    if isinstance(value, str) and len(value) > max_len:
        return value[:max_len] + '…'
    return value


async def record(
    admin: dict,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    *,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    extra: Optional[dict] = None,
) -> None:
    """Persist one audit row. Failures are swallowed — auditing must never
    break the request path. Use field-level diff (before vs after) so the UI
    can show 'GST rate 0.18 → 0.20' style messages.
    """
    try:
        diff: Optional[dict] = None
        if before is not None and after is not None:
            diff = {}
            for k in set(before.keys()) | set(after.keys()):
                b = before.get(k)
                a = after.get(k)
                if b != a:
                    diff[k] = {'from': _summarize(b), 'to': _summarize(a)}
        doc = {
            'at': datetime.utcnow(),
            'admin_id': admin.get('_id'),
            'admin_email': admin.get('email'),
            'admin_name': admin.get('name'),
            'action': action,                # 'update' | 'delete' | 'create'
            'entity_type': entity_type,      # 'user' | 'application' | 'country' | 'pricing' | 'event' | 'staff' | 'integration'
            'entity_id': entity_id,
            'summary': _summarize(after) if after is not None else _summarize(extra),
            'diff': diff,
            'extra': _summarize(extra) if extra else None,
        }
        await audit_col.insert_one(doc)
    except Exception as e:  # noqa: BLE001
        logger.warning('audit log failed: %s', e)


async def recent(limit: int = 20) -> list[dict]:
    """Return the most recent audit rows as JSON-safe dicts."""
    out = []
    async for row in audit_col.find({}).sort('at', -1).limit(limit):
        out.append({
            'id': str(row.get('_id')),
            'at': row['at'].isoformat() if isinstance(row.get('at'), datetime) else row.get('at'),
            'admin_id': row.get('admin_id'),
            'admin_email': row.get('admin_email'),
            'admin_name': row.get('admin_name'),
            'action': row.get('action'),
            'entity_type': row.get('entity_type'),
            'entity_id': row.get('entity_id'),
            'summary': row.get('summary'),
            'diff': row.get('diff'),
        })
    return out
