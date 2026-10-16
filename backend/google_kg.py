"""Google Knowledge Graph Search API client shared by search, travel planner, document scans and chat.

Calls never raise and never expose GOOGLE_API_KEY: failures are logged by exception type only
(httpx error messages include the request URL, which carries the key) and callers get [].
"""
import asyncio
import logging
import os
import re
import time
from typing import Optional, Union

import httpx

logger = logging.getLogger('wehive.google_kg')

KG_URL = 'https://kgsearch.googleapis.com/v1/entities:search'
CACHE_TTL = int(os.environ.get('KG_CACHE_TTL', '604800'))
_cache: dict[str, tuple[float, list[dict]]] = {}


def configured() -> bool:
    return bool(os.environ.get('GOOGLE_API_KEY', '').strip())


def parse(data: dict) -> list[dict]:
    entities = []
    for item in data.get('itemListElement', []):
        r = item.get('result', {})
        detail = r.get('detailedDescription') or {}
        types = r.get('@type', [])
        entities.append({
            'kg_id': r.get('@id', ''),
            'name': r.get('name', ''),
            'description': r.get('description', ''),
            'detail': detail.get('articleBody', ''),
            'detail_url': detail.get('url', ''),
            'url': r.get('url', ''),
            'image': (r.get('image') or {}).get('contentUrl', ''),
            'types': types if isinstance(types, list) else [types],
            'score': item.get('resultScore', 0),
        })
    return entities


async def search(query: str = '', limit: int = 5, types: Union[str, list, None] = None,
                 ids: Optional[str] = None) -> list[dict]:
    key = os.environ.get('GOOGLE_API_KEY', '').strip()
    if not key or not (query or ids):
        return []
    ck = f'{query}|{ids}|{types}|{limit}'
    hit = _cache.get(ck)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]

    params = {'key': key, 'limit': limit, 'languages': 'en'}
    if query:
        params['query'] = query
    if ids:
        params['ids'] = ids
    if types:
        params['types'] = types
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(KG_URL, params=params)
        if resp.status_code != 200:
            logger.warning('Knowledge Graph API returned %s', resp.status_code)
            return []
        entities = parse(resp.json())
    except Exception as e:
        logger.warning('Knowledge Graph API call failed: %s', type(e).__name__)
        return []

    _cache[ck] = (time.time(), entities)
    if len(_cache) > 1000:
        del _cache[min(_cache, key=lambda k: _cache[k][0])]
    return entities


def _norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


def names_match(a: str, b: str) -> bool:
    """Loose name equality so a top hit for an unrelated entity isn't treated as a match."""
    a, b = _norm(a), _norm(b)
    return bool(a and b) and (a in b or b in a)


async def lookup(name: str, types: Union[str, list, None] = None) -> Optional[dict]:
    """Best entity whose name matches `name`, or None."""
    for e in await search(name, limit=3, types=types):
        if names_match(e['name'], name):
            return e
    return None


_LEADING_STOP = {
    'i', 'im', 'my', 'me', 'we', 'you', 'what', 'how', 'can', 'could', 'is', 'are', 'do', 'does',
    'the', 'a', 'an', 'please', 'hi', 'hello', 'hey', 'tell', 'which', 'when', 'where', 'why', 'who',
    'should', 'will', 'would', 'want', 'need', 'thanks', 'thank', 'yes', 'no', 'ok', 'okay', 'also',
    'visa', 'visas', 'student', 'tourist', 'fee', 'fees', 'help', 'find', 'show', 'give', 'list',
}
_CONNECTORS = {'of', 'the', 'and', 'de', 'for', 'at', 'in'}


def entity_candidates(text: str, max_n: int = 2) -> list[str]:
    """Capitalised phrases in free text (e.g. "University of Toronto") worth looking up."""
    out: list[str] = []
    # Continuation words need a lowercase letter so acronyms ("for MBA") don't extend a name.
    for m in re.finditer(r"[A-Z][\w&'.-]*(?:\s+(?:of|the|and|de|for|at|in|[A-Z][a-z][\w&'.-]*))*", text or ''):
        words = m.group(0).split()
        while words and words[0].lower().strip(".'") in _LEADING_STOP:
            words.pop(0)
        while words and words[-1].lower() in _CONNECTORS:
            words.pop()
        phrase = ' '.join(words).strip(" .'-")
        if len(phrase) >= 3 and phrase.upper() != phrase and phrase not in out:
            out.append(phrase)
        if len(out) >= max_n:
            break
    return out


def as_fact(e: dict) -> str:
    text = (e.get('detail') or e.get('description') or '')[:400]
    desc = f" ({e['description']})" if e.get('description') else ''
    src = e.get('detail_url') or e.get('url') or ''
    return f"- {e['name']}{desc}: {text}" + (f" [source: {src}]" if src else '')


async def context_for(text: str, max_entities: int = 2) -> str:
    """Knowledge Graph facts for entities mentioned in `text`, formatted for an LLM prompt."""
    if not configured():
        return ''
    names = entity_candidates(text, max_entities)
    found = await asyncio.gather(*(lookup(n) for n in names))
    facts = [as_fact(e) for e in found if e]
    return 'Facts from Google Knowledge Graph:\n' + '\n'.join(facts) if facts else ''
