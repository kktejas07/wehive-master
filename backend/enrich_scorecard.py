#!/usr/bin/env python3
"""
enrich_scorecard.py

Enriches US universities in the `universities_v2` MongoDB collection with real
tuition / admission / earnings data from the US Department of Education's
College Scorecard API (free, official).

This is the one genuine *live API* source for US destination data. It fills:
    tuition_usd       <- latest.cost.tuition.out_of_state   (what non-residents pay;
                          the right figure for international applicants)
    living_cost_usd   <- cost of attendance minus tuition    (best-effort estimate)
    acceptance_rate   <- latest.admissions.admission_rate.overall (formatted as %)
    students          <- latest.student.size
    avg_salary_usd    <- latest.earnings.10_yrs_after_entry.median
    type              <- school.ownership                    (Public / Private)
    website           <- school.school_url
It does NOT touch rank, courses, ielts, etc. -- only the fields above, only for
US schools it can confidently match. Non-destructive ($set) and idempotent.

Get a free API key (DEMO_KEY is heavily rate-limited):
    https://api.data.gov/signup/

Usage:
    pip install httpx motor pymongo rapidfuzz pycountry
    export SCORECARD_API_KEY=your_key
    # env (defaults shown): MONGODB_URI=mongodb://localhost:27017  MONGODB_DB=wehive

    python backend/enrich_scorecard.py --dry-run          # preview + write report
    python backend/enrich_scorecard.py                    # apply
    python backend/enrich_scorecard.py --insert-missing   # add unmatched US schools

NOTE: shares the same fuzzy-matching approach as enrich_universities.py. Kept
self-contained on purpose so each script runs independently.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
import unicodedata
from typing import Any

import httpx
import pandas as pd
from rapidfuzz import fuzz, process
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

try:
    import pycountry  # noqa: F401  (kept for parity; US is hard-coded here)
except ImportError:
    pycountry = None

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "wehive")
COLLECTION_NAME = "universities_v2"

API_KEY = os.environ.get("SCORECARD_API_KEY", "DEMO_KEY")
API_URL = "https://api.data.gov/ed/collegescorecard/v1/schools"

PER_PAGE = 100          # API max
MAX_PAGES = 200         # safety guard
HTTP_TIMEOUT = 60.0
DEFAULT_THRESHOLD = 88
CROSS_COUNTRY_BONUS = 6  # unused here (US-only) but kept for symmetry

# Exact dotted field paths to request. Order doesn't matter.
FIELDS = [
    "id",
    "school.name",
    "school.state",
    "school.city",
    "school.ownership",
    "school.school_url",
    "latest.cost.tuition.out_of_state",
    "latest.cost.tuition.in_state",
    "latest.cost.attendance.academic_year",
    "latest.admissions.admission_rate.overall",
    "latest.student.size",
    "latest.earnings.10_yrs_after_entry.median",
]

OWNERSHIP = {1: "Public", 2: "Private (non-profit)", 3: "Private (for-profit)"}

INSERT_DEFAULTS = {
    "short_name": "", "flag": "🇺🇸", "rank": 9999, "qs_rank": 9999, "times_rank": 9999,
    "type": "", "established": 0, "students": 0, "intl_students": 0,
    "tuition_usd": 0, "living_cost_usd": 0, "scholarships": False,
    "courses": [], "popular_courses": [], "intakes": ["Sep", "Jan"],
    "gre_required": False, "gmat_required": False,
    "ielts_min": 6.5, "toefl_min": 80,
    "acceptance_rate": "N/A", "employment_rate": "N/A", "avg_salary_usd": 0,
    "website": "", "location": "", "description": "",
    "accreditation": [], "facilities": [],
}


# --------------------------------------------------------------------------- #
# Normalisation / matching (mirrors enrich_universities.py)
# --------------------------------------------------------------------------- #

def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))

def clean_name(s: str) -> str:
    s = strip_accents(str(s).lower()).replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def country_key(s: str) -> str:
    k = strip_accents(str(s).lower()).strip().strip(".")
    aliases = {"usa": "united states", "us": "united states",
               "united states of america": "united states"}
    return aliases.get(re.sub(r"\s+", " ", k), re.sub(r"\s+", " ", k))

def slugify(name: str, country: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", f"{name}-{country}".lower()).strip("-")

def build_index(docs: list[dict]):
    by_country: dict[str, list] = {}
    for d in docs:
        cn = clean_name(d.get("name", ""))
        if not cn:
            continue
        ck = country_key(d.get("country_name") or d.get("country") or "")
        by_country.setdefault(ck, []).append((cn, d))
    return by_country

def match_one(name: str, by_country, threshold: int):
    """US-only match against the 'united states' bucket."""
    bucket = by_country.get("united states") or []
    if not bucket:
        return None, 0.0
    target = clean_name(name)
    choices = [c for c, _ in bucket]
    res = process.extractOne(target, choices, scorer=fuzz.WRatio, score_cutoff=threshold)
    if res:
        return bucket[res[2]][1], res[1]
    res2 = process.extractOne(target, choices, scorer=fuzz.WRatio)
    return None, (res2[1] if res2 else 0.0)


# --------------------------------------------------------------------------- #
# Fetch
# --------------------------------------------------------------------------- #

async def fetch_all(client: httpx.AsyncClient) -> list[dict]:
    """Page through all operating, degree-granting (bachelor+graduate) US schools."""
    results: list[dict] = []
    page = 0
    total: int | None = None
    while page < MAX_PAGES:
        params = {
            "api_key": API_KEY,
            "fields": ",".join(FIELDS),
            "per_page": PER_PAGE,
            "page": page,
            "school.operating": 1,
            "school.degrees_awarded.predominant__range": "3..4",  # bachelor + graduate
        }
        resp = await client.get(API_URL, params=params)
        if resp.status_code == 429:
            sys.exit("ERROR: rate limited. DEMO_KEY is throttled -- set SCORECARD_API_KEY "
                     "to your own free key from https://api.data.gov/signup/")
        resp.raise_for_status()
        payload = resp.json()

        batch = payload.get("results", [])
        results.extend(batch)

        meta = payload.get("metadata", {})
        total = meta.get("total", total)
        if total is not None and len(results) >= total:
            break
        if not batch:
            break
        page += 1
        print(f"  fetched {len(results)}" + (f"/{total}" if total else ""), end="\r")

    print()
    return results


# --------------------------------------------------------------------------- #
# Mapping
# --------------------------------------------------------------------------- #

def _int(v: Any) -> int | None:
    try:
        return int(round(float(v))) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None

def map_row(raw: dict) -> tuple[str, dict]:
    """Returns (school_name, payload of schema fields with real values only)."""
    name = (raw.get("school.name") or "").strip()
    payload: dict[str, Any] = {}

    tuition = _int(raw.get("latest.cost.tuition.out_of_state"))
    if tuition:
        payload["tuition_usd"] = tuition

    aoy = _int(raw.get("latest.cost.attendance.academic_year"))
    if aoy and tuition and aoy > tuition:
        payload["living_cost_usd"] = aoy - tuition  # rough non-tuition cost

    rate = raw.get("latest.admissions.admission_rate.overall")
    if isinstance(rate, (int, float)) and rate > 0:
        payload["acceptance_rate"] = f"{round(rate * 100, 1)}%"

    size = _int(raw.get("latest.student.size"))
    if size:
        payload["students"] = size

    salary = _int(raw.get("latest.earnings.10_yrs_after_entry.median"))
    if salary:
        payload["avg_salary_usd"] = salary

    own = raw.get("school.ownership")
    if own in OWNERSHIP:
        payload["type"] = OWNERSHIP[own]

    url = (raw.get("school.school_url") or "").strip()
    if url:
        payload["website"] = url if url.startswith("http") else f"https://{url}"

    return name, payload


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

async def main(args: argparse.Namespace) -> None:
    if API_KEY == "DEMO_KEY":
        print("WARNING: using DEMO_KEY (heavily rate-limited). Set SCORECARD_API_KEY "
              "to your own free key from https://api.data.gov/signup/\n")

    print(f"Source : College Scorecard API")
    print(f"Mongo  : {MONGODB_URI}  db={MONGODB_DB}  coll={COLLECTION_NAME}")
    print(f"Mode   : dry-run={args.dry_run}  insert-missing={args.insert_missing}  threshold={args.threshold}")
    print("-" * 70)

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        try:
            print("Fetching US institutions from College Scorecard...")
            raw_rows = await fetch_all(client)
        except httpx.HTTPError as exc:
            sys.exit(f"ERROR: College Scorecard request failed: {exc}")
    print(f"Fetched {len(raw_rows)} US institutions.")

    mongo = AsyncIOMotorClient(MONGODB_URI)
    try:
        coll = mongo[MONGODB_DB][COLLECTION_NAME]
        await coll.create_index("id", unique=True)
        docs = await coll.find(
            {}, {"id": 1, "name": 1, "country": 1, "country_name": 1}
        ).to_list(length=None)
        by_country = build_index(docs)
        print(f"Loaded {len(docs)} existing universities "
              f"({len(by_country.get('united states', []))} US).")

        ops: list[UpdateOne] = []
        report_rows: list[dict] = []
        n_updated = n_inserted = n_low = n_skip = 0

        for raw in raw_rows:
            name, payload = map_row(raw)
            if not name or not payload:
                n_skip += 1
                continue

            doc, score = match_one(name, by_country, args.threshold)
            if doc:
                n_updated += 1
                action = "update"
                if not args.dry_run:
                    ops.append(UpdateOne({"id": doc["id"]}, {"$set": payload}))
            elif args.insert_missing:
                n_inserted += 1
                action = "insert"
                if not args.dry_run:
                    slug = slugify(name, "united states")
                    new_doc = {
                        **INSERT_DEFAULTS, "id": slug, "name": name,
                        "country": "us", "country_name": "United States",
                        "location": (raw.get("school.city") or "") + ", " + (raw.get("school.state") or ""),
                        "description": f"{name} is a university located in the United States.",
                        **payload,
                    }
                    ops.append(UpdateOne({"id": slug}, {"$setOnInsert": new_doc}, upsert=True))
            else:
                action = "skip_low_score"
                n_low += 1

            report_rows.append({
                "scorecard_name": name,
                "matched_name": doc["name"] if doc else "",
                "matched_id": doc["id"] if doc else "",
                "score": round(score, 1),
                "action": action,
                "fields": ",".join(payload.keys()),
            })

        pd.DataFrame(report_rows).to_csv(args.report, index=False)
        print(f"Wrote match report -> {args.report}")

        if not args.dry_run and ops:
            for i in range(0, len(ops), 500):
                await coll.bulk_write(ops[i:i + 500], ordered=False)

        total = await coll.count_documents({})
        print("-" * 70)
        print("DRY RUN - nothing written." if args.dry_run else "Done.")
        print(f"  Matched & updated   : {n_updated}")
        if args.insert_missing:
            print(f"  Inserted (missing)  : {n_inserted}")
        print(f"  Unmatched (skipped) : {n_low}   <- review in the report")
        print(f"  No usable data      : {n_skip}")
        print(f"  Total in collection : {total}")
    finally:
        mongo.close()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Enrich US universities from College Scorecard.")
    p.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--insert-missing", action="store_true")
    p.add_argument("--report", default="scorecard_match_report.csv")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
