"""Student Memory — persistent cross-session profile extraction and storage.

Extracts structured facts from chatbot conversations via LLM and stores
them per-user in MongoDB.  Memory is injected back into the chatbot
context so the assistant "remembers" the student across sessions.

Collections:
  student_memories   — one doc per (user_id, key) pair
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime
from typing import Any, Optional

from db import db

logger = logging.getLogger("wehive.student_memory")

EXTRACTABLE_FACTS = [
    "nationality", "education_level", "test_scores", "target_countries",
    "budget_range", "preferred_intake", "career_goals", "document_status",
    "work_experience_years", "age", "marital_status", "languages",
    "current_country", "degree_type", "university_preference",
]

_EXTRACT_SYSTEM_PROMPT = """\
You are a profile-extraction assistant for a visa/study-abroad platform.
Given a conversation turn between a student and an AI advisor, extract
any NEW or UPDATED student profile facts.

Extractable keys: {keys}

Known profile so far:
{profile}

Rules:
- Return ONLY a JSON array of objects: [{{"type":"fact"|"preference"|"milestone","key":"...","value":...,"confidence":0.0-1.0}}]
- Return an empty array [] if no new facts are present.
- "type" is "fact" for explicit statements, "preference" for inferred preferences, "milestone" for events.
- "value" should be a string, number, or list — whatever fits the key.
- "confidence" reflects how certain the extraction is (1.0 = explicitly stated).
- Do NOT repeat facts already in the known profile unless the value changed.
- Output raw JSON only, no markdown fences.
"""

_EXTRACT_USER_PROMPT = """\
Student said: {user_message}

Advisor replied: {assistant_message}

Extract new/updated profile facts as a JSON array:"""

# ---- JSON helpers ----

_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.S)


def _parse_json_array(text: str) -> list[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass
    m = _JSON_ARRAY_RE.search(text)
    if m:
        try:
            parsed = json.loads(m.group())
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
    return []


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------


async def extract_facts_from_turn(
    user_message: str,
    assistant_message: str,
    user_id: str,
    existing_profile: Optional[dict] = None,
) -> list[dict]:
    """Use an LLM call to extract structured facts from a conversation turn."""
    from agent_framework import _llm_call

    if not user_message or not user_message.strip():
        return []

    profile_str = json.dumps(existing_profile or {}, ensure_ascii=False, default=str)
    system = _EXTRACT_SYSTEM_PROMPT.format(
        keys=", ".join(EXTRACTABLE_FACTS),
        profile=profile_str,
    )
    user = _EXTRACT_USER_PROMPT.format(
        user_message=user_message[:2000],
        assistant_message=(assistant_message or "")[:2000],
    )

    try:
        reply, _info = await _llm_call(
            user_id=user_id,
            system_prompt=system,
            user_prompt=user,
            max_tokens=512,
        )
    except Exception as e:
        logger.warning("LLM extraction failed: %s", e)
        return []

    facts = _parse_json_array(reply or "")
    valid: list[dict] = []
    for f in facts:
        if not isinstance(f, dict):
            continue
        key = f.get("key")
        value = f.get("value")
        if not key or value is None:
            continue
        valid.append({
            "type": f.get("type", "fact"),
            "key": str(key),
            "value": value,
            "confidence": min(max(float(f.get("confidence", 0.5)), 0.0), 1.0),
        })
    return valid


async def upsert_memories(user_id: str, memories: list[dict]) -> int:
    """Upsert extracted memories. Returns count of upserted docs."""
    if not memories:
        return 0
    coll = db["student_memories"]
    count = 0
    now = datetime.utcnow().isoformat()
    for mem in memories:
        key = mem.get("key")
        if not key:
            continue
        existing = await coll.find_one({"user_id": user_id, "key": key})
        if existing:
            old_value = existing.get("value")
            if old_value == mem["value"]:
                continue
            await coll.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "value": mem["value"],
                        "type": mem.get("type", existing.get("type", "fact")),
                        "confidence": mem.get("confidence", 0.5),
                        "extracted_at": now,
                    },
                    "$push": {
                        "history": {
                            "value": old_value,
                            "extracted_at": existing.get("extracted_at", now),
                        }
                    },
                },
            )
        else:
            await coll.insert_one({
                "_id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": mem.get("type", "fact"),
                "key": key,
                "value": mem["value"],
                "confidence": mem.get("confidence", 0.5),
                "source": "conversation",
                "extracted_at": now,
                "history": [],
            })
        count += 1
    return count


async def get_student_profile(user_id: str) -> dict:
    """Build a flat profile dict from all memories for a user."""
    coll = db["student_memories"]
    profile: dict[str, Any] = {}
    async for doc in coll.find({"user_id": user_id}, {"_id": 0, "key": 1, "value": 1, "type": 1, "confidence": 1}):
        key = doc.get("key", "")
        if "." in key:
            parts = key.split(".", 1)
            parent = parts[0]
            child = parts[1]
            if parent not in profile or not isinstance(profile[parent], dict):
                profile[parent] = {}
            profile[parent][child] = doc.get("value")
        else:
            profile[key] = doc.get("value")
    return profile


async def get_memory_context(user_id: str) -> str:
    """Format memories as natural language for chatbot injection."""
    profile = await get_student_profile(user_id)
    if not profile:
        return ""

    parts: list[str] = []
    mapping = {
        "nationality": "Nationality: {}",
        "current_country": "Currently in: {}",
        "education_level": "Education: {}",
        "degree_type": "Degree type: {}",
        "test_scores": "Test scores: {}",
        "target_countries": "Target countries: {}",
        "budget_range": "Budget: {}",
        "preferred_intake": "Preferred intake: {}",
        "career_goals": "Career goals: {}",
        "document_status": "Document status: {}",
        "work_experience_years": "Work experience: {} years",
        "age": "Age: {}",
        "languages": "Languages: {}",
        "university_preference": "University preference: {}",
    }
    for key, template in mapping.items():
        val = profile.get(key)
        if val is None:
            continue
        if isinstance(val, list):
            val = ", ".join(str(v) for v in val)
        elif isinstance(val, dict):
            val = ", ".join(f"{k}: {v}" for k, v in val.items())
        parts.append(template.format(val))

    if not parts:
        return ""
    return "Known about this student: " + ". ".join(parts) + "."


async def record_milestone(user_id: str, event: str, metadata: Optional[dict] = None) -> None:
    """Record an application milestone."""
    coll = db["student_memories"]
    now = datetime.utcnow().isoformat()
    key = f"milestone.{event}"
    await coll.update_one(
        {"user_id": user_id, "key": key},
        {
            "$set": {
                "type": "milestone",
                "value": metadata or {"event": event},
                "confidence": 1.0,
                "source": "system",
                "extracted_at": now,
            },
            "$setOnInsert": {
                "_id": str(uuid.uuid4()),
                "user_id": user_id,
                "key": key,
                "history": [],
            },
        },
        upsert=True,
    )


async def delete_memory(user_id: str, key: str) -> bool:
    """Delete a specific memory. Returns True if deleted."""
    coll = db["student_memories"]
    result = await coll.delete_one({"user_id": user_id, "key": key})
    return (result.deleted_count or 0) > 0
