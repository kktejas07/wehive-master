"""Visa rules and decision times for Indian passport holders, per destination.

One place for what the site tells people about each country:
- requirement: visa_free | on_arrival | evisa | evisa_or_on_arrival | visa | restricted | not_applicable
- time: how long a decision takes, and what that figure rests on:
    official  - published by that government (US, Canada, UK, Ireland; see official_times.py)
    law       - Schengen: EU Visa Code art. 23, 15 calendar days, extendable to 45
    estimate  - WeHive's typical range where no official figure is published

Requirements were checked against "Visa requirements for Indian citizens"
(Wikipedia, 24 Oct 2026) and recent changes (e.g. Iran suspended visa-free entry
for Indians on 22 Nov 2025). Territories follow the country whose visa they use.
Nothing here is a guarantee: the embassy decides.
"""
from __future__ import annotations

from typing import Optional

CHECKED_ON = "24 Oct 2026"
REQUIREMENTS_SOURCE = ("Visa requirements for Indian citizens",
                       "https://en.wikipedia.org/wiki/Visa_requirements_for_Indian_citizens")
SCHENGEN_SOURCE = ("EU Visa Code, art. 23 (Czech Consulate General, Mumbai)",
                   "https://mzv.gov.cz/mumbai/en/consular_information/visa_decision/index.html")

F, A, E, EA, V, R, NA = "visa_free", "on_arrival", "evisa", "evisa_or_on_arrival", "visa", "restricted", "not_applicable"

REQUIREMENT_LABELS = {
    F: "No visa needed", A: "Visa on arrival", E: "Apply online (eVisa)",
    EA: "eVisa, or visa on arrival", V: "Visa required (apply before travel)",
    R: "Entry restricted for Indian citizens", NA: "Special permit only",
}

# ISO-2 -> requirement for Indian passport holders.
REQUIREMENTS = {
    "AF": E, "AL": E, "DZ": V, "AD": V, "AO": F, "AG": E, "AR": V, "AM": E, "AU": V, "AT": V,
    "AZ": E, "BS": E, "BH": EA, "BD": V, "BB": F, "BY": E, "BE": V, "BZ": V, "BJ": E, "BT": F,
    "BO": V, "BA": V, "BW": E, "BR": V, "BN": V, "BG": V, "BF": E, "BI": EA, "KH": EA, "CM": E,
    "CA": V, "CV": A, "CF": V, "TD": E, "CL": V, "CN": V, "CO": E, "KM": A, "CG": V, "CD": E,
    "CR": V, "CI": E, "HR": V, "CU": E, "CY": V, "CZ": V, "DK": V, "DJ": E, "DM": F, "DO": V,
    "TL": A, "EC": E, "EG": E, "SV": V, "GQ": E, "ER": V, "EE": V, "SZ": V, "ET": EA, "FJ": F,
    "FI": V, "FR": V, "GA": E, "GM": F, "GE": E, "DE": V, "GH": V, "GR": V, "GD": F, "GT": V,
    "GN": E, "GW": A, "GY": V, "HT": F, "HN": V, "HU": V, "IS": V, "ID": EA, "IR": E, "IQ": E,
    "IE": V, "IL": E, "IT": V, "JM": F, "JP": E, "JO": EA, "KZ": F, "KE": E, "KI": F, "KP": V,
    "KR": V, "KW": V, "KG": E, "LA": EA, "LV": V, "LB": V, "LS": V, "LR": E, "LY": E, "LI": V,
    "LT": V, "LU": V, "MG": EA, "MW": E, "MY": F, "MV": F, "ML": V, "MT": V, "MH": A, "MR": E,
    "MU": F, "MX": V, "FM": F, "MD": V, "MC": V, "MN": EA, "ME": V, "MA": E, "MZ": E, "MM": EA,
    "NA": E, "NR": V, "NP": F, "NL": V, "NZ": V, "NI": V, "NE": V, "NG": E, "MK": V, "NO": V,
    "OM": V, "PK": R, "PW": A, "PA": V, "PG": E, "PY": V, "PE": V, "PH": F, "PL": V, "PT": V,
    "QA": F, "RO": V, "RU": E, "RW": F, "KN": E, "LC": A, "VC": F, "WS": A, "SM": V, "ST": E,
    "SA": V, "SN": F, "RS": E, "SC": E, "SL": EA, "SG": V, "SK": V, "SI": V, "SB": V, "SO": E,
    "ZA": E, "SS": E, "ES": V, "LK": E, "SD": V, "SR": E, "SE": V, "CH": V, "SY": E, "TJ": E,
    "TZ": EA, "TH": F, "TG": E, "TO": V, "TT": F, "TN": F, "TR": V, "TM": V, "TV": A, "UG": E,
    "UA": E, "AE": V, "GB": V, "US": V, "UY": V, "UZ": E, "VU": F, "VA": V, "VE": E, "VN": E,
    "YE": V, "ZM": E, "ZW": EA,
    # Not in the main table
    "CK": F, "NU": F, "MO": F, "HK": E, "TW": E, "XK": V,
    "IN": NA,  # home country
}

SCHENGEN = {
    "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IT", "LV",
    "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH",
}
# Not Schengen members, but reached only through the Schengen area on a Schengen visa.
SCHENGEN_ACCESS = {"AD": "FR", "MC": "FR", "SM": "IT", "VA": "IT"}

# Territories: (country whose visa rules apply, note). A requirement here wins over REQUIREMENTS.
TERRITORIES = {
    "AX": ("FI", "Part of Finland: a Schengen visa covers the Åland Islands."),
    "SJ": ("NO", "Reached through mainland Norway, so you need a Schengen visa."),
    "PR": ("US", "US territory: you need a US visa."), "GU": ("US", "US territory: you need a US visa."),
    "VI": ("US", "US territory: you need a US visa."), "AS": ("US", "US territory: you need a US visa."),
    "MP": ("US", "US territory: you need a US visa."), "UM": ("US", "US territory: you need a US visa."),
    "IM": ("GB", "Crown dependency: a UK visa covers it."), "JE": ("GB", "Crown dependency: a UK visa covers it."),
    "GG": ("GB", "Crown dependency: a UK visa covers it."),
    "CX": ("AU", "Australian territory: you need an Australian visa."),
    "CC": ("AU", "Australian territory: you need an Australian visa."),
    "NF": ("AU", "Australian territory: you need an Australian visa."),
    "TK": ("NZ", "New Zealand territory: you need a New Zealand visa."),
    "PS": ("IL", "Entry is through Israel: you need an Israeli eVisa."),
    "EH": ("MA", "Entry is through Morocco: you need a Moroccan eVisa."),
}
# Territories with their own visa (not the parent's Schengen visa): apply to the parent's embassy.
OWN_VISA_TERRITORIES = {
    "GP": "France", "MQ": "France", "GF": "France", "RE": "France", "YT": "France", "MF": "France",
    "BL": "France", "PM": "France", "NC": "France", "PF": "France", "WF": "France",
    "GL": "Denmark", "FO": "Denmark",
    "AW": "the Netherlands", "CW": "the Netherlands", "SX": "the Netherlands", "BQ": "the Netherlands",
    "BM": "the United Kingdom", "GI": "the United Kingdom", "KY": "the United Kingdom", "VG": "the United Kingdom",
    "TC": "the United Kingdom", "AI": "the United Kingdom", "FK": "the United Kingdom", "MS": "the United Kingdom",
    "PN": "the United Kingdom", "SH": "the United Kingdom", "IO": "the United Kingdom",
}
NOT_APPLICABLE = {"AQ", "BV", "HM", "GS", "TF"}

# Typical decision times (calendar days) where no official figure exists: WeHive estimates.
DEFAULT_ESTIMATE = {E: (3, 7), EA: (3, 7), V: (14, 28)}
ESTIMATE_OVERRIDES = {
    "LK": (1, 2), "HK": (0, 1), "KE": (1, 3), "ZA": (1, 3), "JP": (5, 10), "SG": (3, 7),
    "AE": (2, 5), "CN": (4, 10), "TR": (5, 15), "AU": (14, 35), "NZ": (14, 35),
}

# Destinations with a government-published figure (see official_times.py / slot_monitor.py).
OFFICIAL_CORRIDOR = {"US": "usa", "CA": "canada", "GB": "uk", "IE": "ireland"}
OFFICIAL_VISITOR_VISA = {"canada": "visitor_ca", "uk": "visitor_uk", "ireland": "visitor_ie"}


def _range_label(lo: int, hi: int) -> str:
    def fmt(d: int) -> str:
        if d >= 56 and d % 30 == 0:
            return f"{d // 30} months"
        if d >= 14 and d % 7 == 0:
            return f"{d // 7} weeks"
        return f"{d} day{'s' if d != 1 else ''}"
    if lo == hi:
        return fmt(lo)
    if lo >= 14 and hi >= 14 and lo % 7 == 0 and hi % 7 == 0:
        return f"{lo // 7}–{hi // 7} weeks"
    if lo == 0:
        return f"Within {fmt(hi)}"
    return f"{lo}–{hi} days"


# Requirement changes found by the visa rules agent (agents/visa_rules_agent.py),
# stored in db.visa_rule_overrides and loaded here. They win over REQUIREMENTS.
_OVERRIDES: dict = {}
_OVERRIDES_LOADED_AT: float = 0.0
OVERRIDES_TTL_SECONDS = 600
# Decisions made in code on purpose; the agent never changes these.
PINNED = {"AU", "NZ", "SG", "AE", "TR", "IN"}


async def refresh_overrides(force: bool = False) -> dict:
    """Load agent overrides from the DB (cached for 10 minutes)."""
    import time
    global _OVERRIDES, _OVERRIDES_LOADED_AT
    if not force and time.monotonic() - _OVERRIDES_LOADED_AT < OVERRIDES_TTL_SECONDS:
        return _OVERRIDES
    from db import db
    _OVERRIDES = {d["_id"]: d["requirement"] async for d in db["visa_rule_overrides"].find({})
                  if d.get("requirement") in REQUIREMENT_LABELS}
    _OVERRIDES_LOADED_AT = time.monotonic()
    return _OVERRIDES


def current_requirement(iso2: str) -> Optional[str]:
    return _OVERRIDES.get(iso2) or REQUIREMENTS.get(iso2)


def classify(iso2: str) -> dict:
    """Requirement, Schengen membership, parent and note for a destination (no times)."""
    iso2 = (iso2 or "").upper()
    if iso2 == "IN":
        return {"requirement": NA, "schengen": False, "parent": None, "note": "Your home country: no visa needed."}
    if iso2 in NOT_APPLICABLE:
        return {"requirement": NA, "schengen": False, "parent": None,
                "note": "No regular visitor visa: access is by special permit or expedition only."}
    if iso2 in TERRITORIES:
        parent, note = TERRITORIES[iso2]
        base = classify(parent)
        return {**base, "parent": parent, "note": note}
    if iso2 in OWN_VISA_TERRITORIES:
        return {"requirement": V, "schengen": False, "parent": None,
                "note": f"Has its own visa rules, separate from Schengen: apply through {OWN_VISA_TERRITORIES[iso2]}'s "
                        "embassy. Holders of some US, UK or Schengen visas may be exempt; WeHive will confirm for you."}
    if iso2 in SCHENGEN_ACCESS:
        return {"requirement": V, "schengen": True, "parent": SCHENGEN_ACCESS[iso2],
                "note": "Not in Schengen, but you enter through it: a Schengen visa is what you need."}
    req = current_requirement(iso2)
    if req is None:
        return {"requirement": V, "schengen": False, "parent": None,
                "note": "Requirements not confirmed: WeHive will check before you apply."}
    return {"requirement": req, "schengen": iso2 in SCHENGEN, "parent": None, "note": None}


def processing(iso2: str, official: Optional[dict] = None) -> dict:
    """Everything the country page needs. `official` (from load_official) is
    {"min_days", "max_days", "label", "source_name", "source_url", "updated", "metric"}."""
    info = classify(iso2)
    req = info["requirement"]
    out = {**info, "requirement_label": REQUIREMENT_LABELS[req], "time": None,
           "requirement_source": {"name": REQUIREMENTS_SOURCE[0], "url": REQUIREMENTS_SOURCE[1],
                                  "checked": CHECKED_ON}}
    if req in (F, A, R, NA):
        return out  # nothing to wait for (or nothing to apply for)
    key = (info["parent"] or iso2).upper()
    if official:
        out["time"] = {"short": _range_label(official["min_days"], official["max_days"]), **official, "basis": "official"}
    elif info["schengen"]:
        out["time"] = {"min_days": 15, "max_days": 45, "label": "15 days (can be extended to 45)", "short": "15–45 days",
                       "basis": "law", "metric": "processing_time",
                       "source_name": SCHENGEN_SOURCE[0], "source_url": SCHENGEN_SOURCE[1]}
    else:
        lo, hi = ESTIMATE_OVERRIDES.get(key) or DEFAULT_ESTIMATE[req]
        out["time"] = {"min_days": lo, "max_days": hi, "label": _range_label(lo, hi), "short": _range_label(lo, hi),
                       "basis": "estimate", "metric": "processing_time"}
    return out


async def load_official(iso2: str) -> Optional[dict]:
    """Government figure for the destination's visitor visa, if we hold one."""
    iso2 = (iso2 or "").upper()
    iso2 = TERRITORIES.get(iso2, (iso2, None))[0]
    corridor = OFFICIAL_CORRIDOR.get(iso2)
    if not corridor:
        return None
    from official_times import SOURCES, to_days, to_days_range
    if corridor == "usa":
        from slot_monitor import load_official_wait_times
        data = await load_official_wait_times()
        if not data:
            return None
        values = [v["b1b2"] for v in data["posts"].values() if v.get("b1b2")]
        days = [d for d in (to_days(v) for v in values) if d is not None]
        if not days:
            return None
        lo, hi = round(min(days)), round(max(days))
        return {"min_days": lo, "max_days": hi, "metric": "appointment_wait",
                "label": f"{_range_label(lo, hi)} to the interview, depending on the consulate",
                "source_name": data.get("source_name"), "source_url": data.get("source_url"),
                "updated": data.get("updated")}
    from db import db
    doc = await db["official_processing_times"].find_one({"_id": corridor})
    value = (doc or {}).get("visa", {}).get(OFFICIAL_VISITOR_VISA[corridor])
    if to_days(value) is None:
        return None
    lo, hi = to_days_range(value)
    src = SOURCES[corridor]
    return {"min_days": lo, "max_days": hi, "label": value, "metric": "processing_time",
            "source_name": src["name"], "source_url": src["url"], "updated": doc.get("updated")}


def apply(doc: dict, official: Optional[dict] = None) -> dict:
    """Correct a country document for display: requirement flags and processing.
    Fields an admin set by hand (doc["admin_overrides"]) are left alone."""
    iso2 = doc.get("iso2") or (doc.get("id") or "").upper()
    info = processing(iso2, official)
    locked = set(doc.get("admin_overrides") or [])
    out = dict(doc)
    out["processing"] = info
    if "no_visa" not in locked and "visa_required" not in locked:
        out["no_visa"] = info["requirement"] == F
        out["visa_required"] = info["requirement"] not in (F,)
    if "delivery" not in locked:
        t = info["time"]
        out["delivery"] = {"standard_days": t["max_days"] if t else 0,
                           "rush_days": t["min_days"] if t else 0, "same_day": False}
    return out
