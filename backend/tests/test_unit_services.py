"""Unit tests for service/utility modules — fee_calculator (full), serializers (full),
normalize, config, constants, models, auth_utils (remaining gaps).
"""

import sys, os, importlib
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_12345")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.com")
os.environ.setdefault("OTP_LENGTH", "6")
os.environ.setdefault("OTP_TTL_MINUTES", "10")
os.environ.setdefault("JWT_EXPIRES_HOURS", "720")

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import jwt as pyjwt


# ─── Fee Calculator (full coverage) ──────────────────────────────────────────
from shared.fee_calculator import (
    compute_fees, compute_multi_university_fees, base_fee_for, revenue_for,
    FLAT_APPLICATION_FEE_INR, DEFAULT_BASE_FEE_BY_TYPE, DEFAULT_SURCHARGE_INR, DEFAULT_GST_RATE
)


class TestFeeCalculatorExtended:
    def test_base_fee_all_types(self):
        for visa_type, expected in DEFAULT_BASE_FEE_BY_TYPE.items():
            assert base_fee_for(visa_type) == expected

    def test_compute_fees_edge_zero_applicants(self):
        fees = compute_fees(applicants=0)
        assert fees["applicants"] == 1

    def test_compute_fees_with_custom_override_partial(self):
        fees = compute_fees(applicants=1, visa_type="Student", base_fees_override={"Tourist": 9999})
        assert fees["base"] == 5500  # Student not in override, falls back to default

    def test_compute_fees_govt_and_appointment(self):
        fees = compute_fees(applicants=2, visa_type="Work", govt_fee_inr=3000, requires_appointment=True, appointment_fee_inr=2000)
        assert fees["govt"] == 6000
        assert fees["appointment"] == 4000
        assert fees["is_visa_free"] is False

    def test_multi_university_exact_boundary(self):
        fees_3 = compute_multi_university_fees(3)
        fees_4 = compute_multi_university_fees(4)
        assert fees_3["application_fee"] == FLAT_APPLICATION_FEE_INR
        assert fees_4["application_fee"] == FLAT_APPLICATION_FEE_INR + 3000

    def test_multi_university_minimum(self):
        fees = compute_multi_university_fees(1)
        assert fees["university_count"] == 1

    def test_multi_university_gst(self):
        fees = compute_multi_university_fees(3)
        assert fees["gst"] == round(FLAT_APPLICATION_FEE_INR * DEFAULT_GST_RATE)

    def test_multi_university_gst_four_plus(self):
        fees = compute_multi_university_fees(5)
        expected_fee = FLAT_APPLICATION_FEE_INR + (5 - 3) * 3000
        assert fees["gst"] == round(expected_fee * DEFAULT_GST_RATE)

    def test_compute_fees_is_visa_free_with_govt_fee(self):
        fees = compute_fees(govt_fee_inr=500)
        assert fees["is_visa_free"] is False

    def test_compute_fees_is_visa_free_with_zero_govt(self):
        fees = compute_fees(govt_fee_inr=0)
        assert fees["is_visa_free"] is True


@pytest.mark.asyncio
async def test_revenue_for_basic():
    app = {"applicants": 2, "visa_type": "Tourist"}
    country = {"categories": {"Tourist": {"fees_inr": 1000}}}
    total = await revenue_for(app, country)
    assert total > 0


@pytest.mark.asyncio
async def test_revenue_for_custom_pricing():
    app = {"applicants": 1, "visa_type": "Student"}
    country = {}
    pricing = {"base_fees": {"Student": 6000}, "surcharge_inr": 500, "gst_rate": 0.18}
    total = await revenue_for(app, country, pricing)
    assert total > 0


@pytest.mark.asyncio
async def test_revenue_for_no_country():
    app = {"applicants": 1, "visa_type": "Tourist"}
    total = await revenue_for(app, None)
    assert total > 0


@pytest.mark.asyncio
async def test_revenue_for_default_applicants():
    app = {}
    total = await revenue_for(app, None)
    assert total > 0


@pytest.mark.asyncio
async def test_revenue_for_appointment_fee():
    app = {"applicants": 1, "visa_type": "Tourist"}
    country = {"requires_appointment": True, "appointment_fee_inr": 1500, "categories": {"Tourist": {"fees_inr": 2000}}}
    total = await revenue_for(app, country)
    assert total > 0


# ─── Serializers (full coverage) ─────────────────────────────────────────────
from core.serializers import _serialize_datetime, serialize_doc, public_user, public_admin, serialize_event


class TestSerializeDatetime:
    def test_none(self):
        assert _serialize_datetime(None) is None

    def test_datetime(self):
        dt = datetime(2025, 6, 1, 12, 0, 0)
        assert _serialize_datetime(dt) == "2025-06-01T12:00:00"

    def test_non_datetime_value(self):
        assert _serialize_datetime("string") == "string"


class TestSerializeDocExtended:
    def test_timeline_without_at(self):
        doc = {"_id": "1", "timeline": [{"status": "draft"}]}
        result = serialize_doc(doc, convert_timeline=True)
        assert len(result["timeline"]) == 1

    def test_nested_datetime_in_doc(self):
        dt = datetime(2025, 1, 1)
        doc = {"_id": "1", "approved_at": dt, "nested": {"ts": dt}}
        result = serialize_doc(doc)
        assert isinstance(result["approved_at"], str)


class TestPublicUserExtended:
    def test_admin_email_from_config(self):
        u = {"_id": "u1", "email": "admin@test.com"}
        result = public_user(u, include_admin_flag=True)
        assert result["is_admin"] is True

    def test_non_admin_email(self):
        u = {"_id": "u1", "email": "user@other.com"}
        result = public_user(u, include_admin_flag=True)
        assert result["is_admin"] is False


class TestPublicAdminExtended:
    def test_password_updated_at(self):
        dt = datetime(2025, 6, 1)
        u = {"_id": "a1", "password_hash": "x", "password_updated_at": dt}
        result = public_admin(u)
        assert isinstance(result["password_updated_at"], str)

    def test_missing_fields(self):
        u = {"_id": "a1"}
        result = public_admin(u)
        assert result["has_password"] is False


class TestSerializeEvent:
    def test_basic_event(self):
        e = {"_id": "evt1", "name": "Test Event", "date": datetime(2025, 6, 1)}
        result = serialize_event(e)
        assert result["id"] == "evt1"
        assert result["name"] == "Test Event"
        assert isinstance(result["date"], str)

    def test_event_without_id(self):
        e = {"name": "No ID"}
        result = serialize_event(e)
        assert result["id"] is None

    def test_event_nested_enums(self):
        class FakeEnum:
            def __str__(self):
                return "enum_val"
        e = {"_id": "e1", "status": FakeEnum()}
        result = serialize_event(e)
        assert str(result["status"]) == "enum_val"


# ─── Normalize ────────────────────────────────────────────────────────────────
from shared.normalize import normalize_university


class TestNormalize:
    def test_removes_id(self):
        result = normalize_university({"_id": "123", "name": "Test Uni"})
        assert "_id" not in result

    def test_cn_field_mapped(self):
        result = normalize_university({"录取率": "80%", "name": "Test"})
        assert result["acceptance_rate"] == "80%"

    def test_cn_field_skipped_if_en_exists(self):
        result = normalize_university({"录取率": "80%", "acceptance_rate": "90%", "name": "Test"})
        assert result["acceptance_rate"] == "90%"
        assert "录取率" not in result

    def test_space_prefixed_keys(self):
        result = normalize_university({" scholarships": "Full ride", "name": "Test"})
        assert result["scholarships"] == "Full ride"
        assert " scholarships" not in result

    def test_intakes(self):
        result = normalize_university({" intakes": "Fall 2025", "name": "Test"})
        assert result["intakes"] == "Fall 2025"


# ─── Config ──────────────────────────────────────────────────────────────────
class TestConfig:
    def test_admin_emails_parsed(self):
        import core.config as config
        assert "admin@test.com" in config.ADMIN_EMAILS

    def test_jwt_secret_set(self):
        import core.config as config
        assert config.JWT_SECRET

    def test_otp_ttl(self):
        import core.config as config
        assert config.OTP_TTL_MIN == 10


# ─── Constants ────────────────────────────────────────────────────────────────
from core.constants import AppStatus, OtpChannel, BILLABLE_STATUSES, STATUS_LABELS, REFERRAL_REWARD_INR, MIN_DEPOSIT_FOR_REWARD


class TestConstants:
    def test_app_status_values(self):
        assert AppStatus.DRAFT.value == "draft"
        assert AppStatus.APPROVED.value == "approved"

    def test_otp_channel_values(self):
        assert OtpChannel.AUTO.value == "auto"

    def test_billable_statuses(self):
        assert AppStatus.SUBMITTED in BILLABLE_STATUSES
        assert AppStatus.DRAFT not in BILLABLE_STATUSES

    def test_status_labels(self):
        assert "Visa approved" in STATUS_LABELS[AppStatus.APPROVED]

    def test_referral_constants(self):
        assert REFERRAL_REWARD_INR == 500
        assert MIN_DEPOSIT_FOR_REWARD == 2000


# ─── Models ───────────────────────────────────────────────────────────────────
from core.models import (
    SendOtpRequest, VerifyOtpRequest, ApplicationCreate, Application,
    SavedPlanCreate, LeadCreate, Lead, UniversityApplicationCreate,
    PrimaryApplicant, UpdateProfileRequest, PublicUser, AuthTokens
)


class TestModels:
    def test_send_otp_request_strips_identifier(self):
        req = SendOtpRequest(identifier="  test@test.com  ", channel="email")
        assert req.identifier == "test@test.com"

    def test_application_create_defaults(self):
        req = ApplicationCreate(country_id="ca", visa_type="Tourist")
        assert req.applicants == 1

    def test_application_default_uuid(self):
        app = Application(user_id="u1", country_id="ca", visa_type="Tourist")
        assert app.id is not None
        assert app.status == "draft"

    def test_public_user_defaults(self):
        u = PublicUser(id="u1", created_at=datetime.utcnow())
        assert u.is_premium is False
        assert u.is_admin is False

    def test_lead_create_validation(self):
        req = LeadCreate(name="John", email="john@test.com", message="Hello")
        assert req.name == "John"

    def test_lead_defaults(self):
        lead = Lead(name="John", email="john@test.com", message="Hi")
        assert lead.id is not None
        assert lead.surname == ""

    def test_update_profile_request(self):
        req = UpdateProfileRequest(name="New Name", gender="male")
        assert req.name == "New Name"

    def test_primary_applicant(self):
        p = PrimaryApplicant(name="John", email="j@t.com")
        assert p.name == "John"

    def test_university_app_create(self):
        from core.models import UniversitySelection
        sel = UniversitySelection(university_id="u1")
        req = UniversityApplicationCreate(universities=[sel], country_id="ca")
        assert len(req.universities) == 1

    def test_saved_plan_defaults(self):
        req = SavedPlanCreate(country_id="ca")
        assert req.duration_days == 7

    def test_auth_tokens(self):
        u = PublicUser(id="u1", created_at=datetime.utcnow())
        tokens = AuthTokens(access_token="token123", user=u)
        assert tokens.token_type == "bearer"


# ─── Auth Utils (remaining coverage) ─────────────────────────────────────────
from core.auth_utils import (
    classify_identifier, normalize_phone, mask, sign_jwt, decode_jwt,
    gen_otp, otp_expiry, create_access_token, get_current_user,
    get_current_user_optional
)


class TestAuthUtilsExtended:
    def test_classify_identifier_email(self):
        assert classify_identifier("user@domain.com") == "email"

    def test_classify_identifier_phone(self):
        assert classify_identifier("+12345678901") == "phone"

    def test_normalize_phone_with_code(self):
        assert normalize_phone("+919876543210") == "+919876543210"

    def test_normalize_phone_adds_code(self):
        assert normalize_phone("9876543210") == "+919876543210"

    def test_normalize_phone_strips_zero(self):
        assert normalize_phone("09876543210") == "+919876543210"

    def test_normalize_phone_strips_spaces(self):
        assert normalize_phone("+91 98765 43210") == "+919876543210"

    def test_mask_email_short(self):
        result = mask("ab@test.com")
        assert result == "a***@test.com"

    def test_mask_email_long(self):
        result = mask("alice@test.com")
        assert "***" in result

    def test_mask_phone(self):
        result = mask("+919876543210")
        assert result.startswith("+91")
        assert result.endswith("10")

    def test_mask_short_string(self):
        result = mask("abc")
        assert result is not None

    def test_sign_jwt_with_extra(self):
        token = sign_jwt("user123", extra={"role": "admin"})
        payload = decode_jwt(token)
        assert payload["role"] == "admin"

    def test_sign_jwt_no_extra(self):
        token = sign_jwt("user123")
        payload = decode_jwt(token)
        assert payload["sub"] == "user123"

    def test_reserved_claim_not_overridden(self):
        token = sign_jwt("user123", extra={"sub": "hacker", "exp": 0})
        payload = decode_jwt(token)
        assert payload["sub"] == "user123"
        assert payload["exp"] > 0

    def test_expired_token_rejected(self):
        expired = pyjwt.encode(
            {"sub": "u1", "exp": datetime.utcnow() - timedelta(hours=1)},
            os.environ["JWT_SECRET"], algorithm="HS256"
        )
        with pytest.raises(Exception) as exc:
            decode_jwt(expired)
        msg = str(exc.value).lower()
        assert "expired" in msg or "invalid token" in msg

    def test_invalid_token_rejected(self):
        with pytest.raises(Exception):
            decode_jwt("invalid.token.here")

    def test_create_access_token(self):
        token = create_access_token({"sub": "user123", "role": "admin"})
        payload = decode_jwt(token)
        assert payload["sub"] == "user123"
        assert payload["role"] == "admin"

    def test_create_access_token_no_sub_raises(self):
        with pytest.raises(ValueError, match="sub"):
            create_access_token({"role": "admin"})

    def test_otp_expiry(self):
        expiry = otp_expiry()
        now = datetime.utcnow()
        assert expiry > now
        assert expiry < now + timedelta(minutes=15)

    def test_gen_otp_default_length(self):
        otp = gen_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    def test_gen_otp_custom_length(self):
        otp = gen_otp(8)
        assert len(otp) == 8


@pytest.mark.asyncio
async def test_get_current_user_no_header():
    with pytest.raises(Exception):
        await get_current_user(None)


@pytest.mark.asyncio
async def test_get_current_user_not_bearer():
    with pytest.raises(Exception):
        await get_current_user("Token abc")


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    with pytest.raises(Exception):
        await get_current_user("Bearer invalidtoken")


@pytest.mark.asyncio
async def test_get_current_user_optional_no_header():
    result = await get_current_user_optional(None)
    assert result is None


@pytest.mark.asyncio
async def test_get_current_user_optional_invalid():
    result = await get_current_user_optional("Bearer badtoken")
    assert result is None
