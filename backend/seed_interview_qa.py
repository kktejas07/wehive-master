"""Seed 20 visa interview Q&A entries across USA, UK, Canada, Australia."""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

QS = [
    {"country": "USA", "q": "Why did you choose this university?", "a": "Research fit, faculty expertise, and program ranking."},
    {"country": "USA", "q": "What are your post-graduation plans?", "a": "OPT/STEM OPT then H-1B sponsorship."},
    {"country": "USA", "q": "How will you fund your studies?", "a": "Savings, scholarship, and sponsor letter."},
    {"country": "USA", "q": "Have you applied to other countries?", "a": "USA is first choice due to research opportunities."},
    {"country": "USA", "q": "Do you have ties to India?", "a": "Family, property, and intent to return."},
    {"country": "UK", "q": "Why the UK over the USA?", "a": "1-year MS, lower cost, PSW visa pathway."},
    {"country": "UK", "q": "What is the Graduate Route visa?", "a": "2-year post-study work (3 for PhD)."},
    {"country": "UK", "q": "How did you choose your course?", "a": "Career goals and UK industry demand."},
    {"country": "UK", "q": "What is your IELTS score?", "a": "State score and confirm CAS requirement met."},
    {"country": "UK", "q": "Where will you stay?", "a": "University accommodation or confirmed rental."},
    {"country": "Canada", "q": "Why Canada?", "a": "PGWP, PR pathway, multicultural environment."},
    {"country": "Canada", "q": "What is a PGWP?", "a": "Post-Graduation Work Permit up to 3 years."},
    {"country": "Canada", "q": "Do you plan to immigrate?", "a": "Open to Express Entry after work experience."},
    {"country": "Canada", "q": "How will you support yourself?", "a": "GIC + tuition paid, part-time work allowed."},
    {"country": "Canada", "q": "Do you have relatives in Canada?", "a": "Ties don't disqualify — be honest."},
    {"country": "Australia", "q": "Why Australia?", "a": "Work rights, 485 visa, Indian community."},
    {"country": "Australia", "q": "What is the Subclass 485?", "a": "Temporary Graduate visa 2-4 years."},
    {"country": "Australia", "q": "What is your course duration?", "a": "CRICOS-registered course length."},
    {"country": "Australia", "q": "Do you have OSHC?", "a": "Yes, OSHC is mandatory — state provider."},
    {"country": "Australia", "q": "Genuine Temporary Entrant intentions?", "a": "Study purpose, ties to home country."},
]


async def seed():
    c = AsyncIOMotorClient(os.environ["MONGO_URI"])
    d = c.wehive
    await d.interview_qa.delete_many({})
    await d.interview_qa.insert_many(QS)
    print(f"Seeded {len(QS)} interview Q&A entries")
    c.close()


if __name__ == "__main__":
    asyncio.run(seed())
