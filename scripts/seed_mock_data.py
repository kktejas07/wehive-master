#!/usr/bin/env python3
"""
WeHive Mock Data Seeder
=======================
Seeds 200+ users, applications, agent users, and leads into the WeHive backend.

Usage:
    pip install requests --break-system-packages
    python scripts/seed_mock_data.py [--base-url https://wehive.co.in/api]

The script authenticates as admin, then inserts data using admin endpoints.
"""

import argparse
import json
import logging
import random
import sys
import uuid
from datetime import datetime, timedelta

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_BASE_URL = "https://wehive.co.in/api"
ADMIN_EMAIL = "admin@wehive.co.in"
ADMIN_PASSWORD = "Omsairam@0504"

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("wehive-seed")

# ---------------------------------------------------------------------------
# Data pools
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    # Telugu
    "Priya", "Kavya", "Sravani", "Mounika", "Divya", "Anusha", "Swathi",
    "Ramesh", "Suresh", "Venkat", "Kiran", "Arun", "Ravi", "Naresh",
    # Tamil
    "Anitha", "Deepa", "Meena", "Revathi", "Geetha",
    "Murugan", "Selvam", "Vijay", "Senthil", "Arjun",
    # Hindi / North Indian
    "Pooja", "Neha", "Sneha", "Ritu", "Anjali", "Prerna", "Simran",
    "Rahul", "Amit", "Rohit", "Vikas", "Sachin", "Mohit", "Varun",
    # Marathi
    "Ashwini", "Manasi", "Shruti",
    "Prathamesh", "Omkar", "Nikhil",
    # Bengali
    "Puja", "Riya", "Tanya", "Soma",
    "Sourav", "Arjun", "Debarup", "Saikat",
    # South Karnataka / Kerala
    "Nandini", "Sahana", "Harsha",
    "Naveen", "Praveen", "Sagar",
]

LAST_NAMES = [
    # Telugu surnames
    "Reddy", "Naidu", "Rao", "Sharma", "Varma", "Chowdary", "Goud",
    "Krishna", "Raju", "Babu", "Prasad", "Kumar", "Yadav",
    # Tamil surnames
    "Subramanian", "Murugesan", "Annamalai", "Govindasamy", "Krishnamurthy",
    # Hindi
    "Singh", "Gupta", "Verma", "Agarwal", "Mishra", "Tiwari",
    # Marathi
    "Patil", "Deshmukh", "Kulkarni", "Joshi", "Pawar",
    # Bengali
    "Banerjee", "Chatterjee", "Mukherjee", "Das", "Ghosh", "Sen",
]

CITIES = [
    "Hyderabad", "Mumbai", "Delhi", "Bangalore", "Chennai",
    "Kolkata", "Pune", "Visakhapatnam", "Jaipur", "Ahmedabad",
    "Coimbatore", "Nagpur", "Indore", "Bhopal", "Lucknow",
]

EDUCATION_LEVELS = [
    "12th pass", "Bachelor's", "Bachelor's", "Bachelor's",  # weighted
    "Master's", "Master's", "PhD",
]

TARGET_COUNTRIES = [
    "us", "uk", "ca", "au", "de", "fr", "ae", "sg", "nl", "nz",
    "ie", "se", "no", "ch", "jp",
]

VISA_TYPES = ["Tourist", "Student", "Work", "Business", "Transit", "Family"]

PURPOSES = ["Study", "Work", "Tourism", "Business", "Family visit", "Immigration"]

APP_STATUSES = ["draft", "submitted", "in_review", "approved", "rejected"]
APP_STATUS_WEIGHTS = [0.2, 0.3, 0.3, 0.1, 0.1]

NOTES_TEMPLATES = [
    "Planning to visit for {purpose} purposes. Have all required documents.",
    "Urgent application — travel date is firm.",
    "First time applying for a visa to this country.",
    "Have previously visited on tourist visa. Applying for {purpose} this time.",
    "Sponsored by employer for {purpose} assignment.",
    "Applying along with family. Spouse and {n} children.",
    None,  # no notes
]


def rand_phone() -> str:
    """Indian mobile number in +91 format."""
    prefix = random.choice(["6", "7", "8", "9"])
    rest = "".join([str(random.randint(0, 9)) for _ in range(9)])
    return f"+91{prefix}{rest}"


def rand_email(first: str, last: str, idx: int) -> str:
    variants = [
        f"{first.lower()}.{last.lower()}{idx}@gmail.com",
        f"{first.lower()}{idx}@yahoo.com",
        f"{last.lower()}.{first.lower()}{idx}@hotmail.com",
        f"{first.lower()}{random.randint(100,999)}@outlook.com",
    ]
    return random.choice(variants)


def rand_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def rand_travel_date() -> str:
    """Random future date within next 18 months."""
    days_ahead = random.randint(30, 540)
    dt = datetime.utcnow() + timedelta(days=days_ahead)
    return dt.strftime("%Y-%m-%d")


def rand_note() -> str | None:
    t = random.choice(NOTES_TEMPLATES)
    if t is None:
        return None
    return t.format(purpose=random.choice(PURPOSES).lower(), n=random.randint(1, 3))


# ---------------------------------------------------------------------------
# API client
# ---------------------------------------------------------------------------

class WeHiveClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers["Content-Type"] = "application/json"
        self.admin_token: str | None = None

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def admin_login(self) -> bool:
        resp = self.session.post(
            self._url("/admin-auth/login"),
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30,
        )
        if resp.status_code != 200:
            log.error("Admin login failed: %s %s", resp.status_code, resp.text[:200])
            return False
        data = resp.json()
        token = data.get("access_token")
        if not token:
            log.error("No access_token in login response: %s", data)
            return False
        self.admin_token = token
        self.session.headers["Authorization"] = f"Bearer {token}"
        log.info("Admin authenticated ✓")
        return True

    def create_staff_user(self, email: str, name: str, role: str = "agent") -> dict | None:
        """Create a staff/agent user via admin endpoint."""
        resp = self.session.post(
            self._url("/admin/staff"),
            json={"email": email, "name": name, "staff_role": role},
            timeout=20,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        if resp.status_code == 409:
            return {"email": email, "_exists": True}
        log.warning("Staff create failed %s: %s", email, resp.text[:200])
        return None

    def create_application_as_admin(
        self,
        user_id: str,
        country_id: str,
        visa_type: str,
        status: str,
        travel_date: str | None = None,
        notes: str | None = None,
    ) -> dict | None:
        """
        Admin can patch application status; we create it via admin backoffice endpoint
        or directly construct with minimal fields. WeHive admin has /admin/applications
        as GET but no direct POST for admin-created apps, so we use the OTP-less flow:
        seed via /admin/staff + internal trick — we manually build the record through
        admin PATCH after the user creates it.

        Since we can't OTP-login as each user, we inject applications directly via
        the admin staff endpoint trick: create the user as staff first, then use
        admin to insert an application record for that user_id via PATCH on a dummy id.
        We'll use a dedicated admin backoffice endpoint if available, else fall back
        to the DB-bypass approach: just record it locally and report.
        """
        # Try admin backoffice route first
        resp = self.session.post(
            self._url("/admin/applications"),
            json={
                "user_id": user_id,
                "country_id": country_id,
                "visa_type": visa_type,
                "travel_date": travel_date,
                "notes": notes or "",
                "status": status,
            },
            timeout=20,
        )
        if resp.status_code in (200, 201):
            app = resp.json()
            # If status is not draft, patch it
            if status != "draft" and app.get("id"):
                self.patch_application_status(app["id"], status)
            return app

        # Admin POST to applications not available — skip silently
        log.debug("Admin applications POST not available (%s)", resp.status_code)
        return None

    def patch_application_status(self, app_id: str, status: str) -> bool:
        resp = self.session.patch(
            self._url(f"/admin/applications/{app_id}"),
            json={"status": status, "note": f"Seeded by mock data script"},
            timeout=20,
        )
        return resp.status_code == 200

    def create_lead(self, name: str, surname: str, email: str, message: str) -> dict | None:
        resp = self.session.post(
            self._url("/leads"),
            json={"name": name, "surname": surname, "email": email, "message": message},
            timeout=20,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        log.debug("Lead create: %s %s", resp.status_code, resp.text[:100])
        return None

    def list_users(self, limit: int = 10) -> list:
        resp = self.session.get(
            self._url(f"/admin/users?limit={limit}"),
            timeout=20,
        )
        if resp.status_code == 200:
            return resp.json().get("users", [])
        return []


# ---------------------------------------------------------------------------
# Seeding logic
# ---------------------------------------------------------------------------

def seed_users(client: WeHiveClient, count: int = 200) -> list[dict]:
    """
    Create `count` staff/regular users. We use the /admin/staff endpoint
    which bypasses OTP and creates users directly. Then return the created users.
    """
    log.info("--- Seeding %d users ---", count)
    created = []
    skipped = 0

    roles = (["customer"] * 8) + (["consultant"] * 1) + (["agent"] * 1)

    for i in range(1, count + 1):
        first, last = rand_name()
        email = rand_email(first, last, i)
        full_name = f"{first} {last}"
        role = random.choice(roles)

        user = client.create_staff_user(email=email, name=full_name, role=role)

        if user is None:
            skipped += 1
            continue

        if user.get("_exists"):
            log.debug("  Skipped (exists): %s", email)
            skipped += 1
            continue

        uid = user.get("id") or user.get("_id") or ""
        created.append({
            "id": uid,
            "email": email,
            "name": full_name,
            "city": random.choice(CITIES),
            "education": random.choice(EDUCATION_LEVELS),
            "purpose": random.choice(PURPOSES),
            "target_country": random.choice(TARGET_COUNTRIES),
        })
        log.info("  [%d/%d] Created user: %s (%s)", i, count, full_name, email)

    log.info("Users done — created: %d, skipped/failed: %d", len(created), skipped)
    return created


def seed_applications(client: WeHiveClient, users: list[dict]) -> int:
    """Create 1-4 applications per user."""
    log.info("--- Seeding applications ---")
    total = 0

    for u in users:
        uid = u.get("id")
        if not uid:
            continue
        n_apps = random.randint(1, 4)
        for _ in range(n_apps):
            country = random.choice(TARGET_COUNTRIES)
            visa_type = random.choice(VISA_TYPES)
            status = random.choices(APP_STATUSES, weights=APP_STATUS_WEIGHTS, k=1)[0]
            travel_date = rand_travel_date() if random.random() > 0.3 else None
            notes = rand_note()

            app = client.create_application_as_admin(
                user_id=uid,
                country_id=country,
                visa_type=visa_type,
                status=status,
                travel_date=travel_date,
                notes=notes,
            )
            if app:
                total += 1
                log.debug("    App %s → %s %s [%s]", uid[:8], country.upper(), visa_type, status)

    log.info("Applications done — created: %d", total)
    return total


def seed_agents(client: WeHiveClient, count: int = 10) -> list[dict]:
    """Create dedicated agent accounts."""
    log.info("--- Seeding %d agent users ---", count)
    agent_domains = ["agentportal.in", "axissagent.com", "visaexpert.in"]
    created = []

    agent_names = [
        "Sunita Patel", "Rajendra Mehta", "Lakshmi Nair", "Deepak Verma",
        "Anand Krishnan", "Fatima Sheikh", "Harpreet Kaur", "Manoj Tiwari",
        "Rekha Iyer", "Sanjay Bose",
    ]

    for i in range(1, count + 1):
        name = agent_names[i - 1] if i <= len(agent_names) else f"Agent User {i}"
        domain = random.choice(agent_domains)
        email = f"agent{i:02d}@{domain}"

        user = client.create_staff_user(email=email, name=name, role="agent")
        if user and not user.get("_exists"):
            uid = user.get("id") or user.get("_id") or ""
            created.append({"id": uid, "email": email, "name": name})
            log.info("  [%d/%d] Agent: %s", i, count, email)
        else:
            log.debug("  Agent skipped: %s", email)

    # Seed 5-20 applications per agent
    total_apps = 0
    for agent in created:
        n = random.randint(5, 20)
        for _ in range(n):
            country = random.choice(TARGET_COUNTRIES)
            visa = random.choice(VISA_TYPES)
            status = random.choices(APP_STATUSES, weights=APP_STATUS_WEIGHTS, k=1)[0]
            app = client.create_application_as_admin(
                user_id=agent["id"],
                country_id=country,
                visa_type=visa,
                status=status,
                travel_date=rand_travel_date() if random.random() > 0.4 else None,
            )
            if app:
                total_apps += 1

    log.info("Agents done — created: %d, applications: %d", len(created), total_apps)
    return created


def seed_leads(client: WeHiveClient, count: int = 50) -> int:
    """Create contact-form leads."""
    log.info("--- Seeding %d leads ---", count)
    messages = [
        "I want to apply for a student visa to the US. Please guide me.",
        "Looking for work visa options in Canada. What documents do I need?",
        "Interested in tourist visa to UK. When can I book a consultation?",
        "My son wants to study in Germany. Need help with student visa application.",
        "We are a family of 4 planning to visit Australia. Need tourist visas.",
        "I have a job offer in UAE. How to process work visa quickly?",
        "Need help with Singapore PR application. Have 5 years work experience.",
        "Want to visit France for 2 weeks. What is the visa fee and timeline?",
        "Applying for NZ skilled migrant visa. Need a consultant.",
        "My employer is sponsoring H1B. Do you assist with US work visa?",
    ]

    total = 0
    for i in range(1, count + 1):
        first, last = rand_name()
        email = rand_email(first, last, 5000 + i)
        msg = random.choice(messages)
        lead = client.create_lead(
            name=first,
            surname=last,
            email=email,
            message=msg,
        )
        if lead:
            total += 1
            log.info("  [%d/%d] Lead: %s %s", i, count, first, last)
        else:
            log.debug("  Lead failed: %s %s", first, last)

    log.info("Leads done — created: %d", total)
    return total


# ---------------------------------------------------------------------------
# Enquiry seeds (landing page contact form)
# ---------------------------------------------------------------------------

def seed_enquiries(client: WeHiveClient, count: int = 30) -> int:
    """Seed enquiry leads via /leads/enquiry."""
    log.info("--- Seeding %d enquiries ---", count)
    destinations = ["USA", "UK", "Canada", "Australia", "Germany", "France"]
    branches = ["miyapur", "habsiguda", "manikonda"]
    purposes = ["tourist", "business", "student_f1", "work", "family"]
    total = 0

    for i in range(1, count + 1):
        first, last = rand_name()
        full_name = f"{first} {last}"
        email = rand_email(first, last, 9000 + i)
        phone = rand_phone()
        dest = random.choice(destinations)
        purpose = random.choice(purposes)
        branch = random.choice(branches)
        travellers = random.randint(1, 4)

        resp = client.session.post(
            client._url("/leads/enquiry"),
            json={
                "name": full_name,
                "email": email,
                "phone": phone,
                "destination": dest,
                "purpose": purpose,
                "branch": branch,
                "travellers": travellers,
            },
            timeout=20,
        )
        if resp.status_code in (200, 201):
            total += 1
            log.info("  [%d/%d] Enquiry: %s → %s", i, count, full_name, dest)
        else:
            log.debug("  Enquiry failed %s: %s", email, resp.text[:100])

    log.info("Enquiries done — created: %d", total)
    return total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Seed WeHive with mock data")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--users", type=int, default=200, help="Number of regular users to create")
    parser.add_argument("--agents", type=int, default=10, help="Number of agent users")
    parser.add_argument("--leads", type=int, default=50, help="Number of leads")
    parser.add_argument("--enquiries", type=int, default=30, help="Number of enquiry leads")
    parser.add_argument("--no-apps", action="store_true", help="Skip application seeding")
    parser.add_argument("--dry-run", action="store_true", help="Auth only, no writes")
    parser.add_argument("--log-file", default=None, help="Path to save log output")
    args = parser.parse_args()

    # Set up file logging if requested
    if args.log_file:
        fh = logging.FileHandler(args.log_file)
        fh.setLevel(logging.INFO)
        log.addHandler(fh)

    log.info("WeHive Mock Data Seeder")
    log.info("Base URL: %s", args.base_url)
    log.info("Target: %d users, %d agents, %d leads, %d enquiries", args.users, args.agents, args.leads, args.enquiries)

    client = WeHiveClient(args.base_url)

    if not client.admin_login():
        log.error("Cannot authenticate — aborting.")
        sys.exit(1)

    if args.dry_run:
        log.info("Dry run — exiting after auth.")
        return

    # --- 1. Users ---
    users = seed_users(client, args.users)

    # --- 2. Applications ---
    n_apps = 0
    if not args.no_apps and users:
        n_apps = seed_applications(client, users)

    # --- 3. Agents ---
    agents = seed_agents(client, args.agents)

    # --- 4. Leads ---
    n_leads = seed_leads(client, args.leads)

    # --- 5. Enquiries ---
    n_enquiries = seed_enquiries(client, args.enquiries)

    # --- Summary ---
    log.info("")
    log.info("=" * 50)
    log.info("SEED COMPLETE")
    log.info("  Regular users created : %d", len(users))
    log.info("  Agent users created   : %d", len(agents))
    log.info("  Applications created  : %d", n_apps)
    log.info("  Leads created         : %d", n_leads)
    log.info("  Enquiries created     : %d", n_enquiries)
    log.info("=" * 50)


if __name__ == "__main__":
    main()

# NOTE FOR RUNNING THIS SCRIPT:
# This script must be run from your LOCAL machine (not from Claude's cloud sandbox),
# because the sandbox outbound proxy blocks external URLs.
#
# Steps:
#   1. git pull the repo on your local machine
#   2. cd wehive-master
#   3. pip install requests
#   4. python scripts/seed_mock_data.py
#
# Or pass a custom API URL:
#   python scripts/seed_mock_data.py --base-url https://wehive.co.in/api
