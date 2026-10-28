"""AI Chatbot for visa & travel Q&A — routed through AI Marketplace.

Eva uses Agentic RAG: looks up real data before answering.
"""

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from rate_limit import RateLimit
from pydantic import BaseModel, Field

import google_kg
from ai_marketplace import marketplace
from auth_utils import get_current_user_optional
from config import SUPPORT_PHONE
from db import db
from eva_tools import get_application_fee, lookup_country, search_universities
from local_llm import local_chat_with_info
from student_memory import student_memory
from observability import observe, propagate_attributes, get_callback_handler

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


async def notify_status_change(user_id: str, application_id: str, status: str) -> None:
    """Tell the user their application status changed: in-app, email, and WhatsApp
    when they opted in (see notify.py)."""
    from notify import notify_user
    label = status.replace("_", " ").capitalize()
    await notify_user(
        user_id,
        title=f"Application update: {label}",
        body=f"Your application status is now: {label}.",
        kind="status_change",
        link=f"/account/applications/{application_id}",
        application_id=application_id,
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
# Vector-store collections filled by /api/rag/ingest/* and /api/kg/rag/index.
RAG_COLLECTIONS = ["wehive_kb", "wehive_countries", "wehive_universities", "kg_entities"]


@observe("gather_context")
async def _gather_context(user_prompt: str, user_id: str = None) -> str:
    from agents.orchestrator import RE_COUNTRY_NAME, COUNTRY_ALIASES
    snippets = []

    # Student memory: inject persistent user profile context
    if user_id:
        try:
            summary = student_memory.get_profile_summary(str(user_id))
            if summary:
                snippets.append(f"About this student:\n{summary}")
        except Exception:
            logger.debug("Student memory context failed", exc_info=True)
    country_codes = RE_COUNTRY_CODE.findall(user_prompt)
    country_codes += [COUNTRY_ALIASES[m.group(0).lower()] for m in RE_COUNTRY_NAME.finditer(user_prompt)]
    is_student = bool(RE_STUDENT_KEYWORDS.search(user_prompt))
    is_visa = bool(RE_VISA_KEYWORDS.search(user_prompt))

    for code in set(c.casefold() for c in country_codes):
        data = await lookup_country(code)
        if data:
            lines = [f"Country: {data.get('name', code)}"]
            visa_types = data.get("visa_types", [])
            if visa_types:
                lines.append(f"  Visa types: {', '.join(visa_types)}")
            categories = data.get("categories") or {}
            if isinstance(categories, dict):
                categories = list(categories.values())
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

    snippets.extend(s for s in await asyncio.gather(_rag_context(user_prompt), google_kg.context_for(user_prompt)) if s)

    # Graph RAG: inject visa-graph context for visa/travel queries
    if is_visa and country_codes:
        try:
            from graph_rag import hybrid_graph_rag_query
            graph_ctx = await asyncio.wait_for(hybrid_graph_rag_query(user_prompt), timeout=5)
            if graph_ctx:
                snippets.append(f"Visa graph insights:\n{graph_ctx}")
        except Exception:
            logger.debug("GraphRAG context failed", exc_info=True)

    return "\n\n".join(snippets) if snippets else ""


async def _rag_context(user_prompt: str) -> str:
    """Top chunks from the vector store (countries, universities, cached KG entities)."""
    from agent_framework import _retrieve_rag_context
    try:
        text = await asyncio.wait_for(_retrieve_rag_context(user_prompt, RAG_COLLECTIONS, k=3), timeout=8)
    except Exception:
        logger.warning("RAG retrieval failed", exc_info=True)
        return ""
    return f"From our knowledge base:\n{text}" if text else ""


class ChatStartRequest(BaseModel):
    title: Optional[str] = "New chat"


class ChatStartResponse(BaseModel):
    session_id: str
    title: str
    created_at: datetime


class ChatMessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    user_message: dict
    assistant_message: dict
    provider_info: dict


class ChatSessionItem(BaseModel):
    session_id: str
    title: str
    last_message: Optional[str] = None
    updated_at: datetime


_session_limiter = RateLimit(max_calls=10, window_seconds=600)
_message_limiter = RateLimit(max_calls=30, window_seconds=600)


@router.post("/sessions", response_model=ChatStartResponse)
async def start_session(req: ChatStartRequest, user=Depends(get_current_user_optional), _=Depends(_session_limiter)):
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
    cur = chat_messages.find({"session_id": session_id}).sort("created_at", 1).limit(500)
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
@observe("eva_chat")
async def send_message(session_id: str, req: ChatMessageRequest, user=Depends(get_current_user_optional), _=Depends(_message_limiter)):
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Empty message")

    # ── Guardrails: domain restriction + injection detection ─────────────────
    from guardrails import check_input
    allowed, guard_result = check_input(req.text)
    if not allowed:
        # Return the guardrail message as a synthetic assistant reply without
        # storing the blocked user message or calling any LLM/DB.
        now = datetime.utcnow()
        blocked_user_msg = {
            "_id": str(uuid.uuid4()), "session_id": session_id,
            "role": "user", "text": req.text.strip(), "created_at": now,
        }
        blocked_assistant_msg = {
            "_id": str(uuid.uuid4()), "session_id": session_id,
            "role": "assistant", "text": guard_result, "created_at": now,
        }
        await chat_messages.insert_many([blocked_user_msg, blocked_assistant_msg])
        return ChatMessageResponse(
            user_message={"id": blocked_user_msg["_id"], "role": "user",
                          "text": req.text.strip(), "created_at": now.isoformat()},
            assistant_message={"id": blocked_assistant_msg["_id"], "role": "assistant",
                               "text": guard_result, "created_at": now.isoformat()},
            provider_info={"provider": "guardrails"},
        )

    sess = await chat_sessions.find_one({"_id": session_id})
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not user or sess["user_id"] != user["_id"]):
        raise HTTPException(403, "Not allowed")
    # Attach user to anonymous session on first message
    if not sess.get("user_id") and user:
        await chat_sessions.update_one({"_id": session_id}, {"$set": {"user_id": user["_id"]}})

    text = guard_result  # sanitised text from guardrails
    now = datetime.utcnow()

    user_msg = {
        "_id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "text": text,
        "created_at": now,
    }
    await chat_messages.insert_one(user_msg)

    uid = user["_id"] if user else None
    context = await _gather_context(text, user_id=uid)

    # LangGraph path (enabled via USE_LANGGRAPH=true env var)
    user_id = user["_id"] if user else None
    if os.environ.get("USE_LANGGRAPH", "").lower() in ("true", "1"):
        try:
            from langchain_core.messages import HumanMessage
            from agents.langgraph.supervisor import supervisor_app

            memories = student_memory.search(user_id=user_id or "anon", query=text, limit=5)
            memory_ctx = "\n".join(m["memory"] for m in memories if "memory" in m)

            lg_state = {
                "messages": [HumanMessage(content=text)],
                "user_id": user_id or "anon",
                "session_id": session_id,
                "intent": "",
                "retrieved_docs": [],
                "retrieval_quality": "none",
                "retry_count": 0,
                "reformulated_query": "",
                "final_answer": "",
                "requires_human": False,
                "agent_name": "",
                "memory_context": memory_ctx,
            }
            lf_handler = get_callback_handler(
                user_id=user_id or "anon",
                session_id=session_id,
                metadata={"source": "langgraph"},
            )
            lg_config = {"callbacks": [lf_handler]} if lf_handler else {}
            with propagate_attributes(
                user_id=user_id or "anon",
                session_id=session_id,
                metadata={"source": "langgraph"},
            ):
                lg_result = await supervisor_app.ainvoke(lg_state, config=lg_config)
            reply_text = lg_result.get("final_answer") or ""
            if reply_text:
                student_memory.add(user_id or "anon", f"Asked: {text}")
                student_memory.add(user_id or "anon", f"Intent: {lg_result.get('intent','')}", role="assistant")
                provider_info = {
                    "provider": "langgraph",
                    "intent": lg_result.get("intent", ""),
                    "agent": lg_result.get("agent_name", ""),
                }
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
                    {"$set": {"title": new_title, "last_message": reply_text[:140], "updated_at": datetime.utcnow()}},
                )
                return ChatMessageResponse(
                    user_message={"id": user_msg["_id"], "role": "user", "text": text, "created_at": user_msg["created_at"].isoformat()},
                    assistant_message={"id": assistant_msg["_id"], "role": "assistant", "text": reply_text, "created_at": assistant_msg["created_at"].isoformat()},
                    provider_info=provider_info,
                )
        except Exception as e:
            logger.warning("LangGraph path failed, falling back: %s", e)

    from rag_service import retrieve_conversation_history

    history = await retrieve_conversation_history(session_id, limit=6)
    enriched_system = SYSTEM_PROMPT
    if history:
        enriched_system = SYSTEM_PROMPT + f"\n\nRecent conversation:\n{history}"

    from guardrails import fence
    enriched_prompt = fence(text)
    if context:
        enriched_prompt = f"Current data from our system:\n{context}\n\nUser question: {fence(text)}"

    try:
        has_api_key = bool(os.environ.get("DEFAULT_LLM_KEY", "").strip())

        if has_api_key and uid:
            reply_text, provider_info = await marketplace.chat_with_info(
                user_id=uid,
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
                f"{SUPPORT_PHONE} for an immediate answer."
            )
            provider_info = {}

    # Persist to student memory (legacy path — LangGraph path saves its own)
    if reply_text and user_id:
        try:
            student_memory.add(str(user_id), f"Asked: {text}")
            student_memory.add(str(user_id), f"Eva replied: {reply_text[:200]}", role="assistant")
        except Exception:
            pass

    assistant_msg = {
        "_id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "text": reply_text,
        "created_at": datetime.utcnow(),
    }
    await chat_messages.insert_one(assistant_msg)

    # Fire-and-forget: student memory + RAG auto-evaluation
    if uid:
        try:
            student_memory.add(str(uid), f"Asked: {text}")
            student_memory.add(str(uid), f"Eva replied: {reply_text[:200]}", role="assistant")
        except Exception:
            pass
        try:
            from rag_eval import auto_evaluate_hook
            asyncio.create_task(auto_evaluate_hook(
                session_id=session_id,
                message_id=assistant_msg["_id"],
                question=text,
                answer=reply_text,
                context=context,
            ))
        except Exception:
            pass

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
