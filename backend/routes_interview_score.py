"""Visa Interview Simulator scoring.

POST /api/interview/score scores each answer on four criteria (0-25 each):
clarity, specificity, confidence and preparation, with one line of feedback.

The AI model (via the marketplace fallback chain) scores first. If no model is
available, or it returns something unusable, a transparent rule-based rubric
scores instead. The response says which method was used, so the page never
presents a guess as an assessment.
"""
from __future__ import annotations

import json
import logging
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from ai_marketplace import marketplace
from auth_utils import get_current_user_optional
from rate_limit import RateLimit

router = APIRouter(prefix="/interview", tags=["interview"])
logger = logging.getLogger("wehive.interview_score")

CRITERIA = ("clarity", "specificity", "confidence", "preparation")
ANON_USER_ID = "interview_simulator_anon"
_score_limiter = RateLimit(max_calls=12, window_seconds=600)


class QA(BaseModel):
    question: str = Field(min_length=3, max_length=400)
    answer: str = Field("", max_length=3000)


class ScoreRequest(BaseModel):
    visa: str = Field("", max_length=80)  # e.g. "US F-1 Student Visa"
    items: List[QA] = Field(min_length=1, max_length=30)


# ------------------------------------------------------------ rule-based rubric

_FILLERS = re.compile(r"\b(um+|uh+|like|basically|actually|you know|so yeah)\b", re.I)
_HEDGES = re.compile(r"\b(maybe|perhaps|i think|i guess|not sure|i don'?t know|hopefully|probably|kind of|sort of)\b", re.I)
_DEFINITE = re.compile(r"\b(i will|i am|i have|my plan|i chose|i selected|i'?ve been)\b", re.I)
_NUMBERS = re.compile(r"(₹|\$|£|€|inr|usd|lakh|lakhs|crore|\d)", re.I)
_STOP = set("a an the is are was were do does did you your to of in on for and or why what how who when where which this that with from at be as it".split())

# What a consular officer listens for, by question topic.
_TOPICS = [
    (re.compile(r"fund|pay|afford|sponsor|financ|loan|cost|expens", re.I),
     re.compile(r"loan|scholarship|sponsor|savings|salary|income|bank|father|mother|parents|assistantship|₹|\$|lakh|crore", re.I)),
    (re.compile(r"after|graduat|plan|return|future|career", re.I),
     re.compile(r"return|india|home|job|career|company|role|family|opt|graduate route|work", re.I)),
    (re.compile(r"universit|college|school|program|course|choose|why this", re.I),
     re.compile(r"course|curriculum|faculty|professor|research|lab|ranking|module|specialization|project", re.I)),
    (re.compile(r"relative|family|friend|know anyone", re.I),
     re.compile(r"no |yes|cousin|uncle|aunt|brother|sister|friend|status|citizen|h-?1b", re.I)),
]


def _words(text: str) -> List[str]:
    return re.findall(r"[A-Za-z']+", text)


def rubric_score(question: str, answer: str) -> dict:
    """Deterministic score from observable features of the answer."""
    answer = (answer or "").strip()
    if not answer or answer == "(skipped)":
        return {**{c: 0 for c in CRITERIA}, "score": 0, "feedback": "Skipped. Officers expect an answer to every question."}

    words = _words(answer)
    n = len(words)

    # Clarity: a direct answer of ~25-120 words, few fillers.
    clarity = 25 if 25 <= n <= 120 else 18 if 12 <= n < 25 or 120 < n <= 180 else 8
    clarity -= min(10, 3 * len(_FILLERS.findall(answer)))

    # Specificity: figures, names and concrete nouns.
    proper = sum(1 for i, w in enumerate(words) if w[0].isupper() and i > 0 and w.lower() not in ("i",))
    specificity = 5 + min(10, 4 * len(_NUMBERS.findall(answer))) + min(10, 3 * proper)

    # Confidence: definite statements, no hedging.
    confidence = 15 + min(10, 4 * len(_DEFINITE.findall(answer))) - min(15, 5 * len(_HEDGES.findall(answer)))

    # Preparation: answers the question asked, covering what officers look for.
    q_keys = {w.lower() for w in _words(question) if w.lower() not in _STOP and len(w) > 3}
    overlap = len(q_keys & {w.lower() for w in words})
    topic_hits = sum(len(set(m.group(0).lower() for m in want.finditer(answer)))
                     for ask, want in _TOPICS if ask.search(question))
    preparation = 5 + min(8, 4 * overlap) + min(12, 4 * topic_hits)

    parts = {c: max(0, min(25, v)) for c, v in
             zip(CRITERIA, (clarity, specificity, confidence, preparation))}
    weakest = min(parts, key=parts.get)
    if parts[weakest] >= 18:
        return {**parts, "score": sum(parts.values()), "feedback": "Strong answer: clear, specific and on point."}
    feedback = {
        "clarity": "Answer directly in 2-4 sentences; drop filler words.",
        "specificity": "Add specifics: amounts, names of courses, professors or employers.",
        "confidence": "State it plainly ('I will…', 'My plan is…') instead of 'I think' or 'maybe'.",
        "preparation": "Address exactly what was asked, e.g. who funds you, why this program, your plan after.",
    }[weakest]
    return {**parts, "score": sum(parts.values()), "feedback": feedback}


# ------------------------------------------------------------ AI scoring

_SYSTEM = (
    "You are a strict but fair visa consular officer coach. Score each answer to a mock visa "
    "interview question on four criteria, each an integer 0-25: clarity (direct, concise), "
    "specificity (concrete facts, figures, names), confidence (assertive, no hedging), "
    "preparation (answers what was asked and covers what an officer checks for this visa: "
    "genuine study/visit intent, funding, ties to home country, plans). An empty or skipped "
    "answer scores 0 on all. Give one short, actionable feedback sentence per answer. "
    'Reply with JSON only: {"scores": [{"clarity": int, "specificity": int, "confidence": int, '
    '"preparation": int, "feedback": str}, ...]} with exactly one entry per question, in order.'
)


def _parse_ai(reply: str, count: int) -> Optional[List[dict]]:
    m = re.search(r"\{.*\}", reply or "", re.S)
    if not m:
        return None
    try:
        scores = json.loads(m.group(0)).get("scores")
    except (json.JSONDecodeError, AttributeError):
        return None
    if not isinstance(scores, list) or len(scores) != count:
        return None
    out = []
    for s in scores:
        if not isinstance(s, dict):
            return None
        try:
            parts = {c: max(0, min(25, int(s.get(c, 0)))) for c in CRITERIA}
        except (TypeError, ValueError):
            return None
        out.append({**parts, "score": sum(parts.values()), "feedback": str(s.get("feedback", ""))[:300]})
    return out


async def _ai_scores(user_id: str, body: ScoreRequest) -> Optional[List[dict]]:
    payload = [{"question": i.question, "answer": i.answer.strip() or "(skipped)"} for i in body.items]
    prompt = f"Visa: {body.visa or 'student visa'}\nInterview:\n{json.dumps(payload, ensure_ascii=False)}"
    try:
        reply = await marketplace.chat(user_id=user_id, system_prompt=_SYSTEM, user_prompt=prompt, max_tokens=1500)
    except Exception as e:  # no provider / quota / network
        logger.info("Interview AI scoring unavailable: %s", e)
        return None
    return _parse_ai(reply, len(body.items))


@router.post("/score")
async def score_interview(
    body: ScoreRequest,
    request: Request,
    _=Depends(_score_limiter),
    user=Depends(get_current_user_optional),
):
    user_id = (user or {}).get("_id") or ANON_USER_ID
    items = await _ai_scores(user_id, body)
    method = "ai"
    if items is None:
        method = "rubric"
        items = [rubric_score(i.question, i.answer) for i in body.items]
    else:
        # Never let the model award points for a blank answer.
        for i, (qa, s) in enumerate(zip(body.items, items)):
            if not qa.answer.strip() or qa.answer.strip() == "(skipped)":
                items[i] = rubric_score(qa.question, "")

    n = len(items)
    criteria = {c: round(sum(s[c] for s in items) / n * 4) for c in CRITERIA}  # 0-100 each
    return {
        "method": method,
        "total": round(sum(s["score"] for s in items) / n),
        "criteria": criteria,
        "items": items,
    }
