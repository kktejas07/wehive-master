"""Seed exam_prep MongoDB collection so /api/exam-prep/list returns live data."""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

EXAMS = [
    {"name": "TOEFL iBT", "score": "0-120", "fee": "$235 USD", "validity": "2 years",
     "link": "https://www.ets.org/toefl/register/",
     "minScores": "USA 80+ | UK 72+ | Canada 86+ | Australia 79+",
     "description": "Accepted by 12,000+ universities in 160+ countries."},
    {"name": "IELTS Academic", "score": "0-9 Bands", "fee": "INR 17,000", "validity": "2 years",
     "link": "https://www.ielts.org/book-a-test",
     "minScores": "UK 6.0+ | Canada 6.5+ | Australia 6.5+",
     "description": "Offered by British Council, IDP & Cambridge."},
    {"name": "GRE General", "score": "260-340", "fee": "$228 USD", "validity": "5 years",
     "link": "https://www.ets.org/gre/test-takers/general-test/register/",
     "minScores": "Top US MS: V 155+ | Q 162+ | AWA 4.0+",
     "description": "Required for most US & Canada MS/PhD programs."},
    {"name": "GMAT Focus", "score": "205-805", "fee": "$275 USD", "validity": "5 years",
     "link": "https://www.mba.com/exams/gmat-focus-edition",
     "minScores": "Top MBA: 650+ | 700+ competitive",
     "description": "New GMAT Focus Edition. 3 sections, 2h15m."},
    {"name": "PTE Academic", "score": "10-90", "fee": "$185 USD", "validity": "2 years",
     "link": "https://www.pearsonpte.com",
     "minScores": "Australia 58+ | UK 59+ | Canada 60+",
     "description": "AI-scored English test with results in 48 hours."},
    {"name": "Duolingo English Test", "score": "10-160", "fee": "$59 USD", "validity": "2 years",
     "link": "https://englishtest.duolingo.com",
     "minScores": "USA 105+ | Canada 110+ | UK varies",
     "description": "Affordable online test accepted by 4,000+ programs."},
    {"name": "SAT", "score": "400-1600", "fee": "$60 USD", "validity": "5 years",
     "link": "https://satsuite.collegeboard.org/sat",
     "minScores": "Top US universities: 1400+ competitive",
     "description": "Standard undergraduate admissions test for US universities."},
    {"name": "ACT", "score": "1-36", "fee": "$63 USD", "validity": "5 years",
     "link": "https://www.act.org",
     "minScores": "Top US colleges: 30+ competitive",
     "description": "Alternative to SAT, widely accepted by US colleges."},
]


async def seed():
    c = AsyncIOMotorClient(os.environ["MONGO_URI"])
    d = c.wehive
    await d.exam_prep.delete_many({})
    await d.exam_prep.insert_many(EXAMS)
    print(f"Seeded {len(EXAMS)} exam prep entries")
    c.close()


if __name__ == "__main__":
    asyncio.run(seed())
