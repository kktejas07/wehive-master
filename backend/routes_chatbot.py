"""AI Chatbot for visa & travel Q&A — routed through AI Marketplace."""

import os
import uuid
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ai_marketplace import marketplace
from auth_utils import get_current_user_optional
from db import db

router = APIRouter(prefix='/chatbot', tags=['chatbot'])
marketplace.db = db

chat_sessions = db['chat_sessions']
chat_messages = db['chat_messages']
logger = logging.getLogger('wehive.chatbot')

SYSTEM_PROMPT = """You are Eva — the friendly visa & travel assistant for We Hive Immigration Services (Ballari, India).

Your role:
- Help Indian passport holders understand visa requirements for any country.
- Answer questions about visa types (Tourist, Business, Student, Work), processing times, fees in INR, required documents, validity, and embassy procedures.
- Suggest holiday plans, best travel seasons, and itinerary ideas.
- Be concise (2–4 sentences typical), friendly, and accurate.
- When unsure of a current fee or rule, say "Please confirm with our team at +91 91132 56726 or info@wehive.co.in" — never invent numbers.
- Encourage starting an application via the We Hive dashboard.
- If asked about non-visa topics, politely steer back to travel/visa.
- Introduce yourself as Eva (not Hive) when a greeting prompts a self-introduction.

Tone: warm, professional, India-friendly. Use ₹ for INR. Avoid jargon. Use bullet points sparingly only when listing 3+ items.
"""


# ---------- Schemas ---------- #
class ChatStartRequest(BaseModel):
    title: Optional[str] = 'New chat'


class ChatStartResponse(BaseModel):
    session_id: str
    title: str
    created_at: datetime


class ChatMessageRequest(BaseModel):
    text: str


class ChatMessageResponse(BaseModel):
    user_message: dict
    assistant_message: dict
    provider_info: dict


class ChatSessionItem(BaseModel):
    session_id: str
    title: str
    last_message: Optional[str] = None
    updated_at: datetime


# ---------- Endpoints ---------- #
@router.post('/sessions', response_model=ChatStartResponse)
async def start_session(req: ChatStartRequest, user=Depends(get_current_user_optional)):
    sid = str(uuid.uuid4())
    now = datetime.utcnow()
    doc = {
        '_id': sid,
        'user_id': user['_id'] if user else None,
        'title': req.title or 'New chat',
        'created_at': now,
        'updated_at': now,
    }
    await chat_sessions.insert_one(doc)
    return ChatStartResponse(session_id=sid, title=doc['title'], created_at=now)


@router.get('/sessions', response_model=List[ChatSessionItem])
async def list_sessions(user=Depends(get_current_user_optional)):
    if not user:
        return []
    cur = chat_sessions.find({'user_id': user['_id']}).sort('updated_at', -1).limit(20)
    out = []
    async for s in cur:
        out.append(ChatSessionItem(
            session_id=s['_id'],
            title=s.get('title', 'Chat'),
            last_message=s.get('last_message'),
            updated_at=s.get('updated_at', s.get('created_at', datetime.utcnow())),
        ))
    return out


@router.get('/sessions/{session_id}/messages')
async def list_messages(session_id: str, user=Depends(get_current_user_optional)):
    sess = await chat_sessions.find_one({'_id': session_id})
    if not sess:
        raise HTTPException(404, 'Session not found')
    if sess.get('user_id') and (not user or sess['user_id'] != user['_id']):
        raise HTTPException(403, 'Not allowed')
    cur = chat_messages.find({'session_id': session_id}).sort('created_at', 1)
    return [
        {
            'id': m['_id'],
            'role': m['role'],
            'text': m['text'],
            'created_at': m.get('created_at', datetime.utcnow()).isoformat(),
        }
        async for m in cur
    ]


@router.post('/sessions/{session_id}/messages', response_model=ChatMessageResponse)
async def send_message(session_id: str, req: ChatMessageRequest, user=Depends(get_current_user_optional)):
    if not req.text or not req.text.strip():
        raise HTTPException(400, 'Empty message')
    sess = await chat_sessions.find_one({'_id': session_id})
    if not sess:
        raise HTTPException(404, 'Session not found')
    if sess.get('user_id') and (not user or sess['user_id'] != user['_id']):
        raise HTTPException(403, 'Not allowed')

    text = req.text.strip()
    now = datetime.utcnow()

    user_msg = {
        '_id': str(uuid.uuid4()),
        'session_id': session_id,
        'role': 'user',
        'text': text,
        'created_at': now,
    }
    await chat_messages.insert_one(user_msg)

    try:
        user_id = user['_id'] if user else None
        if not user_id:
            raise HTTPException(401, 'Authentication required for AI chat')
        reply_text, provider_info = await marketplace.chat_with_info(
            user_id=user_id,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=text,
            max_tokens=1024,
        )
        if not reply_text:
            reply_text = 'Sorry, I could not generate a reply just now.'
    except Exception as e:
        reply_text = (
            "I'm having trouble reaching my brain right now. Please try again, or contact our team at "
            "+91 91132 56726 for an immediate answer."
        )
        logger.exception('Marketplace error: %s', e)
        provider_info = {}

    assistant_msg = {
        '_id': str(uuid.uuid4()),
        'session_id': session_id,
        'role': 'assistant',
        'text': reply_text,
        'created_at': datetime.utcnow(),
    }
    await chat_messages.insert_one(assistant_msg)

    # Update session metadata: title (from first user msg) + last preview
    new_title = sess.get('title') or 'New chat'
    if new_title in ('New chat', None, ''):
        new_title = (text[:40] + ('…' if len(text) > 40 else ''))
    await chat_sessions.update_one(
        {'_id': session_id},
        {'$set': {
            'title': new_title,
            'last_message': reply_text[:140],
            'updated_at': datetime.utcnow(),
        }},
    )

    return ChatMessageResponse(
        user_message={
            'id': user_msg['_id'], 'role': 'user', 'text': text,
            'created_at': user_msg['created_at'].isoformat(),
        },
        assistant_message={
            'id': assistant_msg['_id'], 'role': 'assistant', 'text': reply_text,
            'created_at': assistant_msg['created_at'].isoformat(),
        },
        provider_info=provider_info,
    )
