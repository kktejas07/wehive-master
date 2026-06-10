from datetime import datetime
from typing import Optional

from config import ADMIN_EMAILS


def _serialize_datetime(val) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def public_user(u: dict, include_admin_flag: bool = False) -> dict:
    email = (u.get('email') or '').lower()
    is_admin = bool(u.get('is_admin', False)) or email in ADMIN_EMAILS
    result = {
        'id': u.get('_id'),
        'name': u.get('name'),
        'email': u.get('email'),
        'phone': u.get('phone'),
        'is_premium': bool(u.get('is_premium', False)),
        'is_staff': bool(u.get('is_staff', False)),
        'staff_role': u.get('staff_role'),
        'premium_since': _serialize_datetime(u.get('premium_since')),
        'created_at': _serialize_datetime(u.get('created_at')),
        'updated_at': _serialize_datetime(u.get('updated_at')),
    }
    if include_admin_flag:
        result['is_admin'] = is_admin
    return result


def public_admin(u: dict) -> dict:
    return {
        'id': u.get('_id'),
        'name': u.get('name'),
        'email': u.get('email'),
        'phone': u.get('phone'),
        'is_admin': bool(u.get('is_admin', False)),
        'is_staff': bool(u.get('is_staff', False)),
        'staff_role': u.get('staff_role'),
        'is_premium': bool(u.get('is_premium', False)),
        'has_password': bool(u.get('password_hash')),
        'password_updated_at': _serialize_datetime(u.get('password_updated_at')),
        'created_at': _serialize_datetime(u.get('created_at')),
    }


def serialize_doc(d: dict, *, convert_timeline: bool = False) -> dict:
    out = dict(d)
    out['id'] = out.pop('_id', out.get('id'))
    for k, v in list(out.items()):
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    if convert_timeline and 'timeline' in out and isinstance(out['timeline'], list):
        out['timeline'] = [
            {**e, 'at': e['at'].isoformat() if isinstance(e.get('at'), datetime) else e.get('at')}
            for e in out['timeline']
        ]
    return out


def serialize_event(e: dict) -> dict:
    out: dict = {'id': e.get('_id')}
    for k, v in e.items():
        if k == '_id':
            continue
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out