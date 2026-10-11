"""RAG helpers — conversation history context for Hive prompts."""

from db import db


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
