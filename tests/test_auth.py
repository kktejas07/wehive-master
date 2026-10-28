"""Auth tests — OTP rate-limiting, JWT tampering, secret validation."""

import os
import jwt as pyjwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

pytestmark = pytest.mark.asyncio


async def test_otp_rate_limit(client: AsyncClient):
    """Sixth OTP request within window must return 429."""
    payload = {"identifier": "ratelimit@wehive-test.com", "channel": "email", "purpose": "login"}

    for i in range(5):
        resp = await client.post("/api/auth/send-otp", json=payload)
        assert resp.status_code in (200, 429), f"Attempt {i+1}: {resp.status_code} {resp.text}"

    resp = await client.post("/api/auth/send-otp", json=payload)
    assert resp.status_code == 429, (
        f"Expected 429 on 6th OTP request but got {resp.status_code}: {resp.text}"
    )


async def test_weak_secret_raises():
    """App startup must raise RuntimeError when JWT_SECRET is a short/insecure default."""
    saved = os.environ.get("JWT_SECRET")
    saved_env = os.environ.get("APP_ENV")
    try:
        os.environ["JWT_SECRET"] = "short"
        os.environ["APP_ENV"] = "production"

        with pytest.raises(RuntimeError, match="(?i)jwt_secret"):
            import importlib
            import auth_utils
            importlib.reload(auth_utils)
    finally:
        if saved is not None:
            os.environ["JWT_SECRET"] = saved
        if saved_env is not None:
            os.environ["APP_ENV"] = saved_env
        import importlib, auth_utils
        importlib.reload(auth_utils)


async def test_tampered_jwt(client: AsyncClient):
    """A JWT signed with the wrong key must be rejected with 401."""
    fake_token = pyjwt.encode(
        {"sub": "fake-user-id", "exp": 9999999999},
        "wrong-secret-key",
        algorithm="HS256",
    )
    resp = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert resp.status_code == 401
