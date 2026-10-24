"""Community contributions — success stories, visa interview experiences, event submissions.

Signed-in users submit; everything lands as `pending` and goes live only after an
admin approves it (same flow as aggregated news/blogs). Approved interview
experiences feed an automatic question bank per visa type, ranked by how often
each question was really asked.

Public:
  GET  /api/community/stories                    approved success stories
  GET  /api/community/interviews                 approved interview experiences
  GET  /api/community/interview-questions        question bank for a visa type
  GET  /api/community/visa-types                 supported visa types
User:
  POST /api/community/stories | /interviews | /events
Admin:
  GET  /api/community/{kind}/pending
  POST /api/community/{kind}/{id}/approve | reject
"""
from __future__ import annotations

import re
import uuid
from collections import Counter
from datetime import date, datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, HttpUrl, field_validator

from admin_auth import get_current_admin_flex
from auth_utils import get_current_user
from db import db, global_events_col
from rate_limit import RateLimit

router = APIRouter(prefix="/community", tags=["community"])

stories_col = db["community_stories"]
interviews_col = db["interview_experiences"]
COLLECTIONS = {"stories": stories_col, "interviews": interviews_col}

_submit_limiter = RateLimit(max_calls=10, window_seconds=3600)

# slug -> label + destination (country_id matches news/blog/event items)
VISA_TYPES = {
    "us-f1": {"label": "US F-1 Student", "country_id": "usa"},
    "us-j1": {"label": "US J-1 Exchange", "country_id": "usa"},
    "us-b1b2": {"label": "US B1/B2 Visitor", "country_id": "usa"},
    "us-h1b": {"label": "US H-1B (stamping)", "country_id": "usa"},
    "uk-student": {"label": "UK Student", "country_id": "united-kingdom"},
    "uk-visitor": {"label": "UK Visitor", "country_id": "united-kingdom"},
    "canada-study": {"label": "Canada Study Permit", "country_id": "canada"},
    "australia-student": {"label": "Australia Student (500)", "country_id": "australia"},
    "new-zealand-student": {"label": "New Zealand Student", "country_id": "new-zealand"},
    "ireland-study": {"label": "Ireland Study", "country_id": "ireland"},
    "germany-student": {"label": "Germany Student", "country_id": "germany"},
    "schengen-student": {"label": "Schengen Student", "country_id": "europe"},
    "schengen-visitor": {"label": "Schengen Visitor", "country_id": "europe"},
    "other": {"label": "Other", "country_id": "global"},
}
VisaType = Literal[tuple(VISA_TYPES)]  # type: ignore[valid-type]

# Personal data that must never be published: passport (Indian format), Aadhaar,
# DS-160 confirmation, SEVIS id, email addresses and phone numbers.
_PII_PATTERNS = [
    re.compile(r"\b[A-Z][0-9]{7}\b"),
    re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
    re.compile(r"\bAA[0-9A-Z]{8}\b"),
    re.compile(r"\bN\d{10}\b"),
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
    re.compile(r"(?<!\d)(?:\+?\d[\s-]?){10,13}(?!\d)"),
]
# Links and sales pitches. (Not the review spam list: it also rejects everyday
# words such as "winter intake" and "free tuition".)
_SPAM_PATTERNS = [
    re.compile(r"https?://|www\.", re.I),
    re.compile(r"\b(buy|cheap|discount|promo|guaranteed)\b.*\b(visa|passport|documents?|admission)\b", re.I),
    re.compile(r"(.)\1{10,}"),
]


def check_text(*parts: str) -> None:
    """Reject spam and personal identifiers in user-written text (400)."""
    text = " ".join(p for p in parts if p)
    if any(p.search(text) for p in _PII_PATTERNS):
        raise HTTPException(400, "Please remove personal details (passport, Aadhaar, DS-160/SEVIS numbers, email or phone) before posting.")
    if any(p.search(text) for p in _SPAM_PATTERNS):
        raise HTTPException(400, "Links, contact details and promotional text aren't allowed in posts.")


def _display_name(user: dict, anonymous: bool) -> str:
    if anonymous:
        return "WeHive member"
    first = (user.get("name") or "").split(" ")[0]
    return first or "WeHive member"


def _public(doc: dict) -> dict:
    doc = {k: v for k, v in doc.items() if k not in ("_id", "user_id")}
    for k in ("created_at", "moderated_at"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat() + "Z"
    return doc


def normalize_question(q: str) -> str:
    """Key for grouping the same question asked in different words/casing."""
    q = re.sub(r"[^a-z0-9 ]", " ", q.lower())
    return re.sub(r"\s+", " ", q).strip()


# ---------------------------------------------------------------- models


class StoryCreate(BaseModel):
    visa_type: VisaType
    outcome: Literal["visa-approved", "admit", "i20-cas-coe", "scholarship", "pr-approved"]
    university: str = Field("", max_length=120)
    program: str = Field("", max_length=120)
    intake: str = Field("", max_length=30)
    story: str = Field(min_length=40, max_length=2000)
    anonymous: bool = False


class InterviewCreate(BaseModel):
    visa_type: VisaType
    consulate: str = Field(min_length=2, max_length=80)
    interview_date: date
    outcome: Literal["approved", "rejected", "administrative-processing"]
    duration_minutes: Optional[int] = Field(None, ge=1, le=120)
    questions: List[str] = Field(min_length=1, max_length=30)
    tips: str = Field("", max_length=1000)
    anonymous: bool = True  # interviews are anonymous unless the user opts out

    @field_validator("questions")
    @classmethod
    def _clean_questions(cls, qs: List[str]) -> List[str]:
        cleaned = [re.sub(r"\s+", " ", q).strip()[:300] for q in qs]
        cleaned = [q for q in cleaned if len(q) >= 5]
        if not cleaned:
            raise ValueError("add at least one question you were asked")
        return cleaned

    @field_validator("interview_date")
    @classmethod
    def _not_future(cls, d: date) -> date:
        if d > date.today():
            raise ValueError("interview date can't be in the future")
        return d


class EventSubmit(BaseModel):
    name: str = Field(min_length=5, max_length=150)
    date: date
    country_id: str = Field(min_length=2, max_length=40, pattern=r"^[a-z-]+$")
    city: str = Field("", max_length=80)
    online: bool = False
    category: Literal["Education Fair", "Info Session", "Visa & Immigration", "Scholarship", "Meetup"]
    organiser: str = Field(min_length=2, max_length=120)
    source_url: HttpUrl
    description: str = Field("", max_length=1000)

    @field_validator("date")
    @classmethod
    def _upcoming(cls, d: date) -> date:
        if d < date.today():
            raise ValueError("only upcoming events can be submitted")
        return d


# ---------------------------------------------------------------- public


@router.get("/visa-types")
async def visa_types():
    return [{"id": k, **v} for k, v in VISA_TYPES.items()]


async def _list_approved(col, filt: dict, page: int, limit: int, sort_field: str) -> dict:
    filt = {**filt, "status": "approved"}
    total = await col.count_documents(filt)
    cursor = col.find(filt).sort(sort_field, -1).skip((page - 1) * limit).limit(limit)
    items = [_public(d) for d in await cursor.to_list(length=limit)]
    return {"items": items, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/stories")
async def list_stories(
    visa_type: Optional[VisaType] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    filt = {"visa_type": visa_type} if visa_type else {}
    return await _list_approved(stories_col, filt, page, limit, "created_at")


@router.get("/interviews")
async def list_interviews(
    visa_type: Optional[VisaType] = None,
    consulate: Optional[str] = Query(None, max_length=80),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    filt: dict = {"visa_type": visa_type} if visa_type else {}
    if consulate:
        filt["consulate"] = {"$regex": f"^{re.escape(consulate)}$", "$options": "i"}
    return await _list_approved(interviews_col, filt, page, limit, "interview_date")


@router.get("/interview-questions")
async def interview_questions(
    visa_type: VisaType,
    consulate: Optional[str] = Query(None, max_length=80),
    limit: int = Query(20, ge=1, le=50),
):
    """Question bank built from approved interview experiences: each distinct
    question with how many interviews it came up in, newest-first on ties."""
    filt: dict = {"status": "approved", "visa_type": visa_type}
    if consulate:
        filt["consulate"] = {"$regex": f"^{re.escape(consulate)}$", "$options": "i"}
    docs = await interviews_col.find(
        filt, {"questions": 1, "interview_date": 1, "outcome": 1}
    ).sort("interview_date", -1).to_list(length=2000)

    counts: Counter = Counter()
    wording: dict = {}  # normalized key -> Counter of original phrasings
    last_asked: dict = {}
    for d in docs:
        asked = d.get("interview_date") or ""
        per_interview = {normalize_question(q): q for q in d.get("questions", [])}
        for k, original in per_interview.items():  # count a question once per interview
            if not k:
                continue
            counts[k] += 1
            wording.setdefault(k, Counter())[original] += 1
            last_asked[k] = max(last_asked.get(k, ""), asked)

    ranked = sorted(counts, key=lambda k: (counts[k], last_asked[k]), reverse=True)[:limit]
    n = len(docs)
    return {
        "visa_type": visa_type,
        "label": VISA_TYPES[visa_type]["label"],
        "interviews": n,
        "outcomes": dict(Counter(d.get("outcome") for d in docs)),
        "questions": [
            {
                "question": wording[k].most_common(1)[0][0],
                "asked_in": counts[k],
                "share": round(counts[k] / n, 2) if n else 0,
                "last_asked": last_asked[k] or None,
            }
            for k in ranked
        ],
    }


# ---------------------------------------------------------------- user submissions


@router.post("/stories", status_code=201)
async def submit_story(body: StoryCreate, user=Depends(get_current_user), _=Depends(_submit_limiter)):
    check_text(body.university, body.program, body.intake, body.story)
    label = VISA_TYPES[body.visa_type]["label"]
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(exclude={"anonymous"}),
        "title": f"{label}: {body.outcome.replace('-', ' ')}" + (f" — {body.university}" if body.university else ""),
        "content": body.story,
        "country_id": VISA_TYPES[body.visa_type]["country_id"],
        "category": label,
        "source_name": _display_name(user, body.anonymous),
        "user_id": user["_id"],
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    await stories_col.insert_one(doc)
    return {"id": doc["id"], "status": "pending"}


@router.post("/interviews", status_code=201)
async def submit_interview(body: InterviewCreate, user=Depends(get_current_user), _=Depends(_submit_limiter)):
    check_text(body.consulate, body.tips, *body.questions)
    label = VISA_TYPES[body.visa_type]["label"]
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(exclude={"anonymous", "interview_date"}),
        "interview_date": body.interview_date.isoformat(),
        "title": f"{label} interview at {body.consulate} — {body.outcome.replace('-', ' ')}",
        "content": " · ".join(body.questions),
        "date": body.interview_date.isoformat(),
        "country_id": VISA_TYPES[body.visa_type]["country_id"],
        "category": label,
        "source_name": _display_name(user, body.anonymous),
        "user_id": user["_id"],
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    await interviews_col.insert_one(doc)
    return {"id": doc["id"], "status": "pending"}


@router.post("/events", status_code=201)
async def submit_event(body: EventSubmit, user=Depends(get_current_user), _=Depends(_submit_limiter)):
    """User-submitted event → the existing Global Events moderation queue."""
    check_text(body.name, body.city, body.organiser, body.description)
    if await global_events_col.find_one({"source_url": str(body.source_url), "date": body.date.isoformat()}):
        raise HTTPException(409, "This event has already been submitted.")
    await global_events_col.insert_one({
        "name": body.name,
        "country_id": "global" if body.online else body.country_id,
        "city": body.city,
        "date": body.date.isoformat(),
        "category": body.category,
        "organiser": body.organiser,
        "description": body.description,
        "image_url": None,
        "source_url": str(body.source_url),
        "source": "user",
        "submitted_by": user["_id"],
        "status": "pending",
        "is_high_risk": False,
        "created_at": datetime.utcnow(),
    })
    return {"status": "pending"}


# ---------------------------------------------------------------- admin moderation


Kind = Literal["stories", "interviews"]


@router.get("/{kind}/pending")
async def list_pending(
    kind: Kind,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _admin=Depends(get_current_admin_flex),
):
    col = COLLECTIONS[kind]
    total = await col.count_documents({"status": "pending"})
    cursor = col.find({"status": "pending"}).sort("created_at", 1).skip((page - 1) * limit).limit(limit)
    items = [_public(d) for d in await cursor.to_list(length=limit)]
    return {"items": items, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/{kind}/{item_id}/{action}")
async def moderate(kind: Kind, item_id: str, action: Literal["approve", "reject"], admin=Depends(get_current_admin_flex)):
    res = await COLLECTIONS[kind].update_one(
        {"id": item_id},
        {"$set": {
            "status": "approved" if action == "approve" else "rejected",
            "moderated_by": str(admin.get("_id") or admin.get("email") or "admin"),
            "moderated_at": datetime.utcnow(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Item not found")
    return {"id": item_id, "status": "approved" if action == "approve" else "rejected"}
