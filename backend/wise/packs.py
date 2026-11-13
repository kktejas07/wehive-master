"""Wise Predefined Packs — curated conversation bundles seeded at startup."""
from __future__ import annotations

SEED_PACKS = [
    {
        "id": "us_student_visa",
        "name": "US Student Visa (F-1)",
        "description": "Everything you need for your F-1 visa application and interview",
        "countries": ["US"],
        "visa_types": ["F-1", "student"],
        "system_prompt": (
            "You are Wise, specializing in US F-1 student visas. "
            "Cover DS-160, SEVIS fee, I-20, financial proof, visa interview tips, "
            "OPT/CPT rules, and maintaining status. Be concise and practical."
        ),
        "seed_questions": [
            "What documents do I need for my F-1 visa interview?",
            "How much bank balance is required for a US student visa?",
            "What are the most common F-1 visa rejection reasons?",
            "How do I explain my study gap during the visa interview?",
            "What is SEVIS and how do I pay the fee?",
        ],
        "emoji": "🎓",
        "is_active": True,
    },
    {
        "id": "uk_student_visa",
        "name": "UK Student Visa (Tier 4)",
        "description": "CAS, biometrics, IHS surcharge, and life in the UK",
        "countries": ["GB"],
        "visa_types": ["Student", "Tier 4"],
        "system_prompt": (
            "You are Wise, specializing in UK Student visas (formerly Tier 4). "
            "Cover CAS, ATAS, IHS surcharge, biometric residence permit, "
            "IELTS/language requirements, and graduate route."
        ),
        "seed_questions": [
            "What is a CAS and when does my university send it?",
            "How much is the Immigration Health Surcharge?",
            "Can I work while on a UK student visa?",
            "What bank statement do I need for a UK student visa?",
            "What is the Graduate Route visa?",
        ],
        "emoji": "🏛️",
        "is_active": True,
    },
    {
        "id": "canada_study_permit",
        "name": "Canada Study Permit",
        "description": "SDS, GIC, and everything for studying in Canada",
        "countries": ["CA"],
        "visa_types": ["Study Permit"],
        "system_prompt": (
            "You are Wise, specializing in Canadian study permits. "
            "Cover SDS program, GIC requirement, LOA, biometrics, PAL, "
            "co-op work permits, and PGWP."
        ),
        "seed_questions": [
            "What is the SDS program and am I eligible?",
            "What is a GIC and which banks offer it?",
            "How long does a Canadian study permit take to process?",
            "Can I apply for PR after my Canadian degree?",
            "What is the Post-Graduation Work Permit?",
        ],
        "emoji": "🍁",
        "is_active": True,
    },
    {
        "id": "australia_student_visa",
        "name": "Australia Student Visa (Subclass 500)",
        "description": "GTE, CoE, OSHC, and work rights in Australia",
        "countries": ["AU"],
        "visa_types": ["500", "Student"],
        "system_prompt": (
            "You are Wise, specializing in Australian Subclass 500 student visas. "
            "Cover CoE, GTE statement, OSHC, genuine temporary entrant test, "
            "work limitations, and post-study work stream."
        ),
        "seed_questions": [
            "What is the Genuine Temporary Entrant (GTE) requirement?",
            "How do I write a strong GTE statement?",
            "What is OSHC and which providers are accepted?",
            "Can I work 48 hours per fortnight on a student visa?",
            "What is the Post-Study Work stream visa?",
        ],
        "emoji": "🦘",
        "is_active": True,
    },
    {
        "id": "schengen_visa",
        "name": "Schengen Visa",
        "description": "Short-stay Schengen visa for Europe travel and study",
        "countries": ["DE", "FR", "NL", "SE", "AT", "CH", "IT", "ES"],
        "visa_types": ["Schengen", "C-visa", "short-stay"],
        "system_prompt": (
            "You are Wise, specializing in Schengen short-stay visas. "
            "Cover which consulate to apply at, required documents, travel insurance, "
            "bank statements, refusal appeal, and national D visas for study."
        ),
        "seed_questions": [
            "Which Schengen country consulate should I apply to?",
            "What travel insurance is required for a Schengen visa?",
            "How much bank balance do I need for a Schengen visa?",
            "My Schengen visa was refused — what do I do?",
            "What is the difference between a Schengen C visa and a national D visa?",
        ],
        "emoji": "🇪🇺",
        "is_active": True,
    },
    {
        "id": "interview_prep",
        "name": "Visa Interview Prep",
        "description": "Practice common visa interview questions with AI coaching",
        "countries": [],
        "visa_types": [],
        "system_prompt": (
            "You are Wise, acting as a visa interview coach. "
            "Ask tough questions consular officers ask, evaluate the user's answers "
            "on clarity, specificity, and confidence, and give concrete improvement tips. "
            "Be direct — good prep means facing hard questions."
        ),
        "seed_questions": [
            "Start a mock F-1 visa interview",
            "Ask me the hardest visa interview questions",
            "What are red flag answers that lead to rejection?",
            "How do I explain I have no immediate family in my home country?",
            "Practice: explain your funding sources for your US degree",
        ],
        "emoji": "🎤",
        "is_active": True,
    },
]


async def seed_packs() -> None:
    """Insert default packs if the collection is empty."""
    from db import wise_packs_col
    count = await wise_packs_col.count_documents({})
    if count == 0:
        await wise_packs_col.insert_many(SEED_PACKS)
