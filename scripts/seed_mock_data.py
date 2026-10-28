#!/usr/bin/env python3
"""
Seed 200+ mock users, applications, agents and leads into WeHive.

Usage (run from the backend directory on the server, with env vars loaded):
    cd /home/claude/kktejas07/wehive-master/backend
    python ../scripts/seed_mock_data.py

Or set MONGO_URL and DB_NAME env vars directly:
    MONGO_URL="mongodb://..." DB_NAME="wehive" python scripts/seed_mock_data.py

Leads are also POSTed to the live API endpoint so they appear in the admin Leads tab.
Set API_BASE to override (default: https://wehive.co.in/api).
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import random
import sys
import uuid
from datetime import datetime, timedelta
from typing import Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# ── config ──────────────────────────────────────────────────────────────────
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.environ.get("DB_NAME", "wehive")
API_BASE  = os.environ.get("API_BASE", "https://wehive.co.in/api")

# ── mock data pools ─────────────────────────────────────────────────────────
FIRST_NAMES = [
    # Telugu
    "Arjun", "Kiran", "Ravi", "Sai", "Venkat", "Charan", "Harish", "Pavan",
    "Naveen", "Suresh", "Ramesh", "Lokesh", "Srikanth", "Mahesh", "Ganesh",
    "Priya", "Divya", "Lakshmi", "Swathi", "Bhavana", "Keerthi", "Mounika",
    "Sravani", "Anusha", "Sahithi",
    # Tamil
    "Arun", "Kumar", "Vijay", "Surya", "Karthik", "Deepak", "Praveen",
    "Balaji", "Senthil", "Murugan", "Prithvi", "Ashwin", "Manoj",
    "Kavya", "Nithya", "Aishwarya", "Meenakshi", "Sangeetha",
    # Hindi / North Indian
    "Rahul", "Amit", "Rohit", "Akash", "Vikas", "Ankit", "Nikhil",
    "Shubham", "Pranav", "Yash", "Ayush", "Gaurav", "Varun",
    "Pooja", "Priyanka", "Neha", "Riya", "Sneha", "Anjali",
    # Marathi
    "Omkar", "Prasad", "Sachin", "Vishal", "Ajinkya", "Pratik",
    "Gauri", "Rutuja", "Pallavi",
    # Bengali
    "Debabrata", "Sourav", "Arnab", "Sayan", "Sudip", "Koushik",
    "Shreyasi", "Moumita", "Debarati",
]

LAST_NAMES = [
    "Reddy", "Rao", "Kumar", "Sharma", "Patel", "Singh", "Nair", "Iyer",
    "Pillai", "Verma", "Gupta", "Mishra", "Joshi", "Mehta", "Shah",
    "Mukherjee", "Chatterjee", "Banerjee", "Das", "Roy",
    "Kulkarni", "Desai", "Patil", "More", "Jadhav",
    "Naidu", "Chowdary", "Varma", "Goud", "Raju",
    "Krishnan", "Subramaniam", "Murthy", "Balakrishnan",
]

CITIES = [
    "Hyderabad", "Mumbai", "Delhi", "Bangalore", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Visakhapatnam", "Coimbatore", "Nagpur", "Indore", "Bhopal",
]

EDUCATION_LEVELS = ["12th pass", "Bachelor's", "Master's", "PhD", "Diploma"]
EDUCATION_FIELDS = [
    "Computer Science", "Mechanical Engineering", "Civil Engineering",
    "Business Administration", "Biotechnology", "Medicine", "Law",
    "Economics", "Psychology", "Architecture",
]

TARGET_COUNTRIES = ["USA", "UK", "Canada", "Australia", "Germany", "France", "UAE", "Singapore"]
COUNTRY_CODES    = ["us", "gb", "ca", "au", "de", "fr", "ae", "sg"]

PURPOSES   = ["Study", "Work", "Tourist", "Business"]
VISA_TYPES = ["Student", "Work", "Tourist", "Business", "Dependent"]

APP_STATUSES = ["draft", "submitted", "under_review", "docs_requested", "approved", "rejected"]

STAFF_ROLES = ["consultant", "document_checker", "visa_officer"]

UNIVERSITIES = [
    ("MIT", "us"), ("Stanford University", "us"), ("Harvard University", "us"),
    ("University of Toronto", "ca"), ("McGill University", "ca"),
    ("University of Melbourne", "au"), ("University of Sydney", "au"),
    ("Imperial College London", "gb"), ("University of Edinburgh", "gb"),
    ("TU Munich", "de"), ("RWTH Aachen", "de"),
    ("NUS Singapore", "sg"), ("NTU Singapore", "sg"),
    ("Sorbonne University", "fr"), ("Sciences Po", "fr"),
    ("University of Dubai", "ae"),
]


# ── helpers ──────────────────────────────────────────────────────────────────
def _hash_password(plain: str) -> str:
    """Simple sha256 hash — matches verify_password in admin_auth.py (bcrypt).
    For seed purposes we use bcrypt if available, else fall back to sha256."""
    try:
        import bcrypt
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
    except ImportError:
        return hashlib.sha256(plain.encode()).hexdigest()


def _rand_date(days_back: int = 365) -> datetime:
    return datetime.utcnow() - timedelta(days=random.randint(0, days_back))


def _rand_phone() -> str:
    return f"+91{random.randint(7000000000, 9999999999)}"


def _rand_name() -> tuple[str, str, str]:
    first = random.choice(FIRST_NAMES)
    last  = random.choice(LAST_NAMES)
    return first, last, f"{first} {last}"


def _make_user(index: int, is_agent: bool = False) -> dict:
    first, last, name = _rand_name()
    city    = random.choice(CITIES)
    country = random.choice(TARGET_COUNTRIES)
    edu     = random.choice(EDUCATION_LEVELS)
    field   = random.choice(EDUCATION_FIELDS)
    purpose = random.choice(PURPOSES)
    age     = random.randint(18, 35)

    tag  = "agent" if is_agent else "user"
    idx  = str(index).zfill(4)
    email = f"wehive.seed.{tag}.{idx}@mailinator.com"

    now = _rand_date(180)
    return {
        "_id": str(uuid.uuid4()),
        "email": email,
        "name": name,
        "phone": _rand_phone(),
        "password_hash": _hash_password("Seed@1234"),
        "city": city,
        "age": age,
        "education_level": edu,
        "education_field": field,
        "target_country": country,
        "purpose": purpose,
        "is_premium": random.random() < 0.15,
        "is_staff": is_agent,
        "staff_role": random.choice(STAFF_ROLES) if is_agent else None,
        "email_verified": True,
        "phone_verified": random.random() < 0.6,
        "is_seed": True,
        "created_at": now,
        "updated_at": now,
    }


def _make_application(user: dict, agent_id: Optional[str] = None) -> dict:
    country_idx = random.randint(0, len(TARGET_COUNTRIES) - 1)
    country     = TARGET_COUNTRIES[country_idx]
    country_code = COUNTRY_CODES[country_idx]
    visa_type   = random.choice(VISA_TYPES)
    status      = random.choice(APP_STATUSES)
    purpose     = random.choice(PURPOSES)
    uni, uni_country = random.choice(UNIVERSITIES)

    created = _rand_date(300)
    docs: list[dict] = []
    if random.random() < 0.7:
        for doc_name in random.sample(
            ["passport", "bank_statement", "offer_letter", "transcripts", "ielts_score"],
            k=random.randint(1, 4)
        ):
            docs.append({
                "id": str(uuid.uuid4()),
                "name": doc_name.replace("_", " ").title(),
                "url": f"https://storage.googleapis.com/wehive-mock/{doc_name}_{uuid.uuid4().hex[:8]}.pdf",
                "status": random.choice(["pending", "verified", "rejected"]),
                "uploaded_at": created + timedelta(days=random.randint(1, 10)),
            })

    payment = None
    if status in ("submitted", "under_review", "approved") and random.random() < 0.6:
        payment = {
            "id": str(uuid.uuid4()),
            "amount": random.choice([4999, 9999, 14999, 19999]),
            "currency": "INR",
            "status": "captured",
            "provider": "razorpay",
            "paid_at": created + timedelta(days=random.randint(0, 3)),
        }

    return {
        "_id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "agent_id": agent_id,
        "type": "university",
        "applicant_name": user["name"],
        "country": country,
        "country_code": country_code,
        "visa_type": visa_type,
        "purpose": purpose,
        "status": status,
        "university_name": uni,
        "university_country": uni_country,
        "university_selections": [{
            "university_id": f"seed-{uni.lower().replace(' ', '-')}",
            "university": {"name": uni, "country": uni_country},
            "status": status,
            "applied_at": created + timedelta(days=2) if status != "draft" else None,
        }],
        "documents": docs,
        "payment": payment,
        "is_seed": True,
        "created_at": created,
        "updated_at": created + timedelta(days=random.randint(0, 30)),
    }


def _make_lead(index: int) -> dict:
    first, last, name = _rand_name()
    country = random.choice(TARGET_COUNTRIES)
    purpose = random.choice(["study", "work", "tourist", "business"])
    return {
        "name": name,
        "email": f"lead.seed.{index:03d}@mailinator.com",
        "phone": _rand_phone(),
        "destination": country,
        "purpose": purpose,
        "consent": True,
        "message": f"Interested in {purpose} visa for {country}. Please contact me.",
        "source": "seed",
        "travellers": random.randint(1, 3),
    }


# ── main ─────────────────────────────────────────────────────────────────────
async def main() -> None:
    import certifi
    tls_kwargs: dict = {}
    if "mongodb+srv://" in MONGO_URL or "tls=true" in MONGO_URL.lower():
        tls_kwargs["tlsCAFile"] = certifi.where()

    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=8000, **tls_kwargs)
    db     = client[DB_NAME]
    users_col = db["users"]
    apps_col  = db["applications"]
    leads_col = db["leads"]

    print("── WeHive mock data seeder ──────────────────────────────")
    print(f"  Mongo : {MONGO_URL[:40]}…")
    print(f"  DB    : {DB_NAME}")
    print(f"  API   : {API_BASE}")
    print()

    # ── 1. Agents (10) ───────────────────────────────────────────────────────
    print("Creating 10 agent users …")
    agents: list[dict] = []
    for i in range(10):
        doc = _make_user(i + 1, is_agent=True)
        try:
            await users_col.replace_one({"email": doc["email"]}, doc, upsert=True)
            agents.append(doc)
        except Exception as e:
            print(f"  [skip] agent {i+1}: {e}")
    print(f"  ✓ {len(agents)} agents ready")

    # ── 2. Regular users (200) ───────────────────────────────────────────────
    print("Creating 200 regular users …")
    regular_users: list[dict] = []
    for i in range(200):
        doc = _make_user(i + 1, is_agent=False)
        try:
            await users_col.replace_one({"email": doc["email"]}, doc, upsert=True)
            regular_users.append(doc)
        except Exception as e:
            print(f"  [skip] user {i+1}: {e}")
        if (i + 1) % 50 == 0:
            print(f"  … {i+1}/200 users")
    print(f"  ✓ {len(regular_users)} users ready")

    # ── 3. Applications (1-4 per regular user, 5-20 per agent) ──────────────
    print("Creating applications …")
    total_apps = 0
    agent_ids = [a["_id"] for a in agents]

    # Applications for regular users
    for u in regular_users:
        n = random.randint(1, 4)
        agent_id = random.choice(agent_ids) if agent_ids else None
        for _ in range(n):
            app = _make_application(u, agent_id=agent_id)
            try:
                await apps_col.replace_one({"_id": app["_id"]}, app, upsert=True)
                total_apps += 1
            except Exception as e:
                print(f"  [skip] app: {e}")

    # Applications for agents (5-20 each)
    for agent in agents:
        n = random.randint(5, 20)
        for _ in range(n):
            app = _make_application(agent, agent_id=agent["_id"])
            app["is_agent_own"] = True
            try:
                await apps_col.replace_one({"_id": app["_id"]}, app, upsert=True)
                total_apps += 1
            except Exception as e:
                print(f"  [skip] agent-app: {e}")

    print(f"  ✓ {total_apps} applications inserted")

    # ── 4. Leads via API (50) ────────────────────────────────────────────────
    print("Posting 50 leads via API …")
    ok_leads = 0
    async with httpx.AsyncClient(timeout=15, verify=True) as http:
        for i in range(50):
            payload = _make_lead(i + 1)
            try:
                r = await http.post(f"{API_BASE}/leads/enquiry", json=payload)
                if r.status_code in (200, 201):
                    ok_leads += 1
                else:
                    # Fall back: insert directly into mongo
                    payload["_id"] = str(uuid.uuid4())
                    payload["type"] = "enquiry"
                    payload["status"] = "new"
                    payload["is_seed"] = True
                    payload["created_at"] = _rand_date(90)
                    await leads_col.replace_one(
                        {"email": payload["email"]}, payload, upsert=True
                    )
                    ok_leads += 1
            except Exception as e:
                print(f"  [lead {i+1}] fallback to mongo: {e}")
                try:
                    payload["_id"] = str(uuid.uuid4())
                    payload["type"] = "enquiry"
                    payload["status"] = "new"
                    payload["is_seed"] = True
                    payload["created_at"] = _rand_date(90)
                    await leads_col.replace_one(
                        {"email": payload["email"]}, payload, upsert=True
                    )
                    ok_leads += 1
                except Exception:
                    pass

            if (i + 1) % 10 == 0:
                print(f"  … {i+1}/50 leads")

    print(f"  ✓ {ok_leads} leads created")

    # ── summary ──────────────────────────────────────────────────────────────
    print()
    print("── Summary ─────────────────────────────────────────────")
    print(f"  Agents       : {len(agents)}")
    print(f"  Users        : {len(regular_users)}")
    print(f"  Applications : {total_apps}")
    print(f"  Leads        : {ok_leads}")
    print()
    print("  All seed documents tagged with  is_seed: true")
    print("  User passwords                  Seed@1234")
    print()
    print("  To clean up seed data:")
    print('    db.users.deleteMany({ is_seed: true })')
    print('    db.applications.deleteMany({ is_seed: true })')
    print('    db.leads.deleteMany({ is_seed: true })')
    print("────────────────────────────────────────────────────────")

    client.close()


if __name__ == "__main__":
    # Allow running from the scripts/ dir or the backend/ dir
    backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
    if os.path.isdir(backend_dir):
        sys.path.insert(0, os.path.abspath(backend_dir))
    asyncio.run(main())
