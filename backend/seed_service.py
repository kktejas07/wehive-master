"""Reusable async functions for university CSV seeding and Scorecard enrichment."""
from __future__ import annotations

import io
import json
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


def _to_int(v: Any) -> int:
    s = str(v).replace(",", ""); m = re.search(r"-?\d+", s)
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
    if not name: return None
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
    result: dict[str, Any] = {"filename": filename, "rows": len(df), "columns": len(columns),
        "valid_docs": len(docs), "unknown_columns": unknown, "dry_run": dry_run}
    if dry_run:
        result["sample"] = docs[:3]
        return result
    ops = [UpdateOne({"id": d["id"]}, {"$set": d}, upsert=True) for d in docs]
    added = modified = 0
    for i in range(0, len(ops), 500):
        res = await universities_col.bulk_write(ops[i:i + 500], ordered=False)
        added += res.upserted_count; modified += res.modified_count
    result.update({"inserted": added, "updated": modified,
        "total": await universities_col.count_documents({})})
    return result


# ── enrich_from_csv ──
COLUMN_CANDIDATES: dict[str, list[str]] = {
    "name": ["institution name", "institution", "university", "name", "school"],
    "country_name": ["country_name", "country", "location", "territory"],
    "rank": ["rank", "world rank", "ranking", "rank_display"],
    "qs_rank": ["qs rank", "qs_rank", "qs world rank"],
    "times_rank": ["the rank", "times rank"],
    "tuition_usd": ["tuition_usd", "tuition", "tuition fee", "fees_usd"],
    "scholarships": ["scholarships", "scholarship", "scholarship_available"],
    "courses": ["courses", "programs", "fields"],
    "popular_courses": ["popular_courses", "popular courses", "top courses"],
    "ielts_min": ["ielts_min", "ielts", "min ielts"],
    "acceptance_rate": ["acceptance_rate", "acceptance rate"],
}

def _eint(v): m = re.search(r"\d+", str(v).replace(",", "")); return int(m.group()) if m else None
def _efloat(v): s = re.sub(r"[^\d.]", "", str(v)); return float(s) if s else None
def _elist(v): p = [x.strip() for x in re.split(r"[;|,]", str(v)) if x.strip()]; return p or None

_ENRICH_COERCE = {
    "rank": lambda v: _eint(v), "qs_rank": lambda v: _eint(v), "times_rank": lambda v: _eint(v),
    "type": _to_str, "students": lambda v: _eint(v), "intl_students": lambda v: _eint(v),
    "tuition_usd": lambda v: _eint(v), "living_cost_usd": lambda v: _eint(v),
    "avg_salary_usd": lambda v: _eint(v), "established": lambda v: _eint(v),
    "ielts_min": lambda v: _efloat(v), "toefl_min": lambda v: _eint(v),
    "scholarships": _to_bool,
    "acceptance_rate": _to_str, "employment_rate": _to_str,
    "courses": _elist, "popular_courses": _elist, "intakes": _elist,
    "accreditation": _elist, "facilities": _elist,
}

COUNTRY_ALIASES = {"usa": "united states", "us": "united states", "uk": "united kingdom",
    "uae": "united arab emirates", "south korea": "korea, republic of"}
_ENRICH_INS = {"short_name": "", "flag": "\U0001F3F3", "qs_rank": 9999, "times_rank": 9999,
    "type": "", "established": 0, "students": 0, "intl_students": 0, "tuition_usd": 0,
    "living_cost_usd": 0, "scholarships": False, "courses": [], "popular_courses": [],
    "intakes": ["Sep", "Jan"], "gre_required": False, "gmat_required": False,
    "ielts_min": 6.5, "toefl_min": 80, "acceptance_rate": "N/A", "employment_rate": "N/A",
    "avg_salary_usd": 0, "website": "", "location": "", "description": "",
    "accreditation": [], "facilities": []}

def _sacc(s): return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
def _cname(s): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", _sacc(str(s).lower()).replace("&", " and ").replace(r"\(.*?\)", " "))).strip()
def _ckey(s): return COUNTRY_ALIASES.get((k := re.sub(r"\s+", " ", _sacc(str(s).lower()).strip().strip("."))), k)

def _detect_cols(df, overrides):
    low2act = {str(c).strip().lower(): c for c in df.columns}
    m = {}
    for field, cands in COLUMN_CANDIDATES.items():
        if field in overrides: m[field] = overrides[field]; continue
        for c in cands:
            if c in low2act: m[field] = low2act[c]; break
    for f, c in overrides.items(): m.setdefault(f, c)
    return m

def _build_idx(docs):
    by_c, an, ad = {}, [], []
    for d in docs:
        cn = _cname(d.get("name", ""))
        if not cn: continue
        by_c.setdefault(_ckey(d.get("country_name") or d.get("country") or ""), []).append((cn, d))
        an.append(cn); ad.append(d)
    return by_c, an, ad

def _match_one(name, ck, by_c, an, ad, thresh):
    target = _cname(name)
    bucket = by_c.get(ck)
    if bucket:
        choices = [c for c, _ in bucket]
        r = process.extractOne(target, choices, scorer=fuzz.WRatio, score_cutoff=thresh)
        if r: return bucket[r[2]][1], r[1], "country"
    r = process.extractOne(target, an, scorer=fuzz.WRatio, score_cutoff=thresh + 6)
    if r: return ad[r[2]], r[1], "global"
    return None, 0, "none"

async def enrich_from_csv_bytes(csv_data: bytes, filename: str, *, threshold: int = 88,
    insert_missing: bool = False, dry_run: bool = False, column_overrides: dict[str, str] | None = None) -> dict:
    overrides = column_overrides or {}
    df = pd.read_csv(io.BytesIO(csv_data), dtype=str, keep_default_na=False)
    colmap = _detect_cols(df, overrides)
    if "name" not in colmap: return {"error": "Could not find a university-name column."}
    enrich_fields = [f for f in _ENRICH_COERCE if f in colmap]
    docs = await universities_col.find({}, {"id": 1, "name": 1, "country": 1, "country_name": 1}).to_list(length=None)
    by_c, an, ad = _build_idx(docs)
    ops, n_upd, n_ins, n_low, n_nom = [], 0, 0, 0, 0
    for _, row in df.iterrows():
        csv_name = str(row[colmap["name"]]).strip()
        if not csv_name: continue
        csv_country = str(row[colmap.get("country_name", "")]).strip() if "country_name" in colmap else ""
        ck = _ckey(csv_country)
        doc, score, _ = _match_one(csv_name, ck, by_c, an, ad, threshold)
        payload = {f: _ENRICH_COERCE[f](row[colmap[f]]) for f in enrich_fields if _ENRICH_COERCE[f](row[colmap[f]]) is not None}
        if doc:
            n_upd += 1
            if not dry_run and payload: ops.append(UpdateOne({"id": doc["id"]}, {"$set": payload}))
        elif insert_missing and score < threshold:
            n_ins += 1
            if not dry_run:
                slug = _slugify(csv_name, csv_country)
                ops.append(UpdateOne({"id": slug}, {"$setOnInsert": {**_ENRICH_INS, "id": slug, "name": csv_name,
                    "country": "", "country_name": csv_country, "description": f"{csv_name} is a university located in {csv_country}.", **payload}}, upsert=True))
        elif score > 0: n_low += 1
        else: n_nom += 1
    if not dry_run and ops:
        for i in range(0, len(ops), 500): await universities_col.bulk_write(ops[i:i+500], ordered=False)
    return {"filename": filename, "rows": len(df), "enrich_fields": enrich_fields, "updated": n_upd,
        "inserted": n_ins, "skipped_low_score": n_low, "skipped_no_match": n_nom,
        "total": await universities_col.count_documents({}), "dry_run": dry_run}


# ── enrich_scorecard ──
SC_FIELDS = ["id","school.name","school.state","school.city","school.ownership","school.school_url",
    "latest.cost.tuition.out_of_state","latest.cost.attendance.academic_year",
    "latest.admissions.admission_rate.overall","latest.student.size","latest.earnings.10_yrs_after_entry.median"]
OWNERSHIP = {1: "Public", 2: "Private (non-profit)", 3: "Private (for-profit)"}
_SC_INS = {"short_name":"","flag":"\U0001F1FA\U0001F1F8","rank":9999,"qs_rank":9999,"times_rank":9999,"type":"",
    "established":0,"students":0,"intl_students":0,"tuition_usd":0,"living_cost_usd":0,"scholarships":False,
    "courses":[],"popular_courses":[],"intakes":["Sep","Jan"],"gre_required":False,"gmat_required":False,
    "ielts_min":6.5,"toefl_min":80,"acceptance_rate":"N/A","employment_rate":"N/A","avg_salary_usd":0,
    "website":"","location":"","description":"","accreditation":[],"facilities":[]}

def _sci(v):
    try: return int(round(float(v))) if v not in (None, "") else None
    except: return None

def _map_sc(row):
    name = (row.get("school.name") or "").strip()
    p = {}
    t = _sci(row.get("latest.cost.tuition.out_of_state"))
    if t: p["tuition_usd"] = t
    a = _sci(row.get("latest.cost.attendance.academic_year"))
    if a and t and a > t: p["living_cost_usd"] = a - t
    r = row.get("latest.admissions.admission_rate.overall")
    if isinstance(r, (int, float)) and r > 0: p["acceptance_rate"] = f"{round(r*100,1)}%"
    sz = _sci(row.get("latest.student.size"))
    if sz: p["students"] = sz
    sa = _sci(row.get("latest.earnings.10_yrs_after_entry.median"))
    if sa: p["avg_salary_usd"] = sa
    ow = row.get("school.ownership")
    if ow in OWNERSHIP: p["type"] = OWNERSHIP[ow]
    url = (row.get("school.school_url") or "").strip()
    if url: p["website"] = url if url.startswith("http") else f"https://{url}"
    return name, p

async def enrich_scorecard(api_key: str | None = None, *, threshold: int = 88,
    insert_missing: bool = False, dry_run: bool = False) -> dict:
    key = api_key or os.environ.get("SCORECARD_API_KEY", "DEMO_KEY")
    raw_rows, page, total = [], 0, None
    async with httpx.AsyncClient(timeout=60) as client:
        while page < 200:
            params = {"api_key": key, "fields": ",".join(SC_FIELDS), "per_page": 100, "page": page,
                "school.operating": 1, "school.degrees_awarded.predominant__range": "3..4"}
            resp = await client.get("https://api.data.gov/ed/collegescorecard/v1/schools", params=params)
            if resp.status_code == 429: return {"error": "Rate limited."}
            resp.raise_for_status()
            payload = resp.json(); batch = payload.get("results", [])
            raw_rows.extend(batch)
            meta = payload.get("metadata", {}); total = meta.get("total", total)
            if (total and len(raw_rows) >= total) or not batch: break
            page += 1
    if not raw_rows: return {"error": "No data from Scorecard."}
    docs = await universities_col.find({},{"id":1,"name":1,"country":1,"country_name":1}).to_list(length=None)
    us_bucket = []
    _us_keys = {"united states", "usa", "us"}
    for d in docs:
        ck = _ckey(d.get("country_name") or d.get("country") or "")
        if ck in _us_keys:
            cn = _cname(d.get("name", ""))
            if cn: us_bucket.append((cn, d))
    us_choices = [c for c,_ in us_bucket]
    ops, n_upd, n_ins, n_low, n_skip = [], 0, 0, 0, 0
    for raw in raw_rows:
        name, payload = _map_sc(raw)
        if not name or not payload: n_skip += 1; continue
        target = _cname(name)
        if us_choices:
            r = process.extractOne(target, us_choices, scorer=fuzz.WRatio, score_cutoff=threshold)
            if r:
                n_upd += 1
                if not dry_run: ops.append(UpdateOne({"id": us_bucket[r[2]][1]["id"]}, {"$set": payload}))
                continue
        if insert_missing:
            n_ins += 1
            if not dry_run:
                slug = _slugify(name, "united states")
                loc = ", ".join(filter(None, [raw.get("school.city"), raw.get("school.state")]))
                ops.append(UpdateOne({"id": slug}, {"$setOnInsert": {**_SC_INS, "id": slug, "name": name,
                    "country": "us", "country_name": "United States", "location": loc, **payload}}, upsert=True))
        else: n_low += 1
    if not dry_run and ops:
        for i in range(0, len(ops), 500): await universities_col.bulk_write(ops[i:i+500], ordered=False)
    return {"fetched": len(raw_rows), "updated": n_upd, "inserted": n_ins, "unmatched": n_low,
        "no_data": n_skip, "total": await universities_col.count_documents({}), "dry_run": dry_run}
