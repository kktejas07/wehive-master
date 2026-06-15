"""Unit tests for auth_utils.py — utility functions, no server needed."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'wehive_test'
os.environ['JWT_SECRET'] = 'test_secret_key_for_unit_tests_12345'
os.environ['OTP_LENGTH'] = '6'
os.environ['OTP_TTL_MINUTES'] = '10'

from auth_utils import (
    classify_identifier, normalize_phone, mask,
    sign_jwt, decode_jwt, gen_otp, otp_expiry,
)
from datetime import datetime, timedelta


class TestClassifyIdentifier:
    def test_email(self):
        assert classify_identifier('test@example.com') == 'email'

    def test_email_with_plus(self):
        assert classify_identifier('user+tag@domain.co.uk') == 'email'

    def test_phone_with_plus(self):
        assert classify_identifier('+919876543210') == 'phone'

    def test_phone_without_plus(self):
        assert classify_identifier('9876543210') == 'phone'

    def test_invalid_raises(self):
        try:
            classify_identifier('not-a-phone-or-email')
            assert False, 'Should have raised'
        except Exception as e:
            assert '400' in str(type(e)).lower() or 'invalid' in str(e).lower()


class TestNormalizePhone:
    def test_adds_india_code(self):
        assert normalize_phone('9876543210') == '+919876543210'

    def test_preserves_existing_code(self):
        assert normalize_phone('+919876543210') == '+919876543210'

    def test_strips_leading_zero(self):
        assert normalize_phone('09876543210') == '+919876543210'

    def test_strips_spaces_and_dashes(self):
        assert normalize_phone('+91 98765 43210') == '+919876543210'
        assert normalize_phone('+91-98765-43210') == '+919876543210'


class TestMask:
    def test_masks_email(self):
        result = mask('test@example.com')
        assert '@' in result
        assert '***' in result
        assert result.endswith('@example.com')

    def test_masks_short_email_local(self):
        result = mask('ab@test.com')
        assert result.startswith('a***')
        assert result.endswith('@test.com')

    def test_masks_phone(self):
        result = mask('+919876543210')
        assert result.startswith('+91')
        assert result.endswith('10')
        assert '*****' in result

    def test_masks_short_phone(self):
        result = mask('12345')
        assert result is not None


class TestJWT:
    def test_sign_and_decode_roundtrip(self):
        token = sign_jwt('user123')
        payload = decode_jwt(token)
        assert payload['sub'] == 'user123'

    def test_expired_token_rejected(self):
        import jwt as pyjwt
        from datetime import timedelta
        expired = pyjwt.encode(
            {'sub': 'u1', 'exp': datetime.utcnow() - timedelta(hours=1)},
            os.environ['JWT_SECRET'], algorithm='HS256'
        )
        try:
            decode_jwt(expired)
            assert False, 'Should have raised'
        except Exception as e:
            assert 'expired' in str(e).lower() or 'expired' in str(e).lower()

    def test_invalid_token_rejected(self):
        try:
            decode_jwt('invalid.token.here')
            assert False, 'Should have raised'
        except Exception:
            pass


class TestGenOtp:
    def test_default_length(self):
        otp = gen_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    def test_custom_length(self):
        otp = gen_otp(8)
        assert len(otp) == 8
        assert otp.isdigit()

    def test_randomness(self):
        otps = {gen_otp() for _ in range(100)}
        assert len(otps) > 90, 'OTPs should be mostly unique'


class TestOtpExpiry:
    def test_returns_future_time(self):
        expiry = otp_expiry()
        now = datetime.utcnow()
        assert expiry > now
        assert expiry < now + timedelta(minutes=15)
