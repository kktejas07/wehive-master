"""Unit tests for security additions to auth_utils.py.

Covers:
- JWT_SECRET weak-value guard (refuses to sign tokens with known-bad secrets in prod)
- JWT TTL is 24 hours by default (not 720)
- JWT supports extra payload fields via sign_jwt(..., extra={})
- create_access_token passes extra fields through
- Password-strength validator in routes_users.py
"""
import sys
import os
import importlib
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Pre-set required DB env vars before any import
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'wehive_test'
os.environ['ADMIN_EMAILS'] = 'admin@test.com'


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_auth_utils_with(secret: str, app_env: str = 'production'):
    """Reload auth_utils with specific JWT_SECRET and APP_ENV values."""
    os.environ['JWT_SECRET'] = secret
    os.environ['APP_ENV'] = app_env
    import auth_utils
    importlib.reload(auth_utils)
    return auth_utils


# ─────────────────────────────────────────────────────────────────────────────
# Weak-secret guard
# ─────────────────────────────────────────────────────────────────────────────
class TestWeakSecretGuard:
    def test_change_me_blocked_in_production(self):
        try:
            _load_auth_utils_with('change_me', 'production')
            assert False, 'Should have raised RuntimeError'
        except RuntimeError as e:
            assert 'insecure' in str(e).lower() or 'fatal' in str(e).lower()

    def test_empty_secret_blocked_in_production(self):
        try:
            _load_auth_utils_with('', 'production')
            assert False, 'Should have raised RuntimeError'
        except RuntimeError:
            pass

    def test_change_me_allowed_in_dev(self):
        mod = _load_auth_utils_with('change_me', 'development')
        assert mod.JWT_SECRET == 'change_me'  # no exception

    def test_change_me_allowed_in_test(self):
        mod = _load_auth_utils_with('change_me', 'test')
        assert mod.JWT_SECRET == 'change_me'

    def test_strong_secret_allowed_in_production(self):
        strong = 'a' * 64
        mod = _load_auth_utils_with(strong, 'production')
        assert mod.JWT_SECRET == strong

    def teardown_method(self, _method):
        # Restore safe env for subsequent tests
        os.environ['JWT_SECRET'] = 'test_secret_key_for_unit_tests_12345_LONG_ENOUGH'
        os.environ['APP_ENV'] = 'test'


# ─────────────────────────────────────────────────────────────────────────────
# JWT TTL
# ─────────────────────────────────────────────────────────────────────────────
class TestJwtTtl:
    def setup_method(self, _method):
        os.environ['JWT_SECRET'] = 'test_secret_key_for_unit_tests_12345_LONG_ENOUGH'
        os.environ['APP_ENV'] = 'test'
        os.environ.pop('JWT_EXPIRES_HOURS', None)
        global _auth
        import auth_utils
        importlib.reload(auth_utils)
        _auth = auth_utils

    def test_default_ttl_is_24_hours(self):
        assert _auth.JWT_EXPIRES_HOURS == 24

    def test_token_expires_within_24_hours(self):
        import jwt as pyjwt
        token = _auth.sign_jwt('user_test')
        payload = pyjwt.decode(token, _auth.JWT_SECRET, algorithms=[_auth.JWT_ALG])
        exp = datetime.utcfromtimestamp(payload['exp'])
        iat = datetime.utcfromtimestamp(payload['iat'])
        delta = exp - iat
        assert delta <= timedelta(hours=24) + timedelta(seconds=5)  # small tolerance

    def test_token_does_not_expire_in_under_23_hours(self):
        import jwt as pyjwt
        token = _auth.sign_jwt('user_test')
        payload = pyjwt.decode(token, _auth.JWT_SECRET, algorithms=[_auth.JWT_ALG])
        exp = datetime.utcfromtimestamp(payload['exp'])
        iat = datetime.utcfromtimestamp(payload['iat'])
        delta = exp - iat
        assert delta > timedelta(hours=23)

    def test_custom_ttl_via_env(self):
        os.environ['JWT_EXPIRES_HOURS'] = '48'
        import auth_utils
        importlib.reload(auth_utils)
        assert auth_utils.JWT_EXPIRES_HOURS == 48
        os.environ.pop('JWT_EXPIRES_HOURS', None)


# ─────────────────────────────────────────────────────────────────────────────
# Extra payload fields in sign_jwt
# ─────────────────────────────────────────────────────────────────────────────
class TestExtraPayload:
    def setup_method(self, _method):
        os.environ['JWT_SECRET'] = 'test_secret_key_for_unit_tests_12345_LONG_ENOUGH'
        os.environ['APP_ENV'] = 'test'
        import auth_utils
        importlib.reload(auth_utils)
        global _auth
        _auth = auth_utils

    def test_extra_field_in_token(self):
        token = _auth.sign_jwt('user1', extra={'role': 'admin'})
        payload = _auth.decode_jwt(token)
        assert payload.get('role') == 'admin'

    def test_extra_does_not_override_sub(self):
        token = _auth.sign_jwt('user1', extra={'sub': 'attacker'})
        payload = _auth.decode_jwt(token)
        assert payload['sub'] == 'user1'

    def test_no_extra_works_fine(self):
        token = _auth.sign_jwt('user2')
        payload = _auth.decode_jwt(token)
        assert payload['sub'] == 'user2'

    def test_create_access_token_carries_extra(self):
        token = _auth.create_access_token({'sub': 'u3', 'is_admin': True})
        payload = _auth.decode_jwt(token)
        assert payload['sub'] == 'u3'
        assert payload.get('is_admin') is True


# ─────────────────────────────────────────────────────────────────────────────
# Password-strength validator (routes_users._validate_password_strength)
# ─────────────────────────────────────────────────────────────────────────────
class TestPasswordStrength:
    def setup_method(self, _method):
        os.environ['JWT_SECRET'] = 'test_secret_key_for_unit_tests_12345_LONG_ENOUGH'
        os.environ['APP_ENV'] = 'test'
        from fastapi import HTTPException
        self.HTTPException = HTTPException
        import routes_users
        importlib.reload(routes_users)
        self._validate = routes_users._validate_password_strength

    def test_valid_password_passes(self):
        self._validate('Secure1pass')  # no exception

    def test_too_short_rejected(self):
        try:
            self._validate('Ab1')
            assert False
        except self.HTTPException as e:
            assert e.status_code == 400
            assert '8' in e.detail

    def test_no_digit_rejected(self):
        try:
            self._validate('NoDigitsHere')
            assert False
        except self.HTTPException as e:
            assert e.status_code == 400
            assert 'digit' in e.detail.lower()

    def test_no_uppercase_rejected(self):
        try:
            self._validate('lowercase1')
            assert False
        except self.HTTPException as e:
            assert e.status_code == 400
            assert 'uppercase' in e.detail.lower()

    def test_exactly_8_chars_with_requirements_passes(self):
        self._validate('Passw0rd')  # no exception

    def test_all_digits_rejected(self):
        try:
            self._validate('12345678')
            assert False
        except self.HTTPException:
            pass  # missing uppercase

    def test_common_password_with_upper_and_digit_passes(self):
        self._validate('Welcome1')  # technically meets minimum requirements
