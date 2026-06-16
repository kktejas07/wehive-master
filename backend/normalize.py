"""Shared field normalization for university documents — deduplicates Chinese/English field mapping."""
from __future__ import annotations

CN_FIELD_MAP = {'录取率': 'acceptance_rate', '就业率': 'employment_rate'}


def normalize_university(doc: dict) -> dict:
    """Normalize a university document: pop _id, merge Chinese fields to English, fix space-prefixed keys."""
    doc.pop('_id', None)
    for cn_key, en_key in CN_FIELD_MAP.items():
        if cn_key in doc and en_key not in doc:
            doc[en_key] = doc.pop(cn_key)
        elif cn_key in doc:
            doc.pop(cn_key)
    if ' scholarships' in doc:
        doc['scholarships'] = doc.pop(' scholarships')
    if ' intakes' in doc:
        doc['intakes'] = doc.pop(' intakes')
    return doc
