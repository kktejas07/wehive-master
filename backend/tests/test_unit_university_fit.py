"""Rule-based university fit and data-only intake insights (used when no AI model answers)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402

import routes_ai_universities  # noqa: E402
import routes_intakes  # noqa: E402
from university_fit import fit, insights_from_data  # noqa: E402

TUM = {"id": "tum", "name": "Technical University of Munich", "tuition_usd": 0, "ielts_min": 6.5, "rank": 37,
       "courses": ["engineering", "stem"], "scholarships": True}
PRICEY = {"id": "x", "name": "Pricey U", "tuition_usd": 60000, "ielts_min": 7.5, "rank": 900, "courses": ["arts"]}


def test_scores_differ_and_explain_themselves():
    good = fit(TUM, budget=30000, ielts=7.0, courses=["engineering"])
    bad = fit(PRICEY, budget=30000, ielts=7.0, courses=["engineering"])
    assert good["fit_score"] > 80 > 30 > bad["fit_score"]
    assert "Free tuition" in good["strengths"] and "Offers engineering" in good["strengths"]
    assert any("over your budget" in c for c in bad["concerns"]) and any("7.5" in c for c in bad["concerns"])
    assert good["reason"].endswith(".")


def test_no_profile_still_gives_a_reasoned_score():
    r = fit(TUM)
    assert 0 < r["fit_score"] < 100 and r["reason"]


def _cursor(docs):
    cur = MagicMock()
    cur.sort.return_value.to_list = AsyncMock(return_value=docs)
    return cur


@pytest.mark.asyncio
async def test_recommender_without_ai_uses_rules_not_flat_50():
    col = MagicMock()
    col.find.return_value = _cursor([dict(TUM), dict(PRICEY)])
    with patch.object(routes_ai_universities, "universities_col", col), \
         patch.object(routes_ai_universities.marketplace, "chat", new=AsyncMock(return_value="Sorry, I can't help")):
        out = await routes_ai_universities.recommend(routes_ai_universities.RecommenderProfile(
            budget=30000, ielts_score=7.0, preferred_courses=["engineering"]))
    scores = [r["fit_score"] for r in out["recommendations"]]
    assert out["method"] == "rules" and len(set(scores)) == 2 and scores[0] > scores[1]
    assert all(r["reason"] for r in out["recommendations"])


@pytest.mark.asyncio
async def test_scholarship_match_without_ai_returns_matches():
    col = MagicMock()
    col.find.return_value = _cursor([dict(TUM)])
    with patch.object(routes_ai_universities, "universities_col", col), \
         patch.object(routes_ai_universities.marketplace, "chat", new=AsyncMock(side_effect=RuntimeError("no key"))):
        out = await routes_ai_universities.scholarship_match(routes_ai_universities.ScholarshipProfile(ielts_score=7))
    assert len(out["matches"]) == 1 and out["matches"][0]["match_score"] > 50 and out["method"] == "rules"


@pytest.mark.asyncio
async def test_intake_insights_fall_back_to_university_data():
    col = MagicMock()
    col.find_one = AsyncMock(return_value=dict(TUM, intakes=["Oct", "Apr"]))
    with patch("db.universities_col", col), \
         patch.object(routes_intakes.marketplace, "chat", new=AsyncMock(side_effect=RuntimeError("no key"))):
        out = await routes_intakes.get_university_insights("Technical University of Munich", "Germany", "Masters")
    assert out["source"] == "wehive_data" and "Minimum IELTS: 6.5." in out["insights"]
    assert "Oct, Apr" in out["faqs"][0]["a"]
    col.find_one = AsyncMock(return_value=None)
    with patch("db.universities_col", col), \
         patch.object(routes_intakes.marketplace, "chat", new=AsyncMock(return_value="not json")):
        with pytest.raises(HTTPException) as e:
            await routes_intakes.get_university_insights("Nowhere U", "X", "Masters")
    assert e.value.status_code == 404


def test_insights_text_comes_only_from_data():
    out = insights_from_data({"name": "A", "scholarships": False}, "MBA")
    assert out["faqs"][1]["a"].startswith("No scholarships")
