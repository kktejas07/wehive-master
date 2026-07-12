"""AI Chatbot for visa & travel Q&A — routed through AI Marketplace.

Eva uses Agentic RAG: looks up real data before answering.
"""

import logging
import os
import re
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ai_marketplace import marketplace
from core.auth_utils import get_current_user_optional
from core.db import db
from shared.eva_tools import get_application_fee, lookup_country, search_universities
from shared.local_llm import local_chat_with_info

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


async def notify_status_change(user_id: str, application_id: str, status: str) -> None:
    """Notify user about an application status change via chatbot."""
    from core.db import notifications_col
    now = datetime.utcnow()
    await notifications_col.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "application_id": application_id,
            "type": "status_change",
            "status": status,
            "message": f"Your application status has been updated to: {status}",
            "created_at": now,
            "read": False,
        }
    )
marketplace.db = db

chat_sessions = db["chat_sessions"]
chat_messages = db["chat_messages"]
logger = logging.getLogger("wehive.chatbot")

SYSTEM_PROMPT = """You are Hive — the friendly visa & travel assistant for We Hive Immigration Services (Ballari, India).

Your role:
- Help Indian passport holders understand visa requirements for any country.
- Answer questions about visa types (Tourist, Business, Student, Work), processing times, fees in INR, required documents, validity, and embassy procedures.
- Suggest holiday plans, best travel seasons, and itinerary ideas.
- Be concise (2–4 sentences typical), friendly, and accurate.
- When you need current data on a country, visa, or university, I will provide it to you in the prompt.
- Encourage starting an application via the We Hive dashboard.
- If asked about non-visa topics, politely steer back to travel/visa.
- Introduce yourself as Hive when a greeting prompts a self-introduction.

Tone: warm, professional, India-friendly. Use ₹ for INR. Avoid jargon. Use bullet points sparingly only when listing 3+ items.
"""


RE_COUNTRY_CODE = re.compile(r"\b(us|uk|ca|au|de|fr|it|es|jp|sg|ae|th|ch|np|bt|pl|at|pt|gr|hr)\b", re.I)
RE_STUDENT_KEYWORDS = re.compile(
    r"(study|student|university|college|course|program|ielts|toefl|gre|gmat|scholarship|admission|intake|tuition)", re.I
)
RE_VISA_KEYWORDS = re.compile(
    r"(visa|tourist|business|work|fee|requirement|document|processing|embassy|appointment)", re.I
)


async def _gather_context(user_prompt: str) -> str:
    snippets = []
    country_codes = RE_COUNTRY_CODE.findall(user_prompt)
    is_student = bool(RE_STUDENT_KEYWORDS.search(user_prompt))
    is_visa = bool(RE_VISA_KEYWORDS.search(user_prompt))

    for code in set(c.casefold() for c in country_codes):
        data = await lookup_country(code)
        if data:
            lines = [f"Country: {data.get('name', code)}"]
            visa_types = data.get("visa_types", [])
            if visa_types:
                lines.append(f"  Visa types: {', '.join(visa_types)}")
            categories = data.get("categories", [])
            for cat in categories[:3]:
                lines.append(
                    f"  {cat.get('name')}: ₹{cat.get('fees_inr', 'N/A')} / ${cat.get('fees_usd', 'N/A')}, {cat.get('processing_days', 'N/A')} days, docs: {len(cat.get('documents', []))}"
                )
            delivery = data.get("delivery", {})
            lines.append(
                f"  Delivery: {delivery.get('standard_days', 'N/A')}d standard, {delivery.get('rush_days', 'N/A')}d rush"
            )
            if is_student and data.get("student_meta"):
                sm = data["student_meta"]
                lines.append(
                    f"  Student: {sm.get('processing_weeks', 'N/A')}w processing, {sm.get('post_study_months', 0)}m post-study work, intakes: {', '.join(sm.get('intakes', []))}"
                )
            snippets.append("\n".join(lines))

    if is_student:
        uni_country = country_codes[0].lower() if country_codes else None
        unis = await search_universities(country=uni_country)
        if unis:
            uni_lines = ["Universities:"]
            for u in unis[:5]:
                uni_lines.append(
                    f"  {u.get('name', '?')} — rank {u.get('rank', 'N/A')}, tuition ${u.get('tuition_usd', 'N/A')}/yr, IELTS {u.get('ielts_min', 'N/A')}"
                )
            snippets.append("\n".join(uni_lines))

    if is_visa and country_codes:
        fee_data = await get_application_fee(country_codes[0].lower())
        if fee_data:
            snippets.append(
                f"Application fee: ₹{fee_data.get('fee_inr', 'N/A')} (embassy: ₹{fee_data.get('embassy_fee', 'N/A')})"
            )

    return "\n\n".join(snippets) if snippets else ""


class ChatStartRequest(BaseModel):
    title: Optional[str] = "New chat"


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


@router.post("/sessions", response_model=ChatStartResponse)
async def start_session(req: ChatStartRequest, user=Depends(get_current_user_optional)):
    sid = str(uuid.uuid4())
    now = datetime.utcnow()
    doc = {
        "_id": sid,
        "user_id": user["_id"] if user else None,
        "title": req.title or "New chat",
        "created_at": now,
        "updated_at": now,
    }
    await chat_sessions.insert_one(doc)
    return ChatStartResponse(session_id=sid, title=doc["title"], created_at=now)


@router.get("/sessions", response_model=List[ChatSessionItem])
async def list_sessions(user=Depends(get_current_user_optional)):
    if not user:
        return []
    cur = chat_sessions.find({"user_id": user["_id"]}).sort("updated_at", -1).limit(20)
    out = []
    async for s in cur:
        out.append(
            ChatSessionItem(
                session_id=s["_id"],
                title=s.get("title", "Chat"),
                last_message=s.get("last_message"),
                updated_at=s.get("updated_at", s.get("created_at", datetime.utcnow())),
            )
        )
    return out


@router.get("/sessions/{session_id}/messages")
async def list_messages(session_id: str, user=Depends(get_current_user_optional)):
    sess = await chat_sessions.find_one({"_id": session_id})
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not user or sess["user_id"] != user["_id"]):
        raise HTTPException(403, "Not allowed")
    cur = chat_messages.find({"session_id": session_id}).sort("created_at", 1)
    return [
        {
            "id": m["_id"],
            "role": m["role"],
            "text": m["text"],
            "created_at": m.get("created_at", datetime.utcnow()).isoformat(),
        }
        async for m in cur
    ]


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_message(session_id: str, req: ChatMessageRequest, user=Depends(get_current_user_optional)):
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Empty message")
    sess = await chat_sessions.find_one({"_id": session_id})
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not user or sess["user_id"] != user["_id"]):
        raise HTTPException(403, "Not allowed")
    # Attach user to anonymous session on first message
    if not sess.get("user_id") and user:
        await chat_sessions.update_one({"_id": session_id}, {"$set": {"user_id": user["_id"]}})

    text = req.text.strip()
    now = datetime.utcnow()

    user_msg = {
        "_id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "text": text,
        "created_at": now,
    }
    await chat_messages.insert_one(user_msg)

    context = await _gather_context(text)

    from shared.rag_service import retrieve_conversation_history

    history = await retrieve_conversation_history(session_id, limit=6)
    enriched_system = SYSTEM_PROMPT
    if history:
        enriched_system = SYSTEM_PROMPT + f"\n\nRecent conversation:\n{history}"

    enriched_prompt = text
    if context:
        enriched_prompt = f"Current data from our system:\n{context}\n\nUser question: {text}"

    try:
        user_id = user["_id"] if user else None
        has_api_key = bool(os.environ.get("DEFAULT_LLM_KEY", "").strip())

        if has_api_key and user_id:
            reply_text, provider_info = await marketplace.chat_with_info(
                user_id=user_id,
                system_prompt=enriched_system,
                user_prompt=enriched_prompt,
                max_tokens=1024,
            )
        else:
            reply_text, provider_info = await local_chat_with_info(
                query=text,
                context=context,
                conversation_history=history or "",
            )
        if not reply_text:
            reply_text = "Sorry, I could not generate a reply just now."
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Chat error: %s", e)
        try:
            reply_text, provider_info = await local_chat_with_info(
                query=text,
                context=context,
                conversation_history=history or "",
            )
        except Exception:
            reply_text = (
                "I'm having trouble reaching my brain right now. Please try again, or contact our team at "
                "+91 91132 56726 for an immediate answer."
            )
            provider_info = {}

    assistant_msg = {
        "_id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "text": reply_text,
        "created_at": datetime.utcnow(),
    }
    await chat_messages.insert_one(assistant_msg)

    new_title = sess.get("title") or "New chat"
    if new_title in ("New chat", None, ""):
        new_title = text[:40] + ("…" if len(text) > 40 else "")
    await chat_sessions.update_one(
        {"_id": session_id},
        {
            "$set": {
                "title": new_title,
                "last_message": reply_text[:140],
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return ChatMessageResponse(
        user_message={
            "id": user_msg["_id"],
            "role": "user",
            "text": text,
            "created_at": user_msg["created_at"].isoformat(),
        },
        assistant_message={
            "id": assistant_msg["_id"],
            "role": "assistant",
            "text": reply_text,
            "created_at": assistant_msg["created_at"].isoformat(),
        },
        provider_info=provider_info,
    )


# ---------- Application Concierge Agent ---------- #


class ConciergeStartRequest(BaseModel):
    country_id: str
    visa_type: str = "tourist"


class ConciergeAdvanceRequest(BaseModel):
    country_id: str
    step: str
    data: Optional[dict] = None


@router.post("/concierge/start")
async def concierge_start(req: ConciergeStartRequest, user=Depends(get_current_user_optional)):
    if not user:
        raise HTTPException(401, "Authentication required")
    from agents.concierge import start_concierge

    return await start_concierge(user["_id"], req.country_id, req.visa_type)


@router.post("/concierge/advance")
async def concierge_advance(req: ConciergeAdvanceRequest, user=Depends(get_current_user_optional)):
    if not user:
        raise HTTPException(401, "Authentication required")
    from agents.concierge import advance_concierge

    return await advance_concierge(user["_id"], req.country_id, req.step, req.data)


# ---------- Deadline & Reminder Agent ---------- #


@router.get("/reminders")
async def get_reminders(user=Depends(get_current_user_optional)):
    from agents.reminder_agent import run_all_checks

    if not user:
        raise HTTPException(401, "Authentication required")
    all_r = await run_all_checks(db)
    filtered = [r for r in all_r if r.get("user_id") == user["_id"]]
    return {"reminders": filtered, "count": len(filtered)}
