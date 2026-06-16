#!/usr/bin/env python3
"""
seed_from_csv.py

Upserts FULL university documents into `universities_v2` from a CSV whose columns
are your own schema field names (id, name, short_name, ... facilities).

Use this (not enrich_universities.py) when the CSV is your canonical, full-row
data with your own `id` values. It:
    * keys each upsert on the row's `id` (falls back to a name+country slug),
    * writes EVERY recognised column with correct types (int/float/bool/list/str),
    * is idempotent ($set + upsert) -- re-running reproduces the same documents.

enrich_universities.py is still the right tool for *sparse third-party* files
(e.g. a QS ranking export) where you only have a few columns and need fuzzy
name matching. This script is for data you already own and trust.

Usage:
    pip install pandas motor pymongo
    # env (defaults): MONGODB_URI=mongodb://localhost:27017  MONGODB_DB=wehive
    python backend/seed_from_csv.py --csv universities.csv --dry-run   # preview docs
    python backend/seed_from_csv.py --csv universities.csv             # apply
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
from typing import Any

import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "wehive")
COLLECTION_NAME = "universities_v2"


# --------------------------------------------------------------------------- #
# Per-field coercion
# --------------------------------------------------------------------------- #

def to_int(v: Any) -> int:
    s = str(v).replace(",", "")
    m = re.search(r"-?\d+", s)
    return int(m.group()) if m else 0

def to_float(v: Any) -> float:
    m = re.search(r"-?\d+(\.\d+)?", str(v).replace(",", ""))
    return float(m.group()) if m else 0.0

def to_bool(v: Any) -> bool:
    return str(v).strip().lower() in {"1", "true", "yes", "y", "t"}

def to_list(v: Any) -> list[str]:
    return [p.strip() for p in re.split(r"[;|,]", str(v)) if p.strip()]

def to_str(v: Any) -> str:
    return str(v).strip()

# Maps every schema field to its coercion. Columns not listed here are passed
# through as trimmed strings; columns absent from the CSV are simply omitted.
FIELD_TYPES = {
    "id": to_str, "name": to_str, "short_name": to_str,
    "country": to_str, "country_name": to_str, "flag": to_str,
    "rank": to_int, "qs_rank": to_int, "times_rank": to_int,
    "type": to_str, "established": to_int,
    "students": to_int, "intl_students": to_int,
    "tuition_usd": to_int, "living_cost_usd": to_int, "avg_salary_usd": to_int,
    "scholarships": to_bool, "gre_required": to_bool, "gmat_required": to_bool,
    "courses": to_list, "popular_courses": to_list, "intakes": to_list,
    "accreditation": to_list, "facilities": to_list,
    "ielts_min": to_float, "toefl_min": to_int,
    "acceptance_rate": to_str, "employment_rate": to_str,
    "description": to_str, "location": to_str, "website": to_str,
}


def slugify(name: str, country: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", f"{name}-{country}".lower()).strip("-")


def row_to_doc(row: pd.Series, columns: list[str]) -> dict[str, Any] | None:
    doc: dict[str, Any] = {}
    for col in columns:
        raw = row[col]
        coerce = FIELD_TYPES.get(col, to_str)
        doc[col] = coerce(raw)

    name = doc.get("name", "")
    if not name:
        return None
    # Guarantee a stable id even if the CSV omits one or leaves it blank.
    if not doc.get("id"):
        doc["id"] = slugify(name, doc.get("country_name") or doc.get("country") or "")
    return doc


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

async def main(args: argparse.Namespace) -> None:
    df = pd.read_csv(args.csv, dtype=str, keep_default_na=False)
    columns = [c.strip() for c in df.columns]
    df.columns = columns

    unknown = [c for c in columns if c not in FIELD_TYPES]
    print(f"CSV      : {args.csv}  ({len(df)} rows, {len(columns)} columns)")
    if unknown:
        print(f"Note     : columns not in the schema (stored as strings): {', '.join(unknown)}")
    print(f"Mongo    : {MONGODB_URI}  db={MONGODB_DB}  coll={COLLECTION_NAME}")
    print(f"Mode     : dry-run={args.dry_run}")
    print("-" * 70)

    docs = []
    for _, row in df.iterrows():
        doc = row_to_doc(row, columns)
        if doc:
            docs.append(doc)

    if args.dry_run:
        print("Sample of the documents that WOULD be written:\n")
        for doc in docs[: args.sample]:
            print(json.dumps(doc, ensure_ascii=False, indent=2))
            print()
        print("-" * 70)
        print(f"DRY RUN - nothing written. {len(docs)} documents prepared.")
        return

    mongo = AsyncIOMotorClient(MONGODB_URI)
    coll = mongo[MONGODB_DB][COLLECTION_NAME]
    await coll.create_index("id", unique=True)

    ops = [UpdateOne({"id": d["id"]}, {"$set": d}, upsert=True) for d in docs]
    added = modified = 0
    for i in range(0, len(ops), 500):
        res = await coll.bulk_write(ops[i : i + 500], ordered=False)
        added += res.upserted_count
        modified += res.modified_count

    total = await coll.count_documents({})
    print("Done.")
    print(f"  Inserted : {added}")
    print(f"  Updated  : {modified}")
    print(f"  Total    : {total}")
    mongo.close()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Upsert full university docs from a schema-shaped CSV.")
    p.add_argument("--csv", required=True)
    p.add_argument("--dry-run", action="store_true", help="Print sample docs, write nothing.")
    p.add_argument("--sample", type=int, default=3, help="Docs to print in dry-run (default 3).")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
