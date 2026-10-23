"""Community submissions (stories, interviews, events) and the interview question bank.
No network, no real DB."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")

from datetime import date, timedelta  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routes_community as community  # noqa: E402
from admin_auth import get_current_admin_flex  # noqa: E402
from auth_utils import get_current_user  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)
TODAY = date.today()


@pytest.fixture(autouse=True)
def _no_rate_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_DISABLED", "1")


@pytest.fixture
def as_user():
    app.dependency_overrides[get_current_user] = lambda: {"_id": "u1", "name": "Priya Sharma"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def as_admin():
    app.dependency_overrides[get_current_admin_flex] = lambda: {"_id": "admin"}
    yield
    app.dependency_overrides.pop(get_current_admin_flex, None)


def _interview(**kw):
    body = {
        "visa_type": "us-f1",
        "consulate": "Hyderabad",
        "interview_date": (TODAY - timedelta(days=3)).isoformat(),
        "outcome": "approved",
        "questions": ["Why this university?", "Who is sponsoring you?"],
    }
    body.update(kw)
    return body


# ------------------------------------------------------------ submissions


@patch.object(community, "interviews_col")
def test_interview_submission_is_pending_and_anonymous_by_default(col, as_user):
    col.insert_one = AsyncMock()
    r = client.post("/api/community/interviews", json=_interview())
    assert r.status_code == 201 and r.json()["status"] == "pending"
    doc = col.insert_one.call_args.args[0]
    assert doc["status"] == "pending"
    assert doc["source_name"] == "WeHive member"
    assert doc["country_id"] == "usa"
    assert doc["questions"] == ["Why this university?", "Who is sponsoring you?"]


def test_submissions_require_sign_in():
    assert client.post("/api/community/interviews", json=_interview()).status_code == 401
    assert client.post("/api/community/stories", json={}).status_code in (401, 422)


@pytest.mark.parametrize("text", [
    "My passport is K1234567",
    "DS-160 AA00ABC123 was fine",
    "Call me on +91 90007 34326",
    "mail me at priya@example.com",
    "see https://agent.example for help",
])
@patch.object(community, "interviews_col")
def test_personal_details_and_links_are_rejected(col, as_user, text):
    col.insert_one = AsyncMock()
    r = client.post("/api/community/interviews", json=_interview(tips=text))
    assert r.status_code == 400
    col.insert_one.assert_not_called()


@patch.object(community, "stories_col")
def test_everyday_words_are_not_spam(col, as_user):
    col.insert_one = AsyncMock()
    r = client.post("/api/community/stories", json={
        "visa_type": "germany-student", "outcome": "admit", "university": "TU Munich",
        "story": "Got my admit for the winter intake with free tuition. Started my prep in 2025.",
    })
    assert r.status_code == 201
    assert col.insert_one.call_args.args[0]["source_name"] == "Priya"


def test_future_interview_and_past_event_are_invalid(as_user):
    future = (TODAY + timedelta(days=2)).isoformat()
    assert client.post("/api/community/interviews", json=_interview(interview_date=future)).status_code == 422
    r = client.post("/api/community/events", json={
        "name": "Study in Ireland fair", "date": (TODAY - timedelta(days=1)).isoformat(),
        "country_id": "india", "category": "Education Fair", "organiser": "Education in Ireland",
        "source_url": "https://example.org/fair",
    })
    assert r.status_code == 422


@patch.object(community, "global_events_col")
def test_event_submission_goes_to_events_moderation_queue(col, as_user):
    col.find_one = AsyncMock(return_value=None)
    col.insert_one = AsyncMock()
    r = client.post("/api/community/events", json={
        "name": "Study in Ireland fair", "date": (TODAY + timedelta(days=10)).isoformat(),
        "country_id": "india", "city": "Hyderabad", "category": "Education Fair",
        "organiser": "Education in Ireland", "source_url": "https://example.org/fair",
    })
    assert r.status_code == 201
    doc = col.insert_one.call_args.args[0]
    assert doc["status"] == "pending" and doc["source"] == "user" and doc["country_id"] == "india"


# ------------------------------------------------------------ question bank


def _find_returning(col, docs):
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.to_list = AsyncMock(return_value=docs)
    col.find.return_value = cursor


@patch.object(community, "interviews_col")
def test_question_bank_ranks_by_how_often_asked(col):
    _find_returning(col, [
        {"questions": ["Why this university?", "Who is sponsoring you?"], "interview_date": "2026-10-20", "outcome": "approved"},
        {"questions": ["why this University", "What will you do after graduation?"], "interview_date": "2026-10-18", "outcome": "rejected"},
        {"questions": ["Why this university?", "Why this university?"], "interview_date": "2026-10-10", "outcome": "approved"},
    ])
    r = client.get("/api/community/interview-questions?visa_type=us-f1")
    assert r.status_code == 200
    data = r.json()
    assert data["interviews"] == 3
    assert data["outcomes"] == {"approved": 2, "rejected": 1}
    top = data["questions"][0]
    assert top["question"] == "Why this university?"  # most common wording
    assert top["asked_in"] == 3  # case/punctuation variants merged, repeats counted once
    assert top["share"] == 1.0 and top["last_asked"] == "2026-10-20"
    assert col.find.call_args.args[0] == {"status": "approved", "visa_type": "us-f1"}


def test_question_bank_rejects_unknown_visa_type():
    assert client.get("/api/community/interview-questions?visa_type=nope").status_code == 422


# ------------------------------------------------------------ moderation


def test_pending_queue_requires_admin():
    assert client.get("/api/community/stories/pending").status_code in (401, 403)
    assert client.post("/api/community/stories/x/approve").status_code in (401, 403)


@patch.object(community, "COLLECTIONS")
def test_admin_approve(cols, as_admin):
    col = MagicMock()
    col.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    cols.__getitem__.return_value = col
    r = client.post("/api/community/interviews/abc/approve")
    assert r.status_code == 200 and r.json()["status"] == "approved"
    assert col.update_one.call_args.args[1]["$set"]["status"] == "approved"
