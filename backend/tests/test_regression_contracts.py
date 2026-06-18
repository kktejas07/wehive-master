"""Contract regression tests — verify API response model shapes.

Follows the AI-regression-testing approach: test response *contracts*
where bugs were found, so regressions in API shape are caught early.
"""
from models import (
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest,
    AuthTokens, PublicUser, Application, ApplicationCreate,
    Lead, LeadCreate,
)


class TestSendOtpContract:
    def test_request_has_required_fields(self):
        fields = SendOtpRequest.model_fields.keys()
        assert 'identifier' in fields
        assert 'channel' in fields
        assert 'purpose' in fields

    def test_response_has_expected_fields(self):
        fields = SendOtpResponse.model_fields.keys()
        assert 'masked' in fields
        assert 'channel' in fields


class TestAuthTokensContract:
    def test_response_has_required_fields(self):
        fields = AuthTokens.model_fields.keys()
        assert 'access_token' in fields
        assert 'token_type' in fields
        assert 'user' in fields


class TestPublicUserContract:
    def test_response_has_expected_fields(self):
        fields = PublicUser.model_fields.keys()
        assert 'id' in fields
        assert 'email' in fields
        assert 'name' in fields
        assert 'is_premium' in fields


class TestApplicationContract:
    def test_create_request_required_fields(self):
        fields = ApplicationCreate.model_fields.keys()
        assert 'country_id' in fields
        assert 'visa_type' in fields

    def test_response_has_expected_fields(self):
        fields = Application.model_fields.keys()
        assert 'id' in fields
        assert 'country_id' in fields
        assert 'visa_type' in fields
        assert 'status' in fields
        assert 'created_at' in fields


class TestLeadContract:
    def test_create_request_required_fields(self):
        fields = LeadCreate.model_fields.keys()
        assert 'name' in fields
        assert 'email' in fields
        assert 'message' in fields

    def test_response_has_expected_fields(self):
        fields = Lead.model_fields.keys()
        assert 'id' in fields
        assert 'name' in fields
        assert 'email' in fields
        assert 'created_at' in fields
