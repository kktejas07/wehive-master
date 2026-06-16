#!/usr/bin/env python3
"""
enrich_universities.py

Enriches the existing `universities_v2` MongoDB collection with ranking / tuition /
scholarship data from a CSV (e.g. a QS or THE world-ranking export, or a curated
tuition sheet you maintain).

Why a CSV and not an API:
    No free open API provides global rankings, tuition or scholarship data. The
    realistic source is a downloadable ranking CSV (QS/THE/CWUR) for rank, plus a
    curated CSV you own for tuition/scholarships. This script handles BOTH with the
    same code -- just run it once per CSV.

What it does:
    1. Auto-detects which CSV columns map to which schema fields (override-able).
    2. Loads your existing universities_v2 docs.
    3. Fuzzy-matches each CSV row to a doc, GATED BY COUNTRY to avoid false matches.
    4. Writes a match-audit CSV so you can eyeball results before trusting them.
    5. Upserts ONLY the enrichment fields present in the CSV via $set -- it never
       touches your other curated fields. Optionally inserts ranked unis missing
       from your collection (--insert-missing).

Idempotent: re-running overwrites the same enrichment fields with the same values.

Usage:
    pip install pandas rapidfuzz motor pymongo
    # optional, improves --insert-missing country->alpha2 resolution:
    pip install pycountry

    # env (defaults shown): MONGODB_URI=mongodb://localhost:27017  MONGODB_DB=wehive

    # 1) preview matches only, write a report, change nothing:
    python backend/enrich_universities.py --csv qs_2026.csv --dry-run

    # 2) apply once you're happy with the report:
    python backend/enrich_universities.py --csv qs_2026.csv

    # 3) also add ranked unis that aren't in your collection yet:
    python backend/enrich_universities.py --csv qs_2026.csv --insert-missing

    # override a column the auto-detector got wrong:
    python backend/enrich_universities.py --csv f.csv --map rank="2026 Rank" --map name="Institution Name"
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
import unicodedata
from typing import Any

import pandas as pd
from rapidfuzz import fuzz, process
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

try:
    import pycountry  # optional, only used for --insert-missing
except ImportError:
    pycountry = None

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "wehive")
COLLECTION_NAME = "universities_v2"

DEFAULT_THRESHOLD = 88  # rapidfuzz WRatio score (0-100) required to accept a match
CROSS_COUNTRY_BONUS = 6  # extra threshold required when matching outside a country bucket

# For each target schema field, candidate CSV header names (matched case-insensitively).
# The first column that exists in the CSV wins. Add your own variants freely.
COLUMN_CANDIDATES: dict[str, list[str]] = {
    "name":        ["institution name", "institution", "university", "name", "school"],
    "country_name":["country_name", "country/territory", "country", "location", "territory"],
    "rank":        ["2026 rank", "2025 rank", "rank", "world rank", "ranking", "rank_display"],
    "qs_rank":     ["qs rank", "qs_rank", "qs world rank"],
    "times_rank":  ["the rank", "times rank", "times_rank", "the_rank"],
    "type":        ["type", "institution type", "control"],
    "established": ["established", "founded", "year founded", "founding year"],
    "students":    ["students", "total students", "enrollment", "student population"],
    "intl_students": ["intl_students", "international students", "intl students"],
    "tuition_usd": ["tuition_usd", "tuition", "tuition fee", "annual tuition", "fees_usd"],
    "living_cost_usd": ["living_cost_usd", "living cost", "cost of living"],
    "scholarships":["scholarships", "scholarship", "scholarship_available"],
    "courses":     ["courses", "programs", "programmes", "fields"],
    "popular_courses": ["popular_courses", "popular courses", "top courses"],
    "intakes":     ["intakes", "intake", "intake months"],
    "ielts_min":   ["ielts_min", "ielts", "min ielts"],
    "toefl_min":   ["toefl_min", "toefl", "min toefl"],
    "acceptance_rate": ["acceptance_rate", "acceptance rate", "admit rate"],
    "employment_rate": ["employment_rate", "employment rate", "graduate employment"],
    "avg_salary_usd": ["avg_salary_usd", "avg salary", "average salary", "median salary"],
    "accreditation": ["accreditation", "accreditations", "accredited by"],
    "facilities":  ["facilities", "amenities"],
}

# How each field's raw string is coerced before writing.
def _to_int(v: Any) -> int | None:
    # Take the first integer run so banded ranks ("801-1000", "1001+") -> lower bound,
    # and money strings ("$45,000 USD") parse correctly.
    s = str(v).replace(",", "")
    m = re.search(r"\d+", s)
    return int(m.group()) if m else None

def _to_float(v: Any) -> float | None:
    s = re.sub(r"[^\d.]", "", str(v))
    try:
        return float(s) if s else None
    except ValueError:
        return None

def _to_bool(v: Any) -> bool:
    return str(v).strip().lower() in {"1", "true", "yes", "y", "t", "available"}

def _to_str(v: Any) -> str:
    return str(v).strip()

def _to_list(v: Any) -> list[str] | None:
    # Split on ; or | or , into a clean list; empty -> None (so it's skipped).
    parts = [p.strip() for p in re.split(r"[;|,]", str(v)) if p.strip()]
    return parts or None

COERCE = {
    "rank": _to_int, "qs_rank": _to_int, "times_rank": _to_int,
    "type": _to_str, "established": _to_int,
    "students": _to_int, "intl_students": _to_int,
    "tuition_usd": _to_int, "living_cost_usd": _to_int, "avg_salary_usd": _to_int,
    "ielts_min": _to_float, "toefl_min": _to_int,
    "scholarships": _to_bool,
    "acceptance_rate": _to_str, "employment_rate": _to_str,
    "courses": _to_list, "popular_courses": _to_list,
    "intakes": _to_list, "accreditation": _to_list, "facilities": _to_list,
}

# Defaults applied ONLY when inserting a brand-new doc (--insert-missing).
INSERT_DEFAULTS = {
    "short_name": "", "flag": "🏳️", "qs_rank": 9999, "times_rank": 9999,
    "type": "", "established": 0, "students": 0, "intl_students": 0,
    "tuition_usd": 0, "living_cost_usd": 0, "scholarships": False,
    "courses": [], "popular_courses": [], "intakes": ["Sep", "Jan"],
    "gre_required": False, "gmat_required": False,
    "ielts_min": 6.5, "toefl_min": 80,
    "acceptance_rate": "N/A", "employment_rate": "N/A", "avg_salary_usd": 0,
    "website": "", "location": "", "description": "",
    "accreditation": [], "facilities": [],
}

# Common country-name aliases so CSV countries bucket with your country_name values.
COUNTRY_ALIASES = {
    "usa": "united states", "us": "united states", "u.s.": "united states",
    "u.s.a.": "united states", "united states of america": "united states",
    "uk": "united kingdom", "u.k.": "united kingdom", "great britain": "united kingdom",
    "uae": "united arab emirates", "south korea": "korea, republic of",
    "russia": "russian federation", "turkey": "turkiye",
}


# --------------------------------------------------------------------------- #
# Normalisation
# --------------------------------------------------------------------------- #

def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))

def clean_name(s: str) -> str:
    s = strip_accents(str(s).lower())
    s = s.replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)            # drop parenthetical asides
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def country_key(s: str) -> str:
    k = strip_accents(str(s).lower()).strip().strip(".")
    k = re.sub(r"\s+", " ", k)
    return COUNTRY_ALIASES.get(k, k)

def slugify(name: str, country: str) -> str:
    raw = re.sub(r"[^a-z0-9]+", "-", f"{name}-{country}".lower())
    return raw.strip("-")

def flag_from_alpha2(code: str | None) -> str:
    if not code or len(code) != 2 or not code.isalpha():
        return "🏳️"
    return "".join(chr(ord(c) - ord("A") + 0x1F1E6) for c in code.upper())

def alpha2_for(country_name: str) -> str:
    if not pycountry:
        return ""
    try:
        match = pycountry.countries.lookup(country_name)
        return match.alpha_2.lower()
    except LookupError:
        return ""


# --------------------------------------------------------------------------- #
# CSV loading + column detection
# --------------------------------------------------------------------------- #

def detect_columns(df: pd.DataFrame, overrides: dict[str, str]) -> dict[str, str]:
    """Map logical field -> actual CSV column name."""
    lower_to_actual = {str(c).strip().lower(): c for c in df.columns}
    mapping: dict[str, str] = {}
    for field, candidates in COLUMN_CANDIDATES.items():
        if field in overrides:
            mapping[field] = overrides[field]
            continue
        for cand in candidates:
            if cand in lower_to_actual:
                mapping[field] = lower_to_actual[cand]
                break
    # explicit overrides for fields not in COLUMN_CANDIDATES
    for field, col in overrides.items():
        mapping.setdefault(field, col)
    return mapping


# --------------------------------------------------------------------------- #
# Matching
# --------------------------------------------------------------------------- #

def build_index(docs: list[dict]) -> tuple[dict[str, list], list, list]:
    """
    Returns:
      by_country: country_key -> list of (clean_name, doc)
      all_names:  flat list of clean names (cross-country fallback)
      all_docs:   parallel list of docs
    """
    by_country: dict[str, list] = {}
    all_names: list[str] = []
    all_docs: list[dict] = []
    for d in docs:
        cn = clean_name(d.get("name", ""))
        if not cn:
            continue
        ck = country_key(d.get("country_name") or d.get("country") or "")
        by_country.setdefault(ck, []).append((cn, d))
        all_names.append(cn)
        all_docs.append(d)
    return by_country, all_names, all_docs


def match_one(name: str, ck: str, by_country, all_names, all_docs, threshold: int):
    """Return (doc, score, scope) or (None, best_score, scope)."""
    target = clean_name(name)
    bucket = by_country.get(ck)
    if bucket:
        choices = [c for c, _ in bucket]
        res = process.extractOne(target, choices, scorer=fuzz.WRatio, score_cutoff=threshold)
        if res:
            return bucket[res[2]][1], res[1], "country"
        # record best-effort score for the report even if below cutoff
        res2 = process.extractOne(target, choices, scorer=fuzz.WRatio)
        best = res2[1] if res2 else 0.0
    else:
        best = 0.0
    # cross-country fallback with a stricter threshold
    res = process.extractOne(target, all_names, scorer=fuzz.WRatio,
                             score_cutoff=threshold + CROSS_COUNTRY_BONUS)
    if res:
        return all_docs[res[2]], res[1], "global"
    return None, best, "none"


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

async def main(args: argparse.Namespace) -> None:
    overrides = dict(kv.split("=", 1) for kv in (args.map or []))
    df = pd.read_csv(args.csv, dtype=str, keep_default_na=False)
    colmap = detect_columns(df, overrides)

    if "name" not in colmap:
        sys.exit("ERROR: could not find a university-name column. Use --map name=\"<col>\".")

    enrich_fields = [f for f in COERCE if f in colmap]
    print(f"CSV          : {args.csv}  ({len(df)} rows)")
    print(f"Name column  : {colmap['name']}")
    print(f"Country col  : {colmap.get('country_name', '(none -> cross-country matching)')}")
    print(f"Enriching    : {', '.join(enrich_fields) or '(nothing detected!)'}")
    print(f"Threshold    : {args.threshold}   dry-run: {args.dry_run}   insert-missing: {args.insert_missing}")
    print("-" * 70)

    mongo = AsyncIOMotorClient(MONGODB_URI)
    coll = mongo[MONGODB_DB][COLLECTION_NAME]
    await coll.create_index("id", unique=True)

    docs = await coll.find(
        {}, {"id": 1, "name": 1, "country": 1, "country_name": 1}
    ).to_list(length=None)
    print(f"Loaded {len(docs)} existing universities from {COLLECTION_NAME}.")
    by_country, all_names, all_docs = build_index(docs)

    ops: list[UpdateOne] = []
    report_rows: list[dict] = []
    n_updated = n_inserted = n_low = n_nomatch = 0

    for _, row in df.iterrows():
        csv_name = str(row[colmap["name"]]).strip()
        if not csv_name:
            continue
        csv_country = str(row[colmap["country_name"]]).strip() if "country_name" in colmap else ""
        ck = country_key(csv_country)

        doc, score, scope = match_one(csv_name, ck, by_country, all_names, all_docs, args.threshold)

        # Build the enrichment payload from whatever fields exist in the CSV.
        payload: dict[str, Any] = {}
        for f in enrich_fields:
            val = COERCE[f](row[colmap[f]])
            if val is not None:
                payload[f] = val

        if doc:
            action = "update"
            n_updated += 1
            if not args.dry_run and payload:
                ops.append(UpdateOne({"id": doc["id"]}, {"$set": payload}))
        elif args.insert_missing and score < args.threshold:
            action = "insert"
            n_inserted += 1
            if not args.dry_run:
                a2 = alpha2_for(csv_country)
                slug = slugify(csv_name, csv_country)
                new_doc = {
                    **INSERT_DEFAULTS,
                    "id": slug, "name": csv_name,
                    "country": a2, "country_name": csv_country,
                    "flag": flag_from_alpha2(a2) if a2 else "🏳️",
                    "location": csv_country,
                    "description": f"{csv_name} is a university located in {csv_country}.",
                    "rank": 9999,
                }
                new_doc.update(payload)
                ops.append(UpdateOne({"id": slug}, {"$setOnInsert": new_doc}, upsert=True))
        else:
            action = "skip_low_score" if score > 0 else "skip_no_match"
            if score > 0:
                n_low += 1
            else:
                n_nomatch += 1

        report_rows.append({
            "csv_name": csv_name,
            "csv_country": csv_country,
            "matched_name": doc["name"] if doc else "",
            "matched_id": doc["id"] if doc else "",
            "score": round(score, 1),
            "scope": scope,
            "action": action,
            "fields": ",".join(payload.keys()),
        })

    # Always write the audit report.
    report_df = pd.DataFrame(report_rows)
    report_df.to_csv(args.report, index=False)
    print(f"Wrote match report -> {args.report}")

    # Apply.
    if not args.dry_run and ops:
        BATCH = 500
        for i in range(0, len(ops), BATCH):
            await coll.bulk_write(ops[i:i + BATCH], ordered=False)

    total = await coll.count_documents({})
    print("-" * 70)
    print("DRY RUN - nothing written." if args.dry_run else "Done.")
    print(f"  Matched & updated     : {n_updated}")
    if args.insert_missing:
        print(f"  Inserted (missing)    : {n_inserted}")
    print(f"  Skipped (low score)   : {n_low}    <- review these in the report")
    print(f"  Skipped (no match)    : {n_nomatch}")
    print(f"  Total in collection   : {total}")
    mongo.close()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Enrich universities_v2 from a ranking/tuition CSV.")
    p.add_argument("--csv", required=True, help="Path to the ranking/tuition CSV.")
    p.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD,
                   help=f"Fuzzy match score 0-100 (default {DEFAULT_THRESHOLD}).")
    p.add_argument("--dry-run", action="store_true", help="Preview + write report, change nothing.")
    p.add_argument("--insert-missing", action="store_true",
                   help="Insert ranked unis not found in the collection.")
    p.add_argument("--map", action="append",
                   help='Override column detection, e.g. --map rank="2026 Rank". Repeatable.')
    p.add_argument("--report", default="enrich_match_report.csv",
                   help="Path for the match-audit CSV (default: enrich_match_report.csv).")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
