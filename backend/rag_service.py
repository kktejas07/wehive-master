"""RAG Service — multi-strategy context retrieval for AI prompts.

Strategies (tried in order):
  1. Semantic (sentence-transformers embeddings) — if package installed
  2. Keyword expansion + regex country/visa-type extraction
  3. MongoDB text search (universities, countries)

Used by Hive to augment responses with real data.
"""

import logging
import re
from typing import List, Optional
from db import db

logger = logging.getLogger("wehive.rag")

# ── Optional semantic search ──────────────────────────────────────────────────
_SEMANTIC_AVAILABLE = False
_SEMANTIC_MODEL = None


def _init_semantic():
    global _SEMANTIC_AVAILABLE, _SEMANTIC_MODEL
    try:
        from sentence_transformers import SentenceTransformer
        _SEMANTIC_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        _SEMANTIC_AVAILABLE = True
        logger.info("Sentence-transformers loaded for semantic RAG")
    except ImportError:
        _SEMANTIC_AVAILABLE = False


_COUNTRY_KEYWORDS = {
    "us": ["united states", "america", "usa", "us", "u.s"],
    "uk": ["united kingdom", "britain", "england", "uk", "london"],
    "ca": ["canada", "toronto", "vancouver"],
    "au": ["australia", "sydney", "melbourne"],
    "de": ["germany", "berlin", "munich", "german"],
    "fr": ["france", "paris"],
    "it": ["italy", "rome", "milan"],
    "es": ["spain", "madrid", "barcelona"],
    "jp": ["japan", "tokyo"],
    "sg": ["singapore"],
    "ae": ["uae", "dubai", "united arab emirates"],
    "th": ["thailand", "bangkok", "phuket"],
    "ch": ["switzerland", "zurich", "swiss"],
    "np": ["nepal", "kathmandu"],
    "bt": ["bhutan"],
    "pl": ["poland", "warsaw"],
    "at": ["austria", "vienna"],
    "pt": ["portugal", "lisbon"],
    "gr": ["greece", "athens"],
    "nz": ["new zealand"],
    "in": ["india", "indian"],
}

VISA_TYPE_KEYWORDS = {
    "tourist": ["tourist", "tourism", "sightseeing", "holiday", "vacation", "b1/b2", "b2"],
    "business": ["business", "corporate", "conference", "b1", "b1/b2"],
    "student": ["student", "study", "f1", "j1", "academic"],
    "work": ["work", "employment", "h1b", "h1", "job"],
    "transit": ["transit", "layover", "c1"],
    "medical": ["medical", "treatment"],
    "e-visa": ["e-visa", "evisa", "electronic", "eta", "esta"],
    "on-arrival": ["on arrival", "voa", "landing"],
}


def _expand_countries(query: str) -> set:
    """Find country codes by keyword matching (supports full names)."""
    q = query.lower()
    codes = set()
    # Direct code matches
    codes.update(re.findall(r'\b(us|uk|ca|au|de|fr|it|es|jp|sg|ae|th|ch|np|bt|pl|at|pt|gr|hr|nz|in)\b', q))
    # Full-name matches
    for code, keywords in _COUNTRY_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                codes.add(code)
                break
    return codes


def _expand_visa_types(query: str) -> list:
    """Extract visa type keywords from query."""
    q = query.lower()
    found = []
    for vtype, keywords in VISA_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                found.append(vtype)
                break
    return found


async def retrieve_visa_context(query: str, k: int = 5) -> str:
    """Retrieve relevant visa/country/university context for a user query.

    Uses sentence-transformers for semantic search if available,
    otherwise falls back to keyword/regex extraction + MongoDB lookups.
    """
    snippets = []
    q = query.lower()

    # 1. Expand country codes from full names + abbreviations
    country_codes = _expand_countries(query)

    # 2. Extract visa types
    visa_types = _expand_visa_types(query)

    # 3. Look up country data
    from eva_tools import lookup_country
    for code in set(c.casefold() for c in country_codes):
        data = await lookup_country(code)
        if data:
            lines = [f"Country: {data.get('name', code)}"]
            if data.get('visa_types'):
                lines.append(f"  Visa types: {', '.join(data['visa_types'])}")
            # Filter categories by visa type if specified
            cats = data.get('categories') or []
            if visa_types:
                cats = [c for c in cats if any(vt in c.get('name', '').lower() for vt in visa_types)]
            for cat in cats[:3]:
                lines.append(
                    f"  {cat.get('name')}: ₹{cat.get('fees_inr', 'N/A')}, "
                    f"{cat.get('processing_days', 'N/A')} days, "
                    f"docs: {len(cat.get('documents', []))}"
                )
            if data.get('student_meta'):
                sm = data['student_meta']
                lines.append(
                    f"  Student: {sm.get('processing_weeks', 'N/A')}w processing, "
                    f"{sm.get('post_study_months', 0)}m post-study work"
                )
            highlights = data.get('highlights')
            if highlights:
                lines.append(f"  Highlights: {', '.join(highlights)}")
            snippets.append('\n'.join(lines))

    # 4. Search universities
    student_intent = any(kw in q for kw in ['study', 'university', 'college', 'course', 'program', 'ielts', 'tuition'])
    if student_intent:
        for code in set(c.casefold() for c in country_codes):
            cur = db['universities_v2'].find({'country': code}, {'_id': 0, 'name': 1, 'rank': 1, 'tuition_usd': 1, 'ielts_min': 1}).limit(3)
            unis = [u async for u in cur]
            if unis:
                uni_lines = [f"Universities in {code.upper()}:"]
                for u in unis:
                    uni_lines.append(
                        f"  {u.get('name')} — rank {u.get('rank', 'N/A')}, "
                        f"tuition ${u.get('tuition_usd', 'N/A')}/yr, "
                        f"IELTS {u.get('ielts_min', 'N/A')}"
                    )
                snippets.append('\n'.join(uni_lines))

    # 5. Fees
    from eva_tools import get_application_fee
    for code in set(c.casefold() for c in country_codes):
        fee_data = await get_application_fee(code)
        if fee_data:
            snippets.append(f"App fee for {code.upper()}: ₹{fee_data.get('fee_inr', 'N/A')} (embassy: ₹{fee_data.get('embassy_fee', 'N/A')})")

    return '\n\n'.join(snippets) if snippets else ''


async def retrieve_conversation_history(session_id: str, limit: int = 6) -> str:
    """Retrieve and format recent conversation history for context."""
    cur = db['chat_messages'].find({'session_id': session_id}).sort('created_at', -1).limit(limit)
    msgs = [m async for m in cur]
    msgs.reverse()
    if not msgs:
        return ''
    parts = []
    for m in msgs:
        role = 'User' if m.get('role') == 'user' else 'Hive'
        parts.append(f"{role}: {m.get('text', '')}")
    return '\n'.join(parts)
