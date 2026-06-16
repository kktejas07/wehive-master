#!/usr/bin/env python3
"""
seed_universities_external.py

Seeds the `universities_v2` MongoDB collection from a second, external
university data source (in addition to the existing HiPolabs seeder).

Design notes
------------
* Most free "University API" endpoints (HiPolabs and its many clones, e.g.
  university-api.onrender.com style services) return only a *thin* schema:
      name, country, alpha_two_code, web_pages, (sometimes) languages/region
  They do NOT provide rank / tuition / courses / IELTS / acceptance_rate, etc.
  Those rich fields therefore fall back to sensible defaults here.

* Because of that, this script is written to be SOURCE-AGNOSTIC. Two functions
  are the only things you need to touch to point it at a different API:
      - fetch_universities()  -> how to pull + paginate the raw records
      - map_record()          -> how to translate one raw record into our schema
  Everything else (dedup, upsert, summary) stays the same.

* IDEMPOTENCY / NON-DESTRUCTIVE UPSERT:
  Fields the external API actually provides are written with $set.
  All the rich/default fields are written with $setOnInsert, so re-running this
  (or running it after the HiPolabs seeder / hand-curation) will NOT overwrite
  good curated data with zeros. Defaults are only applied on first insert.

Usage
-----
    pip install httpx motor python-dotenv
    # optional config via env vars (defaults shown):
    #   MONGODB_URI=mongodb://localhost:27017
    #   MONGODB_DB=wehive
    #   UNIVERSITY_API_BASE=http://universities.hipolabs.com
    python backend/seed_universities_external.py
    # or restrict to specific countries:
    python backend/seed_universities_external.py --country "India" --country "Germany"
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from typing import Any, Iterable

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "wehive")
COLLECTION_NAME = "universities_v2"

# Base URL of the external source. Swap this for whatever API you confirm.
# Default points at the HiPolabs-style shape (name/country/alpha_two_code/web_pages).
API_BASE = os.environ.get("UNIVERSITY_API_BASE", "https://universities.hipolabs.com").rstrip("/")
SEARCH_PATH = "/search"

# Network tuning
HTTP_TIMEOUT = 30.0
PAGE_SIZE = 200          # used only if the API supports paging (offset/limit)
MAX_PAGES = 1000         # safety guard against runaway pagination
BATCH_SIZE = 500         # Mongo bulk_write batch size


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def slugify(name: str, country: str) -> str:
    """Stable slug from name + country (matches the existing seeder's `id` style)."""
    raw = f"{name}-{country}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    return raw.strip("-")


def flag_from_alpha2(code: str | None) -> str:
    """Convert an ISO alpha-2 country code into its emoji flag (regional indicators)."""
    if not code or len(code) != 2 or not code.isalpha():
        return "🏳️"
    code = code.upper()
    return "".join(chr(ord(c) - ord("A") + 0x1F1E6) for c in code)


def first_or_empty(seq: Any) -> str:
    if isinstance(seq, (list, tuple)) and seq:
        return str(seq[0])
    if isinstance(seq, str):
        return seq
    return ""


# --------------------------------------------------------------------------- #
# 1) FETCH  --  the only network logic. Edit here for a different source.
# --------------------------------------------------------------------------- #

async def fetch_universities(
    client: httpx.AsyncClient,
    countries: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Pull raw records from the external API.

    HiPolabs-style endpoints return a single JSON array and do NOT paginate, but
    they accept an optional ?country= filter. We still wrap a paging loop so the
    same function works if you point it at an offset/limit-style API later.
    """
    results: list[dict[str, Any]] = []
    targets = countries if countries else [None]  # None => fetch everything

    for country in targets:
        offset = 0
        for _ in range(MAX_PAGES):
            params: dict[str, Any] = {}
            if country:
                params["country"] = country
            # These are harmless if the API ignores them (HiPolabs does):
            params["limit"] = PAGE_SIZE
            params["offset"] = offset

            resp = await client.get(f"{API_BASE}{SEARCH_PATH}", params=params)
            resp.raise_for_status()
            payload = resp.json()

            # Normalise: accept either a bare list or {"data"/"results": [...]}.
            if isinstance(payload, dict):
                page = payload.get("data") or payload.get("results") or []
            else:
                page = payload

            if not page:
                break

            results.extend(page)

            # HiPolabs ignores offset and returns the full list every time, so if
            # we got fewer than a full page (or the API isn't paginating), stop.
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE

    return results


# --------------------------------------------------------------------------- #
# 2) MAP  --  translate one raw record -> our schema. Edit here for a different source.
# --------------------------------------------------------------------------- #

def map_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    """
    Returns a dict with two keys:
        "provided"  -> fields the API genuinely gives us (written every run via $set)
        "defaults"  -> fields we synthesise (written once via $setOnInsert)
    Returns None for records we should skip (missing name/country).
    """
    name = (raw.get("name") or "").strip()
    country_name = (raw.get("country") or "").strip()
    alpha2 = (raw.get("alpha_two_code") or raw.get("country_code") or "").strip().lower()

    if not name or not country_name:
        return None

    website = first_or_empty(raw.get("web_pages") or raw.get("website"))
    region = raw.get("region") or raw.get("state-province") or ""

    provided = {
        "name": name,
        "short_name": raw.get("short_name") or name.split()[0] if name else name,
        "country": alpha2,                       # ISO alpha-2 lowercase
        "country_name": country_name,
        "flag": flag_from_alpha2(alpha2),
        "website": website,
        "location": region or country_name,
    }

    # Rich fields the thin API does not provide -> defaults, applied only on insert.
    defaults = {
        "rank": 9999,
        "qs_rank": 9999,
        "times_rank": 9999,
        "tuition_usd": 0,
        "living_cost_usd": 0,
        "scholarships": False,
        "courses": [],
        "intakes": ["Sep", "Jan"],
        "ielts_min": 6.5,
        "gre_required": False,
        "gmat_required": False,
        "acceptance_rate": "N/A",
        "description": f"{name} is a university located in {country_name}.",
    }

    return {"provided": provided, "defaults": defaults}


# --------------------------------------------------------------------------- #
# Upsert assembly
# --------------------------------------------------------------------------- #

def build_ops(records: Iterable[dict[str, Any]]) -> tuple[list[UpdateOne], int]:
    """
    Build UpdateOne ops, deduplicating by (name, country) within this run via the
    slug id. Returns (ops, skipped_count).
    """
    ops: list[UpdateOne] = []
    seen: set[str] = set()
    skipped = 0

    for raw in records:
        mapped = map_record(raw)
        if mapped is None:
            skipped += 1
            continue

        provided = mapped["provided"]
        slug = slugify(provided["name"], provided["country_name"])

        if slug in seen:        # in-batch dedup
            continue
        seen.add(slug)

        update = {
            "$set": provided,                                   # refresh every run
            "$setOnInsert": {"id": slug, **mapped["defaults"]}, # never clobber curated data
        }
        ops.append(UpdateOne({"id": slug}, update, upsert=True))

    return ops, skipped


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

async def main(countries: list[str] | None) -> None:
    print(f"Source API : {API_BASE}{SEARCH_PATH}")
    print(f"MongoDB    : {MONGODB_URI}  db={MONGODB_DB}  coll={COLLECTION_NAME}")
    if countries:
        print(f"Filtering  : {', '.join(countries)}")
    print("-" * 60)

    mongo = AsyncIOMotorClient(MONGODB_URI)
    try:
        coll = mongo[MONGODB_DB][COLLECTION_NAME]
        # Ensure the dedup key is indexed (idempotent).
        await coll.create_index("id", unique=True)

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
            try:
                raw_records = await fetch_universities(client, countries)
            except httpx.HTTPError as exc:
                print(f"ERROR: failed to fetch from {API_BASE}: {exc}", file=sys.stderr)
                sys.exit(1)

        print(f"Fetched {len(raw_records)} raw records from the API.")

        ops, skipped = build_ops(raw_records)
        if skipped:
            print(f"Skipped {skipped} records missing name/country.")

        added = 0
        modified = 0
        for i in range(0, len(ops), BATCH_SIZE):
            batch = ops[i : i + BATCH_SIZE]
            if not batch:
                continue
            result = await coll.bulk_write(batch, ordered=False)
            added += result.upserted_count
            modified += result.modified_count

        total = await coll.count_documents({})

        print("-" * 60)
        print("Done.")
        print(f"  Newly added (inserted) : {added}")
        print(f"  Existing updated       : {modified}")
        print(f"  Unique processed       : {len(ops)}")
        print(f"  Total in collection    : {total}")
    finally:
        mongo.close()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed universities_v2 from an external API.")
    p.add_argument(
        "--country",
        action="append",
        dest="countries",
        help="Restrict to a country (full name, as the API expects). Repeatable.",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(main(args.countries))
