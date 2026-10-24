"""Visa Interview Simulator scoring: AI path, rubric fallback, blank answers. No network."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

import json  # noqa: E402
from unittest.mock import AsyncMock, patch  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routes_interview_score as scoring  # noqa: E402
from auth_utils import get_current_user  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)

STRONG = ("My father, a civil engineer earning 18 lakh a year, is sponsoring me, and I have an "
          "SBI education loan of 25 lakh sanctioned. I also have a 20 percent tuition scholarship "
          "from Arizona State University, so my first year is fully covered.")
WEAK = "Um, I think maybe my parents will pay, I guess."
Q_FUND = "How will you fund your education and living expenses?"


@pytest.fixture(autouse=True)
def _no_rate_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_DISABLED", "1")


@pytest.fixture(autouse=True)
def _signed_in():
    app.dependency_overrides[get_current_user] = lambda: {"_id": "u1"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_scoring_requires_sign_in():
    app.dependency_overrides.pop(get_current_user, None)
    r = client.post("/api/interview/score", json={"items": [{"question": "Why?", "answer": "x"}]})
    assert r.status_code == 401


def test_rubric_is_deterministic_and_rewards_a_better_answer():
    strong = scoring.rubric_score(Q_FUND, STRONG)
    weak = scoring.rubric_score(Q_FUND, WEAK)
    assert strong == scoring.rubric_score(Q_FUND, STRONG)  # no randomness
    assert strong["score"] > weak["score"] + 30
    for c in scoring.CRITERIA:
        assert 0 <= strong[c] <= 25 and 0 <= weak[c] <= 25
    assert strong["score"] == sum(strong[c] for c in scoring.CRITERIA)
    assert weak["confidence"] < strong["confidence"]
    assert strong["feedback"].startswith("Strong answer")
    assert "I think" in weak["feedback"]  # names the actual weakness


def test_skipped_answer_scores_zero():
    s = scoring.rubric_score(Q_FUND, "(skipped)")
    assert s["score"] == 0 and all(s[c] == 0 for c in scoring.CRITERIA)


@patch.object(scoring.marketplace, "chat", new_callable=AsyncMock, side_effect=RuntimeError("no provider"))
def test_falls_back_to_rubric_when_ai_unavailable(_chat):
    r = client.post("/api/interview/score", json={"visa": "US F-1", "items": [
        {"question": Q_FUND, "answer": STRONG}, {"question": Q_FUND, "answer": ""},
    ]})
    assert r.status_code == 200
    data = r.json()
    assert data["method"] == "rubric"
    assert data["items"][1]["score"] == 0
    assert data["total"] == round((data["items"][0]["score"] + 0) / 2)
    assert set(data["criteria"]) == set(scoring.CRITERIA)


@patch.object(scoring.marketplace, "chat", new_callable=AsyncMock)
def test_uses_ai_scores_and_never_credits_blank_answers(chat):
    chat.return_value = "Here you go:\n" + json.dumps({"scores": [
        {"clarity": 22, "specificity": 24, "confidence": 20, "preparation": 23, "feedback": "Strong."},
        {"clarity": 30, "specificity": 10, "confidence": 10, "preparation": 10, "feedback": "?"},
    ]})
    r = client.post("/api/interview/score", json={"items": [
        {"question": Q_FUND, "answer": STRONG}, {"question": "Why this university?", "answer": "  "},
    ]})
    data = r.json()
    assert data["method"] == "ai"
    assert data["items"][0]["score"] == 89 and data["items"][0]["feedback"] == "Strong."
    assert data["items"][1]["score"] == 0  # blank answer overrides whatever the model said
    assert data["criteria"]["clarity"] == round((22 + 0) / 2 * 4)


@patch.object(scoring.marketplace, "chat", new_callable=AsyncMock, return_value='{"scores": [{"clarity": 10}]}')
def test_malformed_ai_reply_falls_back(_chat):
    r = client.post("/api/interview/score", json={"items": [
        {"question": Q_FUND, "answer": STRONG}, {"question": Q_FUND, "answer": WEAK},
    ]})
    assert r.json()["method"] == "rubric"  # wrong number of entries -> not trusted


def test_validation():
    assert client.post("/api/interview/score", json={"items": []}).status_code == 422
