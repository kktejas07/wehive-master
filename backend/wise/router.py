"""Wise with RAG — API router.

Endpoints:
  POST /api/wise/chat           — SSE streaming chat
  POST /api/wise/ingest         — Admin: add knowledge document
  GET  /api/wise/knowledge      — List knowledge docs
  DELETE /api/wise/knowledge/{id} — Admin: remove doc
  GET  /api/wise/sessions       — User chat history
  GET  /api/wise/sessions/{id}  — Single session messages
  GET  /api/wise/packs          — List conversation packs
  GET  /api/wise/models         — Available model profiles
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth_utils import get_current_user, get_current_user_optional
from db import (
    visa_knowledge_col, wise_sessions_col, wise_packs_col
)

router = APIRouter(prefix="/wise", tags=["wise"])
logger = logging.getLogger("wehive.wise.router")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    country: Optional[str] = None
    visa_type: Optional[str] = None
    pack_id: Optional[str] = None
    model_profile: str = "balanced"


class IngestRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=10000)
    country: Optional[str] = None
    visa_type: Optional[str] = None
    source_url: Optional[str] = None
    title: Optional[str] = None


# ---------------------------------------------------------------------------
# Chat (SSE streaming)
# ---------------------------------------------------------------------------

@router.post("/chat")
async def wise_chat_endpoint(
    req: ChatRequest,
    user=Depends(get_current_user_optional),
):
    """Stream a Wise RAG response as Server-Sent Events."""
    from wise.rag import wise_chat

    session_id = req.session_id or str(uuid.uuid4())
    user_id = str(user["_id"]) if user else None

    # Resolve pack system prompt
    pack_system_prompt = None
    if req.pack_id:
        pack = await wise_packs_col.find_one({"id": req.pack_id, "is_active": True})
        if pack:
            pack_system_prompt = pack.get("system_prompt")

    ctx = {
        "user_id": user_id,
        "country": req.country,
        "visa_type": req.visa_type,
    }

    # Save user message to session
    await _save_message(session_id, user_id, "user", req.message, req.pack_id)

    async def event_stream():
        full_response = []
        try:
            async for token in wise_chat(
                message=req.message,
                session_id=session_id,
                ctx=ctx,
                model_profile=req.model_profile,
                pack_system_prompt=pack_system_prompt,
            ):
                full_response.append(token)
                yield f"data: {json.dumps({'token': token, 'session_id': session_id})}\n\n"

            # Save assistant message
            await _save_message(session_id, user_id, "assistant",
                                 "".join(full_response), req.pack_id)
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
        except Exception as exc:
            logger.error("wise_chat stream error: %s", exc)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


async def _save_message(
    session_id: str, user_id: Optional[str], role: str,
    content: str, pack_id: Optional[str]
) -> None:
    now = datetime.now(timezone.utc)
    await wise_sessions_col.update_one(
        {"session_id": session_id},
        {
            "$setOnInsert": {
                "session_id": session_id,
                "user_id": user_id,
                "pack_id": pack_id,
                "created_at": now,
            },
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "ts": now,
                }
            },
            "$set": {"updated_at": now},
        },
        upsert=True,
    )


# ---------------------------------------------------------------------------
# Knowledge ingest (admin)
# ---------------------------------------------------------------------------

@router.post("/ingest", status_code=201)
async def ingest_knowledge(req: IngestRequest, user=Depends(get_current_user)):
    """Embed and store a knowledge chunk. Admin-only in production via middleware."""
    from wise.embeddings import embed

    doc_id = str(uuid.uuid4())
    vec = await embed(req.text)

    await visa_knowledge_col.insert_one({
        "_id": doc_id,
        "text": req.text,
        "title": req.title,
        "country": req.country,
        "visa_type": req.visa_type,
        "source_url": req.source_url,
        "embedding": vec,
        "created_by": str(user["_id"]),
        "created_at": datetime.now(timezone.utc),
        "last_updated": datetime.now(timezone.utc),
    })
    return {"id": doc_id, "message": "Ingested successfully"}


@router.get("/knowledge")
async def list_knowledge(
    country: Optional[str] = None,
    visa_type: Optional[str] = None,
    limit: int = 50,
    _=Depends(get_current_user),
):
    """List knowledge documents (no embeddings returned)."""
    query: dict = {}
    if country:
        query["country"] = country
    if visa_type:
        query["visa_type"] = visa_type
    docs = await visa_knowledge_col.find(
        query, {"embedding": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
    return {"docs": docs, "count": len(docs)}


@router.delete("/knowledge/{doc_id}", status_code=204)
async def delete_knowledge(doc_id: str, _=Depends(get_current_user)):
    result = await visa_knowledge_col.delete_one({"_id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Knowledge doc not found")


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@router.get("/sessions")
async def list_sessions(limit: int = 20, user=Depends(get_current_user)):
    user_id = str(user["_id"])
    sessions = await wise_sessions_col.find(
        {"user_id": user_id},
        {"messages": {"$slice": -1}},  # last message preview
    ).sort("updated_at", -1).limit(limit).to_list(length=limit)
    for s in sessions:
        s["id"] = str(s.pop("_id", ""))
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    session = await wise_sessions_col.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    # Only the owner can read their session
    user_id = str(user["_id"])
    if session.get("user_id") and session["user_id"] != user_id:
        raise HTTPException(403, "Access denied")
    session["id"] = str(session.pop("_id", ""))
    return session


# ---------------------------------------------------------------------------
# Packs
# ---------------------------------------------------------------------------

@router.get("/packs")
async def list_packs(country: Optional[str] = None):
    query: dict = {"is_active": True}
    if country:
        query["$or"] = [{"countries": country}, {"countries": []}]
    packs = await wise_packs_col.find(query, {"_id": 0}).to_list(length=50)
    return {"packs": packs}


# ---------------------------------------------------------------------------
# Model profiles
# ---------------------------------------------------------------------------

@router.get("/models")
async def list_models():
    """Return available model profiles for Wise."""
    from model_router import list_profiles
    profiles = list_profiles()
    wise_profiles = [
        {
            "id": p["id"],
            "name": p.get("name", p["id"]),
            "provider": p.get("provider"),
            "tier": p.get("tier"),
            "description": p.get("description", ""),
        }
        for p in profiles
    ]
    return {"models": wise_profiles}
