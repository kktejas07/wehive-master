"""Student input -> university filters, and relaxing filters instead of returning nothing."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402

import routes_ai_universities as r  # noqa: E402
import uni_query as q  # noqa: E402


@pytest.mark.parametrize("text,code", [
    ("United Kingdom", "uk"), ("GB", "uk"), ("uk", "uk"), ("England", "uk"), ("USA", "us"),
    ("United States", "us"), ("Germany", "de"), (" de ", "de"), ("", None), (None, None),
])
def test_country_codes_match_how_universities_are_stored(text, code):
    assert q.country_code(text) == code


@pytest.mark.parametrize("text,cat", [
    ("Computer Science", "stem"), ("Data Science", "stem"), ("MBA", "business"), ("Nursing", "medicine"),
    ("Mechanical Engineering", "engineering"), ("Law", "law"), ("Psychology", "social"),
    ("Architecture", "arts"), ("stem", "stem"), ("", None),
])
def test_subjects_map_to_stored_categories(text, cat):
    assert q.course_category(text) == cat


def _col(results_by_call):
    col = MagicMock()
    calls = []

    def find(flt, _proj):
        calls.append(dict(flt))
        cur = MagicMock()
        cur.sort.return_value.to_list = AsyncMock(return_value=results_by_call[len(calls) - 1])
        return cur
    col.find.side_effect = find
    return col, calls


@pytest.mark.asyncio
async def test_relaxes_one_filter_at_a_time_and_says_which():
    col, calls = _col([[], [], [{"id": "x", "name": "X"}]])
    docs, dropped = await q.find_relaxed(col, {"scholarships": True, "courses": {"$in": ["law"]}, "ielts_min": {"$lte": 6}},
                                         ["courses", "ielts_min", "country"])
    assert docs == [{"id": "x", "name": "X"}] and dropped == ["subject", "IELTS score"]
    assert calls[-1] == {"scholarships": True}
    assert q.relaxed_note(dropped) == "No exact matches, so these ignore your subject, IELTS score filters."


@pytest.mark.asyncio
async def test_scholarship_match_no_longer_returns_zero_for_typed_input():
    uni = {"id": "ox", "name": "Oxford", "country": "uk", "courses": ["stem"], "scholarships": True,
           "tuition_usd": 30000, "rank": 3, "ielts_min": 7.0}
    col, calls = _col([[], [uni]])  # exact query misses (IELTS too low), relaxed query finds it
    with patch.object(r, "universities_col", col), \
         patch.object(r.marketplace, "chat", new=AsyncMock(side_effect=RuntimeError("no LLM"))):
        out = await r.scholarship_match(r.ScholarshipProfile(budget=40000, country="United Kingdom",
                                                             field_of_study="Computer Science", ielts_score=6.0))
    assert calls[0]["country"] == "uk" and calls[0]["courses"] == {"$in": ["stem"]}
    assert [m["id"] for m in out["matches"]] == ["ox"] and out["method"] == "rules"
    assert "subject" in out["note"]
