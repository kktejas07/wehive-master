"""Wise Interview Q Bank + Mock Session Engine.

Endpoints live in wise/router_interview.py and are included by wise/router.py.

Collections:
  interview_questions  — Q bank (seed data below)
  interview_sessions   — Mock interview runs with per-answer scoring
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth_utils import get_current_user
from db import interview_questions_col, interview_sessions_col

router = APIRouter(prefix="/wise/interview", tags=["wise-interview"])
logger = logging.getLogger("wehive.wise.interview")

# ---------------------------------------------------------------------------
# Seed Q Bank
# ---------------------------------------------------------------------------

SEED_QUESTIONS: List[Dict] = [
    # ---- USA F-1 ----
    {"country": "US", "visa_type": "F-1", "difficulty": "easy",
     "question": "Why did you choose this university?",
     "model_answer": "Specific program ranking, faculty research, alumni outcomes, and campus culture.",
     "red_flags": ["I don't know much about it", "It was the only one that accepted me"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "medium",
     "question": "Who is sponsoring your education and how?",
     "model_answer": "Name the sponsor, explain their income source, state exact amounts, tie to bank statements.",
     "red_flags": ["My friend will pay", "I haven't figured that out yet"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "medium",
     "question": "What are your plans after graduation?",
     "model_answer": "Return home with specific job offer type or family business; show strong home ties.",
     "red_flags": ["I want to stay in the US permanently", "I'll figure it out"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "hard",
     "question": "Why didn't you study in India instead of the US?",
     "model_answer": "Research opportunities, specific faculty, industry connections, global exposure not available locally.",
     "red_flags": ["Indian education is inferior", "I just want to go abroad"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "hard",
     "question": "You have a gap year. What did you do during that time?",
     "model_answer": "Explain productively: work experience, research, family responsibilities, skill development.",
     "red_flags": ["Nothing", "I was just waiting for admission"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "medium",
     "question": "What is your field of study and future career path?",
     "model_answer": "Specific field, career goal, how the degree enables it, return home opportunity.",
     "red_flags": ["I haven't decided yet", "Whatever pays well"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "easy",
     "question": "Have you visited the US before?",
     "model_answer": "If yes, explain when and why. If no, explain how you prepared for the transition.",
     "red_flags": ["I overstayed my previous visa"]},
    {"country": "US", "visa_type": "F-1", "difficulty": "hard",
     "question": "Do you have relatives in the US?",
     "model_answer": "Be honest. If yes, clarify they won't sponsor you and explain your independent funding.",
     "red_flags": ["Yes, they'll take care of me"]},
    # ---- USA H-1B ----
    {"country": "US", "visa_type": "H-1B", "difficulty": "medium",
     "question": "Describe your specialized occupation.",
     "model_answer": "Specific technical role, degree requirement, job duties, employer need for specialty.",
     "red_flags": ["General IT work", "I do whatever my manager asks"]},
    {"country": "US", "visa_type": "H-1B", "difficulty": "hard",
     "question": "How did you receive your H-1B lottery selection?",
     "model_answer": "USCIS lottery, employer filed petition, I-129, approval notice I-797.",
     "red_flags": ["I paid someone to get it", "I'm not sure how it works"]},
    # ---- UK Student ----
    {"country": "GB", "visa_type": "Student", "difficulty": "easy",
     "question": "What is your CAS number and what does it mean?",
     "model_answer": "Confirmation of Acceptance for Studies — 14-character reference from your university.",
     "red_flags": ["I don't have it yet", "I don't know what CAS means"]},
    {"country": "GB", "visa_type": "Student", "difficulty": "medium",
     "question": "How will you fund your studies and living costs in the UK?",
     "model_answer": "Specific amounts covering tuition + £1,334/month London maintenance; name the source.",
     "red_flags": ["My agent will arrange it", "I'll work part-time only"]},
    {"country": "GB", "visa_type": "Student", "difficulty": "hard",
     "question": "Have you ever been refused a UK visa?",
     "model_answer": "Be truthful. If yes, explain what changed and why the application is now stronger.",
     "red_flags": ["No, never had issues"]},
    # ---- Canada Study Permit ----
    {"country": "CA", "visa_type": "Study Permit", "difficulty": "easy",
     "question": "What is the GIC and which bank are you using?",
     "model_answer": "Guaranteed Investment Certificate — CAD 10,000 at a designated bank for living expenses.",
     "red_flags": ["I'll arrange it after arrival"]},
    {"country": "CA", "visa_type": "Study Permit", "difficulty": "medium",
     "question": "What are your ties to your home country?",
     "model_answer": "Family, property, job offer, business, community involvement — concrete and specific.",
     "red_flags": ["I don't have strong ties", "I might stay in Canada"]},
    {"country": "CA", "visa_type": "Study Permit", "difficulty": "hard",
     "question": "Explain the purpose of your study and your career plans after returning.",
     "model_answer": "Connect degree to career path, show job market in home country, demonstrate intent to return.",
     "red_flags": ["I want to do PR", "Canada has better opportunities"]},
    # ---- Australia Subclass 500 ----
    {"country": "AU", "visa_type": "500", "difficulty": "medium",
     "question": "What does Genuine Temporary Entrant mean and how does it apply to you?",
     "model_answer": "Intent to study and return home; show home ties, employment prospects, family obligations.",
     "red_flags": ["I want to stay in Australia", "I don't know what GTE means"]},
    {"country": "AU", "visa_type": "500", "difficulty": "hard",
     "question": "How did you choose this specific course and institution?",
     "model_answer": "Research on CRICOS provider, course content alignment with career goal, specific faculty.",
     "red_flags": ["It was cheapest", "My agent recommended it"]},
    # ---- Schengen ----
    {"country": "SCHENGEN", "visa_type": "C-visa", "difficulty": "easy",
     "question": "What is the purpose of your visit?",
     "model_answer": "Specific purpose: conference, tourism, university visit. Dates and itinerary match invitation letter.",
     "red_flags": ["Just to explore Europe", "To visit my friend who lives there"]},
    {"country": "SCHENGEN", "visa_type": "C-visa", "difficulty": "medium",
     "question": "What is your return plan and what ties you to your home country?",
     "model_answer": "Return ticket booked, employment confirmed, family, property ownership.",
     "red_flags": ["I haven't thought about return", "I might extend my stay"]},
    # ---- Germany Work ----
    {"country": "DE", "visa_type": "Work", "difficulty": "medium",
     "question": "Do you have a job offer from a German employer?",
     "model_answer": "Written employment contract, employer registration number, ZAV approval if required.",
     "red_flags": ["I'll find work after I arrive"]},
    # ---- New Zealand ----
    {"country": "NZ", "visa_type": "Student", "difficulty": "easy",
     "question": "What is your offer of place and fee payment confirmation?",
     "model_answer": "Official Letter of Offer from a registered NZ provider, evidence of tuition fee payment.",
     "red_flags": ["I haven't paid fees yet"]},
    # ---- Ireland ----
    {"country": "IE", "visa_type": "Student", "difficulty": "medium",
     "question": "What is the GNIB and IRP and when must you register?",
     "model_answer": "Garda National Immigration Bureau / Irish Residence Permit — register within 90 days of arrival.",
     "red_flags": ["I'll ask someone when I get there"]},
    # ---- Singapore ----
    {"country": "SG", "visa_type": "Student Pass", "difficulty": "easy",
     "question": "What is the Student's Pass and how is it different from the visa sticker?",
     "model_answer": "Student's Pass is issued by ICA after in-country registration; visa is entry permission only.",
     "red_flags": ["They're the same thing"]},
    # ---- Sweden ----
    {"country": "SE", "visa_type": "Student", "difficulty": "medium",
     "question": "What is the tuition fee situation for non-EU students in Sweden?",
     "model_answer": "Non-EU/EEA students pay tuition; must show SEK 8,514/month maintenance funds.",
     "red_flags": ["Sweden is free for everyone"]},
    # ---- Japan ----
    {"country": "JP", "visa_type": "Student", "difficulty": "medium",
     "question": "What documents does the Japanese school or university provide for your COE?",
     "model_answer": "Certificate of Eligibility from JASSO/school, enrollment certificate, financial guarantee.",
     "red_flags": ["I'll apply directly at the embassy without COE"]},
    # ---- Universal ----
    {"country": "GENERAL", "visa_type": "any", "difficulty": "easy",
     "question": "Have you ever overstayed a visa in any country?",
     "model_answer": "Be truthful. Any overstay must be declared and explained with mitigating circumstances.",
     "red_flags": ["No, never overstayed", "It was only a few days"]},
    {"country": "GENERAL", "visa_type": "any", "difficulty": "medium",
     "question": "Have you ever been deported or refused entry to any country?",
     "model_answer": "Be honest. Explain circumstances, what has changed, evidence of rectification.",
     "red_flags": ["No, never had issues"]},
    {"country": "GENERAL", "visa_type": "any", "difficulty": "hard",
     "question": "What is your plan if you are unable to find employment in your destination country?",
     "model_answer": "Show self-sufficiency — savings, family support, return plan, home country employment backup.",
     "red_flags": ["I'll figure it out", "Someone will help me"]},
    {"country": "GENERAL", "visa_type": "any", "difficulty": "easy",
     "question": "What is your highest level of education?",
     "model_answer": "State clearly, with institution name, year, grades, and relevance to current application.",
     "red_flags": ["Just high school education"]},
    {"country": "GENERAL", "visa_type": "any", "difficulty": "medium",
     "question": "Describe your financial situation — who funds your stay?",
     "model_answer": "Name sponsor, their occupation and income, relationship to you, documents to prove it.",
     "red_flags": ["A friend in the destination country", "I'll work to support myself"]},
]


async def seed_questions() -> None:
    """Insert default questions if collection is empty."""
    count = await interview_questions_col.count_documents({})
    if count == 0:
        docs = []
        for i, q in enumerate(SEED_QUESTIONS):
            docs.append({
                "_id": f"q_{i:04d}",
                **q,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            })
        await interview_questions_col.insert_many(docs)
        logger.info("Seeded %d interview questions", len(docs))


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class StartInterviewRequest(BaseModel):
    country: str
    visa_type: str
    difficulty: Optional[str] = None  # "easy" | "medium" | "hard" | None = mixed
    num_questions: int = Field(default=5, ge=1, le=15)


class AnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str = Field(..., min_length=1, max_length=3000)


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

async def _score_answer(question: str, answer: str, model_answer: str, red_flags: List[str]) -> Dict:
    """Score an answer (0–100) using LLM with rule-based fallback."""
    # Rule-based: check red flags first
    answer_lower = answer.lower()
    for flag in red_flags:
        if isinstance(flag, str) and len(flag) > 3 and flag.lower() in answer_lower:
            return {
                "score": 20,
                "feedback": f"Red flag detected in answer. Avoid: '{flag}'",
                "method": "rule-based",
            }

    # LLM scoring
    try:
        from model_router import chat_with_profile
        prompt = f"""Score this visa interview answer on a scale 0-100.

Question: {question}
Model Answer (what a good answer covers): {model_answer}
Candidate's Answer: {answer}

Respond ONLY with valid JSON:
{{"score": <0-100>, "feedback": "<one actionable sentence>", "strengths": ["<s1>"], "improvements": ["<i1>"]}}"""

        result = await chat_with_profile(
            profile_id="balanced",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
        )
        content = result.get("content", result.get("text", ""))
        # Extract JSON
        import re
        m = re.search(r'\{.*\}', content, re.DOTALL)
        if m:
            data = json.loads(m.group())
            data["method"] = "llm"
            return data
    except Exception as exc:
        logger.warning("LLM scoring failed: %s", exc)

    # Fallback: length + keyword heuristic
    words = len(answer.split())
    score = min(70, 30 + words * 2)
    return {
        "score": score,
        "feedback": "Provide more specific details with concrete examples.",
        "method": "heuristic",
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/questions")
async def get_questions(
    country: Optional[str] = None,
    visa_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 20,
):
    query: Dict = {"is_active": True}
    if country:
        query["$or"] = [{"country": country}, {"country": "GENERAL"}]
    if visa_type:
        query["visa_type"] = {"$in": [visa_type, "any"]}
    if difficulty:
        query["difficulty"] = difficulty

    docs = await interview_questions_col.find(
        query, {"embedding": 0}
    ).limit(limit).to_list(length=limit)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return {"questions": docs, "count": len(docs)}


@router.post("/start", status_code=201)
async def start_interview(req: StartInterviewRequest, user=Depends(get_current_user)):
    """Begin a mock interview session — returns session_id + first batch of questions."""
    query: Dict = {"is_active": True, "$or": [{"country": req.country}, {"country": "GENERAL"}]}
    query["visa_type"] = {"$in": [req.visa_type, "any"]}
    if req.difficulty:
        query["difficulty"] = req.difficulty

    questions = await interview_questions_col.find(query).to_list(length=50)
    if not questions:
        raise HTTPException(404, f"No questions found for {req.country}/{req.visa_type}")

    # Sample requested number
    import random
    selected = random.sample(questions, min(req.num_questions, len(questions)))

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await interview_sessions_col.insert_one({
        "_id": session_id,
        "session_id": session_id,
        "user_id": str(user["_id"]),
        "country": req.country,
        "visa_type": req.visa_type,
        "question_ids": [str(q["_id"]) for q in selected],
        "answers": [],
        "scores": [],
        "status": "in_progress",
        "created_at": now,
        "updated_at": now,
    })

    return {
        "session_id": session_id,
        "questions": [
            {"id": str(q["_id"]), "question": q["question"], "difficulty": q["difficulty"]}
            for q in selected
        ],
    }


@router.post("/answer")
async def submit_answer(req: AnswerRequest, user=Depends(get_current_user)):
    """Submit an answer, get immediate AI scoring."""
    session = await interview_sessions_col.find_one({"session_id": req.session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    if session["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Access denied")
    if session["status"] == "completed":
        raise HTTPException(400, "Session already completed")

    question = await interview_questions_col.find_one({"_id": req.question_id})
    if not question:
        raise HTTPException(404, "Question not found")

    scoring = await _score_answer(
        question=question["question"],
        answer=req.answer,
        model_answer=question.get("model_answer", ""),
        red_flags=question.get("red_flags", []),
    )

    now = datetime.now(timezone.utc)
    await interview_sessions_col.update_one(
        {"session_id": req.session_id},
        {
            "$push": {
                "answers": {"question_id": req.question_id, "answer": req.answer, "ts": now},
                "scores": {**scoring, "question_id": req.question_id},
            },
            "$set": {"updated_at": now},
        },
    )

    return {
        "question_id": req.question_id,
        **scoring,
        "model_answer_hint": question.get("model_answer", ""),
    }


@router.post("/finish/{session_id}")
async def finish_interview(session_id: str, user=Depends(get_current_user)):
    """Mark session complete and return full report."""
    session = await interview_sessions_col.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    if session["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Access denied")

    scores = session.get("scores", [])
    avg_score = sum(s.get("score", 0) for s in scores) / len(scores) if scores else 0

    verdict = (
        "Excellent — you're interview ready!" if avg_score >= 80 else
        "Good — polish a few answers and you'll be confident." if avg_score >= 60 else
        "Needs work — focus on specificity and showing strong home ties."
    )

    await interview_sessions_col.update_one(
        {"session_id": session_id},
        {"$set": {"status": "completed", "avg_score": avg_score, "verdict": verdict,
                  "updated_at": datetime.now(timezone.utc)}},
    )

    return {
        "session_id": session_id,
        "avg_score": round(avg_score, 1),
        "verdict": verdict,
        "scores": scores,
        "answers_count": len(session.get("answers", [])),
    }


@router.get("/report/{session_id}")
async def get_report(session_id: str, user=Depends(get_current_user)):
    session = await interview_sessions_col.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    if session["user_id"] != str(user["_id"]):
        raise HTTPException(403, "Access denied")
    session["id"] = str(session.pop("_id", ""))
    return session
