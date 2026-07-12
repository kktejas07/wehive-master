"""Unit tests for agent modules — orchestrator, concierge, document_validator,
review_moderation, pdf_agent, tool_registry, third_party_agent (mocked).

Tests pure logic and class behaviour where possible. DB-dependent functions
are tested with monkey-patched mocks.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("APP_ENV", "test")

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest


# ─── Orchestrator ─────────────────────────────────────────────────────────────
from agents.orchestrator import detect_intent, get_agent_endpoint, OrchestratorResult


class TestOrchestrator:
    @pytest.mark.asyncio
    async def test_detect_visa_qa(self):
        result = await detect_intent("What are the visa requirements for US?")
        assert "visa Q&A" in result.agent
        assert result.confidence > 0

    @pytest.mark.asyncio
    async def test_detect_concierge(self):
        result = await detect_intent("I want to apply for a tourist visa to Canada")
        assert "Concierge" in result.agent

    @pytest.mark.asyncio
    async def test_detect_doc_validator(self):
        result = await detect_intent("Can you check this document for me?")
        assert "Document Validator" in result.agent

    @pytest.mark.asyncio
    async def test_detect_portal_ai(self):
        result = await detect_intent("Show me my students needing attention")
        assert "Portal AI" in result.agent

    @pytest.mark.asyncio
    async def test_detect_workflow(self):
        result = await detect_intent("I want to study at a university in Canada")
        assert "Research" in result.agent or "workflow" in result.agent.lower() or "visa" in result.agent.lower()

    @pytest.mark.asyncio
    async def test_empty_query_defaults_to_visa_qa(self):
        result = await detect_intent("hello")
        assert result.agent is not None

    @pytest.mark.asyncio
    async def test_params_extracted(self):
        result = await detect_intent("Tell me about visa for UK")
        assert result.params.get("country_id") == "uk"

    @pytest.mark.asyncio
    async def test_student_intent(self):
        result = await detect_intent("Can I study in Australia?")
        assert result.params.get("intent") == "student"

    def test_get_agent_endpoint_known(self):
        result = OrchestratorResult("Hive (visa Q&A)", 0.8, {})
        assert get_agent_endpoint(result) == "POST /api/chatbot/sessions/{id}/messages"

    def test_get_agent_endpoint_unknown(self):
        result = OrchestratorResult("Unknown Agent", 0.0, {})
        assert get_agent_endpoint(result) is None

    @pytest.mark.asyncio
    async def test_confidence_capped(self):
        result = await detect_intent("visa visa visa visa visa visa visa visa visa visa visa")
        assert result.confidence <= 1.0


# ─── Concierge ────────────────────────────────────────────────────────────────
from agents.concierge import ConciergeSession, StepStatus, start_concierge, advance_concierge, get_session


class TestConciergeSession:
    def test_init_sets_defaults(self):
        s = ConciergeSession("u1", "ca", "tourist")
        assert s.user_id == "u1"
        assert s.country_id == "ca"
        assert s.visa_type == "tourist"
        assert len(s.steps) == 8

    def test_get_next_step_returns_first_pending(self):
        s = ConciergeSession("u1", "ca", "tourist")
        assert s.get_next_step() == "parse_intent"

    def test_complete_step(self):
        s = ConciergeSession("u1", "ca", "tourist")
        s.complete_step("parse_intent")
        assert s.steps["parse_intent"]["status"] == StepStatus.COMPLETED
        assert s.get_next_step() == "requirements"

    def test_complete_step_with_data(self):
        s = ConciergeSession("u1", "ca", "tourist")
        s.complete_step("parse_intent", {"country": "Canada"})
        assert s.steps["parse_intent"]["data"] == {"country": "Canada"}

    def test_complete_unknown_step_raises(self):
        s = ConciergeSession("u1", "ca", "tourist")
        with pytest.raises(KeyError):
            s.complete_step("nonexistent")

    def test_progress(self):
        s = ConciergeSession("u1", "ca", "tourist")
        assert s.progress() == "0/8"
        s.complete_step("parse_intent")
        assert s.progress() == "1/8"

    def test_all_steps_completed_returns_none(self):
        s = ConciergeSession("u1", "ca", "tourist")
        for step in list(s.steps.keys()):
            s.complete_step(step)
        assert s.get_next_step() is None

    def test_done_true_when_all_complete(self):
        s = ConciergeSession("u1", "ca", "tourist")
        for step in list(s.steps.keys()):
            s.complete_step(step)
        assert s.get_next_step() is None


@pytest.mark.asyncio
async def test_start_concierge():
    with patch("agents.concierge.lookup_country", new=AsyncMock(return_value={"name": "Canada"})):
        with patch("agents.concierge.get_visa_requirements", new=AsyncMock(return_value={"docs": ["passport"]})):
            with patch("agents.concierge.get_application_fee", new=AsyncMock(return_value={"fee_inr": 5000})):
                result = await start_concierge("u1", "ca", "tourist")
                assert result["country"] == "Canada"
                assert result["next_step"] == "passport_scan"
                assert result["visa_type"] == "tourist"
                assert "steps" in result


@pytest.mark.asyncio
async def test_start_concierge_no_country_data():
    with patch("agents.concierge.lookup_country", new=AsyncMock(return_value=None)):
        with patch("agents.concierge.get_visa_requirements", new=AsyncMock(return_value=None)):
            with patch("agents.concierge.get_application_fee", new=AsyncMock(return_value=None)):
                result = await start_concierge("u1", "xx", "tourist")
                assert result["country"] == "xx"


def test_get_session_none():
    assert get_session("nonexistent", "ca") is None


@pytest.mark.asyncio
async def test_advance_concierge_no_session():
    result = await advance_concierge("nonexistent", "ca", "documents")
    assert "error" in result


@pytest.mark.asyncio
async def test_advance_concierge_unknown_step():
    with patch("agents.concierge.lookup_country", new=AsyncMock(return_value={"name": "Canada"})):
        with patch("agents.concierge.get_visa_requirements", new=AsyncMock(return_value={})):
            with patch("agents.concierge.get_application_fee", new=AsyncMock(return_value={})):
                await start_concierge("u1", "ca", "tourist")
    result = await advance_concierge("u1", "ca", "nonexistent_step")
    assert "error" in result


@pytest.mark.asyncio
async def test_advance_concierge_happy_path():
    with patch("agents.concierge.lookup_country", new=AsyncMock(return_value={"name": "Canada"})):
        with patch("agents.concierge.get_visa_requirements", new=AsyncMock(return_value={})):
            with patch("agents.concierge.get_application_fee", new=AsyncMock(return_value={})):
                await start_concierge("u1", "ca", "tourist")
    result = await advance_concierge("u1", "ca", "passport_scan", {"file": "passport.jpg"})
    assert result["completed_step"] == "passport_scan"
    assert result["next_step"] == "documents"
    assert result["done"] is False


# ─── Document Validator ───────────────────────────────────────────────────────
from agents.document_validator import (
    classify_doc_type, validate_passport_expiry, validate_file,
    check_required_docs, validate_application_docs
)


class TestClassifyDocType:
    def test_passport(self):
        assert classify_doc_type("passport_scan.pdf") == "passport"

    def test_photo(self):
        assert classify_doc_type("my_photo.jpg") == "photo"

    def test_bank_statement(self):
        assert classify_doc_type("bank_statement.pdf") == "bank_statement"

    def test_flight(self):
        assert classify_doc_type("flight_itinerary.pdf") == "flight"

    def test_hotel(self):
        assert classify_doc_type("hotel_booking.pdf") == "hotel"

    def test_insurance(self):
        assert classify_doc_type("travel_insurance.pdf") == "insurance"

    def test_admit_letter(self):
        assert classify_doc_type("admit_letter.pdf") == "admit_letter"

    def test_transcript(self):
        assert classify_doc_type("transcript.pdf") == "transcript"

    def test_test_scores(self):
        assert classify_doc_type("ielts_result.pdf") == "test_scores"

    def test_invitation(self):
        assert classify_doc_type("invitation_letter.pdf") == "invitation"

    def test_employer_letter(self):
        assert classify_doc_type("employer_letter.pdf") == "employer_letter"

    def test_degree(self):
        assert classify_doc_type("degree_certificate.pdf") == "degree"

    def test_police(self):
        assert classify_doc_type("police_clearance.pdf") == "police"

    def test_sponsor(self):
        assert classify_doc_type("financial_proof.pdf") == "sponsor"

    def test_unknown(self):
        assert classify_doc_type("random_file.txt") == "other"


class TestValidatePassportExpiry:
    def test_valid_passport(self):
        future = (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d")
        result = validate_passport_expiry(future)
        assert result["valid"] is True
        assert result["severity"] == "ok"

    def test_expired_passport(self):
        past = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        result = validate_passport_expiry(past)
        assert result["valid"] is False
        assert result["severity"] == "critical"

    def test_expiring_soon(self):
        soon = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d")
        result = validate_passport_expiry(soon)
        assert result["valid"] is False
        assert result["severity"] == "warning"

    def test_no_date(self):
        result = validate_passport_expiry(None)
        assert result["valid"] is False
        assert result["severity"] == "critical"

    def test_invalid_format(self):
        result = validate_passport_expiry("not-a-date")
        assert result["valid"] is False
        assert result["severity"] == "warning"


class TestValidateFile:
    def test_valid_file(self):
        result = validate_file("passport.pdf", 1024)
        assert result["valid"] is True
        assert len(result["issues"]) == 0

    def test_invalid_extension(self):
        result = validate_file("file.exe", 1024)
        assert result["valid"] is False

    def test_file_too_large(self):
        result = validate_file("photo.jpg", 10 * 1024 * 1024)
        assert result["valid"] is False
        assert any(i["field"] == "size" for i in result["issues"])

    def test_empty_file(self):
        result = validate_file("doc.pdf", 0)
        assert result["valid"] is False

    def test_classified_as(self):
        result = validate_file("bank_statement.pdf", 1024)
        assert result["classified_as"] == "bank_statement"


class TestCheckRequiredDocs:
    def test_tourist_all_present(self):
        docs = [
            {"filename": "passport_scan.pdf"},
            {"filename": "photo.jpg"},
            {"filename": "bank_statement.pdf"},
        ]
        results = check_required_docs(docs, "tourist")
        assert len(results) > 0

    def test_missing_docs(self):
        docs = [{"filename": "random.txt"}]
        results = check_required_docs(docs, "tourist")
        assert any(not r["present"] for r in results)

    def test_fallback_to_tourist(self):
        docs = []
        results = check_required_docs(docs, "unknown_type")
        assert len(results) > 0


@pytest.mark.asyncio
async def test_validate_application_docs():
    with patch("agents.document_validator.get_country", return_value={"name": "Canada"}):
        docs = [
            {"filename": "passport_scan.pdf", "size": 1024},
            {"filename": "photo.jpg", "size": 2048},
            {"filename": "bank_statement.pdf", "size": 1024},
            {"filename": "flight_itinerary.pdf", "size": 1024},
            {"filename": "travel_insurance.pdf", "size": 1024},
        ]
        result = await validate_application_docs("ca", "tourist", docs, "2030-01-01")
        assert result["verdict"] == "pass"
        assert result["application"]["country"] == "Canada"

@pytest.mark.asyncio
async def test_validate_application_docs_no_country():
    with patch("agents.document_validator.get_country", return_value=None):
        docs = []
        result = await validate_application_docs("xx", "tourist", docs)
        assert result["application"]["country"] == "xx"


# ─── Review Moderation ────────────────────────────────────────────────────────
from agents.review_moderation import moderate_review


class TestModerateReview:
    def test_clean_review_approved(self):
        result = moderate_review("Great university! Excellent faculty.", 5)
        assert result["verdict"] == "approve"

    def test_spam_detected(self):
        result = moderate_review("Buy cheap visa documents now! http://spam.com", 1)
        assert result["is_spam"] is True
        assert result["verdict"] in ("reject", "flag_for_review")

    def test_sentiment_mismatch_high_rating(self):
        result = moderate_review("This place is terrible and awful and bad.", 5)
        assert "sentiment_mismatch_high_rating" in result["flags"]

    def test_sentiment_mismatch_low_rating(self):
        result = moderate_review("Absolutely great and excellent experience.", 1)
        assert "sentiment_mismatch_low_rating" in result["flags"]

    def test_too_short(self):
        result = moderate_review("OK", 3)
        assert "too_short" in result["flags"]

    def test_excessive_caps(self):
        result = moderate_review("THIS UNIVERSITY IS AMAZING AND WONDERFUL", 5)
        assert "excessive_caps" in result["flags"]

    def test_single_flag_flagged(self):
        result = moderate_review("OK", 3)
        assert result["verdict"] == "flag_for_review"

    def test_multiple_flags_rejected(self):
        result = moderate_review("THIS PLACE IS AWFUL AND TERRIBLE", 5)
        assert result["verdict"] == "reject"

    def test_contact_info_spam(self):
        result = moderate_review("Contact me at 9876543210 for visa help", 5)
        assert result["is_spam"] is True


# ─── PDF Agent ────────────────────────────────────────────────────────────────
from agents.pdf_agent import generate_invoice_pdf, generate_application_summary_pdf


class TestPdfAgent:
    def test_generate_invoice_returns_bytes(self):
        items = [{"name": "Visa Service", "amount": 5000}]
        pdf_bytes = generate_invoice_pdf("INV-001", "John Doe", "john@test.com", items, 5000)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100

    def test_generate_invoice_with_many_items(self):
        items = [{"name": f"Service {i}", "amount": i * 100} for i in range(1, 6)]
        pdf_bytes = generate_invoice_pdf("INV-002", "Jane", "jane@test.com", items, 1500)
        assert len(pdf_bytes) > 100

    def test_application_summary_returns_bytes(self):
        app = {
            "_id": "app123",
            "country_name": "Canada",
            "visa_type": "Student",
            "status": "in_review",
            "created_at": datetime.utcnow(),
            "documents": [{"doc_type": "passport", "filename": "passport.pdf", "status": "uploaded"}],
            "timeline": [{"at": datetime.utcnow(), "label": "Submitted"}],
        }
        user = {"name": "John", "email": "john@test.com", "phone": "+1234567890"}
        pdf_bytes = generate_application_summary_pdf(app, user)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100

    def test_application_summary_no_docs(self):
        app = {"_id": "app456", "country_id": "uk", "visa_type": "Tourist", "status": "draft", "created_at": datetime.utcnow()}
        user = {"name": "Alice"}
        pdf_bytes = generate_application_summary_pdf(app, user)
        assert len(pdf_bytes) > 100

    def test_application_summary_string_created_at(self):
        app = {"_id": "app789", "visa_type": "Business", "status": "approved", "created_at": "2025-01-01"}
        user = {}
        pdf_bytes = generate_application_summary_pdf(app, user)
        assert len(pdf_bytes) > 100


# ─── Tool Registry ────────────────────────────────────────────────────────────
from shared.tool_registry import Tool, register_tool, get_tool, list_tools, tool_definitions


class TestToolRegistry:
    def setup_method(self):
        # Clear registry
        import shared.tool_registry as tr
        tr._tools.clear()

    def test_register_and_get_tool(self):
        async def dummy_handler(**kwargs):
            return "ok"
        t = register_tool("test_tool", "A test tool", {"type": "object", "properties": {}}, dummy_handler)
        assert isinstance(t, Tool)
        assert get_tool("test_tool") is t

    def test_get_nonexistent_tool(self):
        assert get_tool("nonexistent") is None

    def test_list_tools(self):
        async def handler(**kwargs):
            return "ok"
        register_tool("t1", "desc", {}, handler)
        register_tool("t2", "desc2", {}, handler)
        tools = list_tools()
        assert len(tools) == 2

    def test_tool_to_dict(self):
        async def handler(**kwargs):
            return "ok"
        t = register_tool("dict_test", "desc", {"type": "object"}, handler)
        d = t.to_dict()
        assert d["name"] == "dict_test"
        assert d["description"] == "desc"

    def test_tool_definitions(self):
        async def handler(**kwargs):
            return "ok"
        register_tool("def_test", "desc", {}, handler)
        defs = tool_definitions()
        assert len(defs) == 1
        assert defs[0]["name"] == "def_test"

    def test_register_all(self):
        import shared.tool_registry as tr
        tr._tools.clear()
        with patch("eva_tools.lookup_country", new=AsyncMock()):
            with patch("eva_tools.search_countries", new=AsyncMock()):
                with patch("eva_tools.search_universities", new=AsyncMock()):
                    with patch("eva_tools.get_visa_requirements", new=AsyncMock()):
                        with patch("eva_tools.get_application_fee", new=AsyncMock()):
                            with patch("eva_tools.lookup_university", new=AsyncMock()):
                                tr.register_all()
        assert len(tr.list_tools()) == 11


# ─── Third-Party Agent (mocked HTTP) ──────────────────────────────────────────
from agents.third_party_agent import fetch_visa_requirements, fetch_flights, fetch_exchange_rate


@pytest.mark.asyncio
async def test_fetch_visa_requirements_success():
    mock_resp = MagicMock()
    mock_resp.json = MagicMock(return_value={"visa": "required"})
    mock_resp.raise_for_status = MagicMock()
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        result = await fetch_visa_requirements("IN", "US", "test_key")
        assert result == {"visa": "required"}


@pytest.mark.asyncio
async def test_fetch_visa_requirements_http_error():
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.HTTPError("HTTP error"))
        result = await fetch_visa_requirements("IN", "US", "test_key")
        assert result is None


@pytest.mark.asyncio
async def test_fetch_flights_success():
    mock_resp = MagicMock()
    mock_resp.json = MagicMock(return_value={"content": {"results": {"itineraries": [{"price": 500}]}}})
    mock_resp.raise_for_status = MagicMock()
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        result = await fetch_flights("BLR", "LHR", "test_key")
        assert result == [{"price": 500}]


@pytest.mark.asyncio
async def test_fetch_flights_error():
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.HTTPError("fail"))
        result = await fetch_flights("BLR", "LHR", "test_key")
        assert result is None


@pytest.mark.asyncio
async def test_fetch_exchange_rate_success():
    mock_resp = MagicMock()
    mock_resp.json = MagicMock(return_value=[{"rate": 83.5}])
    mock_resp.raise_for_status = MagicMock()
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        result = await fetch_exchange_rate("USD", "INR", "test_key")
        assert result == 83.5


@pytest.mark.asyncio
async def test_fetch_exchange_rate_empty_response():
    mock_resp = MagicMock()
    mock_resp.json = MagicMock(return_value=[])
    mock_resp.raise_for_status = MagicMock()
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        result = await fetch_exchange_rate("USD", "INR", "test_key")
        assert result is None


@pytest.mark.asyncio
async def test_fetch_exchange_rate_error():
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.HTTPError("fail"))
        result = await fetch_exchange_rate("USD", "INR", "test_key")
        assert result is None
