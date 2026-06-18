"""RAG Service — retrieves relevant visa/university context for AI prompts.

Used by Eva to augment responses with real data from:
- Country visa rules, fees, requirements (data.py)
- University data (MongoDB text search)
- Previous conversation history
"""

import re
from typing import List, Optional
from db import db


async def retrieve_visa_context(query: str, k: int = 5) -> str:
    """Retrieve relevant visa/country/university context for a user query."""
    snippets = []
    q = query.lower()

    # 1. Extract country codes from query
    country_codes = re.findall(r'\b(us|uk|ca|au|de|fr|it|es|jp|sg|ae|th|ch|np|bt|pl|at|pt|gr|hr)\b', q)

    # 2. Look up country data
    from data import get_country, COUNTRIES
    for code in set(c.casefold() for c in country_codes):
        data = get_country(code)
        if data:
            lines = [f"Country: {data.get('name', code)}"]
            if data.get('visa_types'):
                lines.append(f"  Visa types: {', '.join(data['visa_types'])}")
            for cat in (data.get('categories') or [])[:2]:
                lines.append(f"  {cat.get('name')}: ₹{cat.get('fees_inr', 'N/A')}, {cat.get('processing_days', 'N/A')} days, docs: {len(cat.get('documents', []))}")
            if data.get('student_meta'):
                sm = data['student_meta']
                lines.append(f"  Student: {sm.get('processing_weeks', 'N/A')}w processing, {sm.get('post_study_months', 0)}m post-study work")
            snippets.append('\n'.join(lines))

    # 3. Search universities via MongoDB text index
    if any(kw in q for kw in ['study', 'university', 'college', 'course', 'program']):
        for code in set(c.casefold() for c in country_codes):
            cur = db['universities_v2'].find({'country': code}, {'_id': 0, 'name': 1, 'rank': 1, 'tuition_usd': 1, 'ielts_min': 1}).limit(3)
            unis = [u async for u in cur]
            if unis:
                uni_lines = [f"Universities in {code.upper()}:"]
                for u in unis:
                    uni_lines.append(f"  {u.get('name')} — rank {u.get('rank', 'N/A')}, tuition ${u.get('tuition_usd', 'N/A')}/yr, IELTS {u.get('ielts_min', 'N/A')}")
                snippets.append('\n'.join(uni_lines))

    # 4. Get fees
    for code in set(c.casefold() for c in country_codes):
        from eva_tools import get_application_fee
        fee_data = await get_application_fee(code)
        if fee_data:
            snippets.append(f"App fee for {code.upper()}: ₹{fee_data.get('fee_inr', 'N/A')}")

    return '\n\n'.join(snippets) if snippets else ''


async def retrieve_conversation_history(session_id: str, limit: int = 6) -> str:
    """Retrieve and format recent conversation history for context."""
    from routes_chatbot import chat_messages
    cur = chat_messages.find({'session_id': session_id}).sort('created_at', -1).limit(limit)
    msgs = [m async for m in cur]
    msgs.reverse()
    if not msgs:
        return ''
    parts = []
    for m in msgs:
        role = 'User' if m.get('role') == 'user' else 'Eva'
        parts.append(f"{role}: {m.get('text', '')}")
    return '\n'.join(parts)
