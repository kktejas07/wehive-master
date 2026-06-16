"""Reusable async functions for university CSV seeding and Scorecard enrichment.
Uses the existing MongoDB connection from db.py."""
from __future__ import annotations

import io
import os
import re
import unicodedata
from typing import Any

import httpx
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
from rapidfuzz import fuzz, process

from db import universities_col

# --------------------------------------------------------------------------- #
# seed_from_csv  --  full-document upsert from a schema-shaped CSV
# --------------------------------------------------------------------------- #

def _to_int(v: Any) -> int:
    s = str(v).replace(",", "")
    m = re.search(r"-?\d+", s)
    return int(m.group()) if m else 0

def _to_float(v: Any) -> float:
    m = re.search(r"-?\d+(\.\d+)?", str(v).replace(",", ""))
    return float(m.group()) if m else 0.0

def _to_bool(v: Any) -> bool:
    return str(v).strip().lower() in {"1", "true", "yes", "y", "t"}

def _to_list(v: Any) -> list[str]:
    return [p.strip() for p in re.split(r"[;|,]", str(v)) if p.strip()]

def _to_str(v: Any) -> str:
    return str(v).strip()

FIELD_TYPES = {
    "id": _to_str, "name": _to_str, "short_name": _to_str,
    "country": _to_str, "country_name": _to_str, "flag": _to_str,
    "rank": _to_int, "qs_rank": _to_int, "times_rank": _to_int,
    "type": _to_str, "established": _to_int,
    "students": _to_int, "intl_students": _to_int,
    "tuition_usd": _to_int, "living_cost_usd": _to_int, "avg_salary_usd": _to_int,
    "scholarships": _to_bool, "gre_required": _to_bool, "gmat_required": _to_bool,
    "courses": _to_list, "popular_courses": _to_list, "intakes": _to_list,
    "accreditation": _to_list, "facilities": _to_list,
    "ielts_min": _to_float, "toefl_min": _to_int,
    "acceptance_rate": _to_str, "employment_rate": _to_str,
    "description": _to_str, "location": _to_str, "website": _to_str,
    "image_url": _to_str,
}

def _slugify(name: str, country: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", f"{name}-{country}".lower()).strip("-")

def _row_to_doc(row: pd.Series, columns: list[str]) -> dict[str, Any] | None:
    doc: dict[str, Any] = {}
    for col in columns:
        coerce = FIELD_TYPES.get(col, _to_str)
        doc[col] = coerce(row[col])
    name = doc.get("name", "")
    if not name:
        return None
    if not doc.get("id"):
        doc["id"] = _slugify(name, doc.get("country_name") or doc.get("country") or "")
    return doc

async def seed_from_csv_bytes(csv_data: bytes, filename: str, dry_run: bool = False) -> dict:
    df = pd.read_csv(io.BytesIO(csv_data), dtype=str, keep_default_na=False)
    columns = [c.strip() for c in df.columns]
    df.columns = columns
    unknown = [c for c in columns if c not in FIELD_TYPES]

    docs = [_row_to_doc(row, columns) for _, row in df.iterrows()]
    docs = [d for d in docs if d]

    result: dict[str, Any] = {
        "filename": filename, "rows": len(df), "columns": len(columns),
        "valid_docs": len(docs), "unknown_columns": unknown, "dry_run": dry_run,
    }

    if dry_run:
        result["sample"] = docs[:3]
        return result

    ops = [UpdateOne({"id": d["id"]}, {"$set": d}, upsert=True) for d in docs]
    added = modified = 0
    for i in range(0, len(ops), 500):
        res = await universities_col.bulk_write(ops[i:i + 500], ordered=False)
        added += res.upserted_count
        modified += res.modified_count

    result.update({"inserted": added, "updated": modified, "total": await universities_col.count_documents({})})
    return result


# --------------------------------------------------------------------------- #
# enrich_from_csv  --  fuzzy-match and update from a sparse third-party CSV
# --------------------------------------------------------------------------- #

COLUMN_CANDIDATES: dict[str, list[str]] = {
    "name": ["institution name", "institution", "university", "name", "school"],
    "country_name": ["country_name", "country/territory", "country", "location", "territory"],
    "rank": ["2026 rank", "2025 rank", "rank", "world rank", "ranking", "rank_display"],
    "qs_rank": ["qs rank", "qs_rank", "qs world rank"],
    "times_rank": ["the rank", "times rank", "times_rank", "the_rank"],
    "type": ["type", "institution type", "control"],
    "established": ["established", "founded", "year founded", "founding year"],
    "students": ["students", "total students", "enrollment", "student population"],
    "intl_students": ["intl_students", "international students", "intl students"],
    "tuition_usd": ["tuition_usd", "tuition", "tuition fee", "annual tuition", "fees_usd"],
    "living_cost_usd": ["living_cost_usd", "living cost", "cost of living"],
    "scholarships": ["scholarships", "scholarship", "scholarship_available"],
    "courses": ["courses", "programs", "programmes", "fields"],
    "popular_courses": ["popular_courses", "popular courses", "top courses"],
    "intakes": ["intakes", "intake", "intake months"],
    "ielts_min": ["ielts_min", "ielts", "min ielts"],
    "toefl_min": ["toefl_min", "toefl", "min toefl"],
    "acceptance_rate": ["acceptance_rate", "acceptance rate", "admit rate"],
    "employment_rate": ["employment_rate", "employment rate", "graduate employment"],
    "avg_salary_usd": ["avg_salary_usd", "avg salary", "average salary", "median salary"],
    "accreditation": ["accreditation", "accreditations", "accredited by"],
    "facilities": ["facilities", "amenities"],
}

_ENRICH_COERCE = {
    "rank": lambda v: _enrich_int(v), "qs_rank": lambda v: _enrich_int(v),
    "times_rank": lambda v: _enrich_int(v),
    "type": _to_str, "established": lambda v: _enrich_int(v),
    "students": lambda v: _enrich_int(v), "intl_students": lambda v: _enrich_int(v),
    "tuition_usd": lambda v: _enrich_int(v), "living_cost_usd": lambda v: _enrich_int(v),
    "avg_salary_usd": lambda v: _enrich_int(v),
    "ielts_min": lambda v: _enrich_float(v), "toefl_min": lambda v: _enrich_int(v),
    "scholarships": _to_bool,
    "acceptance_rate": _to_str, "employment_rate": _to_str,
    "courses": _enrich_list, "popular_courses": _enrich_list,
    "intakes": _enrich_list, "accreditation": _enrich_list, "facilities": _enrich_list,
}

def _enrich_int(v: Any) -> int | None:
    m = re.search(r"\d+", str(v).replace(",", ""))
    return int(m.group()) if m else None

def _enrich_float(v: Any) -> float | None:
    s = re.sub(r"[^\d.]", "", str(v))
    try:
        return float(s) if s else None
    except ValueError:
        return None

def _enrich_list(v: Any) -> list[str] | None:
    parts = [p.strip() for p in re.split(r"[;|,]", str(v)) if p.strip()]
    return parts or None

COUNTRY_ALIASES = {
    "usa": "united states", "us": "united states", "u.s.": "united states",
    "u.s.a.": "united states", "united states of america": "united states",
    "uk": "united kingdom", "u.k.": "united kingdom", "great britain": "united kingdom",
    "uae": "united arab emirates", "south korea": "korea, republic of",
    "russia": "russian federation", "turkey": "turkiye",
}

_ENRICH_INS_DEFAULTS = {
    "short_name": "", "flag": "\U0001F3F3", "qs_rank": 9999, "times_rank": 9999,
    "type": "", "established": 0, "students": 0, "intl_students": 0,
    "tuition_usd": 0, "living_cost_usd": 0, "scholarships": False,
    "courses": [], "popular_courses": [], "intakes": ["Sep", "Jan"],
    "gre_required": False, "gmat_required": False,
    "ielts_min": 6.5, "toefl_min": 80,
    "acceptance_rate": "N/A", "employment_rate": "N/A", "avg_salary_usd": 0,
    "website": "", "location": "", "description": "",
    "accreditation": [], "facilities": [],
}

def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))

def _clean_name(s: str) -> str:
    s = _strip_accents(str(s).lower()).replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def _country_key(s: str) -> str:
    k = _strip_accents(str(s).lower()).strip().strip(".")
    return COUNTRY_ALIASES.get(re.sub(r"\s+", " ", k), re.sub(r"\s+", " ", k))

def _detect_columns(df: pd.DataFrame, overrides: dict[str, str]) -> dict[str, str]:
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
    for field, col in overrides.items():
        mapping.setdefault(field, col)
    return mapping

def _build_index(docs: list[dict]) -> tuple[dict[str, list], list[str], list[dict]]:
    by_country: dict[str, list] = {}
    all_names: list[str] = []
    all_docs: list[dict] = []
    for d in docs:
        cn = _clean_name(d.get("name", ""))
        if not cn:
            continue
        ck = _country_key(d.get("country_name") or d.get("country") or "")
        by_country.setdefault(ck, []).append((cn, d))
        all_names.append(cn)
        all_docs.append(d)
    return by_country, all_names, all_docs

def _match_one(name: str, ck: str, by_country, all_names, all_docs, threshold: int):
    target = _clean_name(name)
    bucket = by_country.get(ck)
    if bucket:
        choices = [c for c, _ in bucket]
        res = process.extractOne(target, choices, scorer=fuzz.WRatio, score_cutoff=threshold)
        if res:
            return bucket[res[2]][1], res[1], "country"
        res2 = process.extractOne(target, choices, scorer=fuzz.WRatio)
        best = res2[1] if res2 else 0.0
    else:
        best = 0.0
    res = process.extractOne(target, all_names, scorer=fuzz.WRatio, score_cutoff=threshold + 6)
    if res:
        return all_docs[res[2]], res[1], "global"
    return None, best, "none"

async def enrich_from_csv_bytes(
    csv_data: bytes, filename: str, *,
    threshold: int = 88, insert_missing: bool = False,
    dry_run: bool = False, column_overrides: dict[str, str] | None = None,
) -> dict:
    overrides = column_overrides or {}
    df = pd.read_csv(io.BytesIO(csv_data), dtype=str, keep_default_na=False)
    colmap = _detect_columns(df, overrides)

    if "name" not in colmap:
        return {"error": "Could not find a university-name column. Use column_overrides."}

    enrich_fields = [f for f in _ENRICH_COERCE if f in colmap]

    docs = await universities_col.find(
        {}, {"id": 1, "name": 1, "country": 1, "country_name": 1}
    ).to_list(length=None)
    by_country, all_names, all_docs = _build_index(docs)

    ops: list[UpdateOne] = []
    n_updated = n_inserted = n_low = n_nomatch = 0

    for _, row in df.iterrows():
        csv_name = str(row[colmap["name"]]).strip()
        if not csv_name:
            continue
        csv_country = str(row[colmap.get("country_name", "")]).strip() if "country_name" in colmap else ""
        ck = _country_key(csv_country)

        doc, score, _scope = _match_one(csv_name, ck, by_country, all_names, all_docs, threshold)

        payload: dict[str, Any] = {}
        for f in enrich_fields:
            val = _ENRICH_COERCE[f](row[colmap[f]])
            if val is not None:
                payload[f] = val

        if doc:
            n_updated += 1
            if not dry_run and payload:
                ops.append(UpdateOne({"id": doc["id"]}, {"$set": payload}))
        elif insert_missing and score < threshold:
            n_inserted += 1
            if not dry_run:
                slug = _slugify(csv_name, csv_country)
                new_doc = {**_ENRICH_INS_DEFAULTS, "id": slug, "name": csv_name,
                           "country": "", "country_name": csv_country,
                           "location": csv_country,
                           "description": f"{csv_name} is a university located in {csv_country}.",
                           "rank": 9999, **payload}
                ops.append(UpdateOne({"id": slug}, {"$setOnInsert": new_doc}, upsert=True))
        elif score > 0:
            n_low += 1
        else:
            n_nomatch += 1

    if not dry_run and ops:
        for i in range(0, len(ops), 500):
            await universities_col.bulk_write(ops[i:i + 500], ordered=False)

    return {
        "filename": filename, "rows": len(df),
        "enrich_fields": enrich_fields,
        "updated": n_updated, "inserted": n_inserted,
        "skipped_low_score": n_low, "skipped_no_match": n_nomatch,
        "total": await universities_col.count_documents({}),
        "dry_run": dry_run,
    }


# --------------------------------------------------------------------------- #
# enrich_scorecard  --  US tuition/admission/earnings from College Scorecard
# --------------------------------------------------------------------------- #

SCORECARD_FIELDS = [
    "id", "school.name", "school.state", "school.city", "school.ownership",
    "school.school_url", "latest.cost.tuition.out_of_state",
    "latest.cost.tuition.in_state", "latest.cost.attendance.academic_year",
    "latest.admissions.admission_rate.overall", "latest.student.size",
    "latest.earnings.10_yrs_after_entry.median",
]

OWNERSHIP = {1: "Public", 2: "Private (non-profit)", 3: "Private (for-profit)"}

_SC_INS_DEFAULTS = {
    "short_name": "", "flag": "\U0001F1FA\U0001F1F8", "rank": 9999, "qs_rank": 9999, "times_rank": 9999,
    "type": "", "established": 0, "students": 0, "intl_students": 0,
    "tuition_usd": 0, "living_cost_usd": 0, "scholarships": False,
    "courses": [], "popular_courses": [], "intakes": ["Sep", "Jan"],
    "gre_required": False, "gmat_required": False,
    "ielts_min": 6.5, "toefl_min": 80,
    "acceptance_rate": "N/A", "employment_rate": "N/A", "avg_salary_usd": 0,
    "website": "", "location": "", "description": "",
    "accreditation": [], "facilities": [],
}

def _sc_int(v: Any) -> int | None:
    try:
        return int(round(float(v))) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None

def _map_scorecard_row(raw: dict) -> tuple[str, dict]:
    name = (raw.get("school.name") or "").strip()
    payload: dict[str, Any] = {}
    tuition = _sc_int(raw.get("latest.cost.tuition.out_of_state"))
    if tuition:
        payload["tuition_usd"] = tuition
    aoy = _sc_int(raw.get("latest.cost.attendance.academic_year"))
    if aoy and tuition and aoy > tuition:
        payload["living_cost_usd"] = aoy - tuition
    rate = raw.get("latest.admissions.admission_rate.overall")
    if isinstance(rate, (int, float)) and rate > 0:
        payload["acceptance_rate"] = f"{round(rate * 100, 1)}%"
    size = _sc_int(raw.get("latest.student.size"))
    if size:
        payload["students"] = size
    salary = _sc_int(raw.get("latest.earnings.10_yrs_after_entry.median"))
    if salary:
        payload["avg_salary_usd"] = salary
    own = raw.get("school.ownership")
    if own in OWNERSHIP:
        payload["type"] = OWNERSHIP[own]
    url = (raw.get("school.school_url") or "").strip()
    if url:
        payload["website"] = url if url.startswith("http") else f"https://{url}"
    return name, payload

async def enrich_scorecard(
    api_key: str | None = None, *,
    threshold: int = 88, insert_missing: bool = False, dry_run: bool = False,
) -> dict:
    key = api_key or os.environ.get("SCORECARD_API_KEY", "DEMO_KEY")

    # fetch
    raw_rows: list[dict] = []
    page = 0
    total: int | None = None
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        while page < 200:
            params = {
                "api_key": key,
                "fields": ",".join(SCORECARD_FIELDS),
                "per_page": 100,
                "page": page,
                "school.operating": 1,
                "school.degrees_awarded.predominant__range": "3..4",
            }
            resp = await client.get("https://api.data.gov/ed/collegescorecard/v1/schools", params=params)
            if resp.status_code == 429:
                return {"error": "Rate limited. Set SCORECARD_API_KEY to your own key."}
            resp.raise_for_status()
            payload = resp.json()
            batch = payload.get("results", [])
            raw_rows.extend(batch)
            meta = payload.get("metadata", {})
            total = meta.get("total", total)
            if total is not None and len(raw_rows) >= total:
                break
            if not batch:
                break
            page += 1

    if not raw_rows:
        return {"error": "No data returned from College Scorecard API."}

    # load existing docs
    docs = await universities_col.find(
        {}, {"id": 1, "name": 1, "country": 1, "country_name": 1}
    ).to_list(length=None)

    # US-only fuzzy index
    us_bucket: list[tuple[str, dict]] = []
    for d in docs:
        ck = _country_key(d.get("country_name") or d.get("country") or "")
        if ck in ("united states", "usa", "us"):
            cn = _clean_name(d.get("name", ""))
            if cn:
                us_bucket.append((cn, d))
    us_choices = [c for c, _ in us_bucket]

    ops: list[UpdateOne] = []
    n_updated = n_inserted = n_low = n_skip = 0

    for raw in raw_rows:
        name, payload = _map_scorecard_row(raw)
        if not name or not payload:
            n_skip += 1
            continue

        target = _clean_name(name)
        if us_choices:
            res = process.extractOne(target, us_choices, scorer=fuzz.WRatio, score_cutoff=threshold)
            if res:
                doc = us_bucket[res[2]][1]
                n_updated += 1
                if not dry_run:
                    ops.append(UpdateOne({"id": doc["id"]}, {"$set": payload}))
                continue

        if insert_missing:
            n_inserted += 1
            if not dry_run:
                slug = _slugify(name, "united states")
                loc = ", ".join(filter(None, [raw.get("school.city"), raw.get("school.state")]))
                new_doc = {
                    **_SC_INS_DEFAULTS, "id": slug, "name": name,
                    "country": "us", "country_name": "United States",
                    "location": loc,
                    "description": f"{name} is a university located in the United States.",
                    **payload,
                }
                ops.append(UpdateOne({"id": slug}, {"$setOnInsert": new_doc}, upsert=True))
        else:
            n_low += 1

    if not dry_run and ops:
        for i in range(0, len(ops), 500):
            await universities_col.bulk_write(ops[i:i + 500], ordered=False)

    return {
        "fetched": len(raw_rows),
        "updated": n_updated,
        "inserted": n_inserted,
        "unmatched": n_low,
        "no_data": n_skip,
        "total": await universities_col.count_documents({}),
        "dry_run": dry_run,
    }
