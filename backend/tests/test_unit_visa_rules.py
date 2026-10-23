"""Visa requirements and decision times per destination (visa_rules) and the
countries API correction. No network, no real DB."""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

import pytest  # noqa: E402

import visa_rules as vr  # noqa: E402

CACHE = Path(__file__).resolve().parent.parent / ".countries_cache.json"


def test_every_country_and_territory_has_a_confirmed_rule():
    raw = json.loads(CACHE.read_text())
    unconfirmed = [r["cca2"] for r in raw
                   if "not confirmed" in (vr.processing(r["cca2"])["note"] or "")]
    assert unconfirmed == []


@pytest.mark.parametrize("iso2,requirement", [
    ("PK", "restricted"), ("IR", "evisa"), ("UZ", "evisa"), ("ID", "evisa_or_on_arrival"),
    ("TH", "visa_free"), ("MY", "visa_free"), ("NP", "visa_free"), ("US", "visa"), ("AU", "visa"),
    ("JP", "evisa"), ("CV", "on_arrival"), ("IN", "not_applicable"),
])
def test_requirements_for_indian_passports(iso2, requirement):
    assert vr.processing(iso2)["requirement"] == requirement


def test_schengen_uses_eu_law_and_aland_follows_finland():
    for iso2 in ("FR", "DE", "AX", "MC"):
        t = vr.processing(iso2)["time"]
        assert (t["basis"], t["min_days"], t["max_days"]) == ("law", 15, 45)
        assert t["source_url"].startswith("https://mzv.gov.cz/")
    aland = vr.processing("AX")
    assert aland["parent"] == "FI" and "Finland" in aland["note"]


def test_territories_use_their_parents_visa():
    assert vr.processing("PR")["parent"] == "US"
    reunion = vr.processing("RE")
    assert reunion["schengen"] is False and "France" in reunion["note"]


def test_no_wait_shown_where_nothing_to_wait_for():
    for iso2 in ("TH", "CV", "PK", "AQ"):
        assert vr.processing(iso2)["time"] is None


def test_estimates_are_labelled_and_official_wins():
    est = vr.processing("CN")["time"]
    assert est["basis"] == "estimate" and est["label"] == "4–10 days"
    official = {"min_days": 29, "max_days": 29, "label": "29 days", "metric": "processing_time",
                "source_name": "IRCC, Government of Canada", "source_url": "https://x", "updated": "October 21, 2026"}
    t = vr.processing("CA", official)["time"]
    assert t["basis"] == "official" and t["label"] == "29 days" and t["short"] == "29 days"


def test_apply_fixes_flags_but_respects_admin_edits():
    doc = {"id": "pk", "iso2": "PK", "no_visa": True, "visa_required": False,
           "delivery": {"standard_days": 0, "rush_days": 0, "same_day": True}}
    out = vr.apply(doc)
    assert out["no_visa"] is False and out["visa_required"] is True
    edited = vr.apply({**doc, "admin_overrides": ["no_visa", "delivery"]})
    assert edited["no_visa"] is True and edited["delivery"]["same_day"] is True


def test_range_labels():
    assert vr._range_label(14, 28) == "2–4 weeks"
    assert vr._range_label(3, 7) == "3–7 days"
    assert vr._range_label(0, 1) == "Within 1 day"
    assert vr._range_label(21, 21) == "3 weeks"


def test_countries_api_returns_corrected_data():
    from unittest.mock import AsyncMock, patch
    from fastapi.testclient import TestClient
    import routes_countries
    from server import app
    stored = {"id": "pk", "iso2": "PK", "name": "Pakistan", "no_visa": True, "visa_required": False,
              "delivery": {"standard_days": 0}, "fees_usd": 0}
    with patch.object(routes_countries, "_get_one", new=AsyncMock(return_value=stored)), \
         patch.object(vr, "load_official", new=AsyncMock(return_value=None)):
        r = TestClient(app).get("/api/countries/pk")
    body = r.json()
    assert body["no_visa"] is False and body["processing"]["requirement"] == "restricted"


# ---------------------------------------------------------------- applicant rules

def _texts(rules, basis):
    return [r["text"] for r in rules if r["basis"] == basis]


def test_schengen_rules_rest_on_eu_law():
    rules = vr.applicant_rules("FR")
    law = _texts(rules, "law")
    assert any("€30,000" in t for t in law) and any("90 days in any 180" in t for t in law)
    assert all(r["source_url"] == vr.EU_VISA_CODE[1] for r in rules if r["basis"] == "law")
    assert vr.applicant_rules("AX") == rules  # Åland follows Finland: same Schengen rules
    assert not _texts(rules, "official")


def test_official_rules_for_us_uk_canada():
    assert any("DS-160" in t for t in _texts(vr.applicant_rules("US"), "official"))
    assert any("TB test" in t for t in _texts(vr.applicant_rules("GB"), "official"))
    assert any("biometrics" in t for t in _texts(vr.applicant_rules("CA"), "official"))
    assert any("DS-160" in t for t in _texts(vr.applicant_rules("GU"), "official"))  # US territory


def test_agent_details_come_first_and_restricted_has_none():
    rules = vr.applicant_rules("TH", {"allowed_stay": "60 days", "notes": "Proof of funds may be asked."})
    assert rules[0] == {"text": "Allowed stay: 60 days.", "basis": "source",
                        "source_name": vr.REQUIREMENTS_SOURCE[0], "source_url": vr.REQUIREMENTS_SOURCE[1]}
    assert rules[1]["text"] == "Proof of funds may be asked."
    assert any("return ticket" in t for t in _texts(rules, "guidance"))
    assert vr.applicant_rules("PK") == [] and vr.applicant_rules("IN") == []
