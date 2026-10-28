"""Shared fixtures for the WeHive test suite."""

import os
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

# Force test-safe environment *before* any app code loads.
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-for-hs256-validation-ok")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("OTP_CHANNEL", "mock")
os.environ.setdefault("MOCK_OTP_CODE", "123456")
os.environ.setdefault("PAYMENT_BYPASS_ENABLED", "true")

TEST_DB_NAME = f"wehive_test_{uuid.uuid4().hex[:8]}"
os.environ["DB_NAME"] = TEST_DB_NAME


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def mongo() -> AsyncGenerator[AsyncIOMotorClient, None]:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    yield client
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest_asyncio.fixture(scope="session")
async def app():
    from server import app as fastapi_app
    from db import ensure_indexes

    await ensure_indexes()
    return fastapi_app


@pytest_asyncio.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def create_verified_user(
    client: AsyncClient,
    email: str = None,
    phone: str = None,
) -> str:
    """Create a user via OTP flow and return a JWT access token."""
    identifier = email or phone or f"test-{uuid.uuid4().hex[:8]}@wehive-test.com"
    channel = "email" if "@" in identifier else "phone"

    resp = await client.post("/api/auth/send-otp", json={
        "identifier": identifier,
        "channel": channel,
        "purpose": "signup",
    })
    assert resp.status_code == 200, resp.text

    resp = await client.post("/api/auth/verify-otp", json={
        "identifier": identifier,
        "code": os.environ["MOCK_OTP_CODE"],
        "channel": channel,
        "name": "Test User",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def create_application(client: AsyncClient, user_jwt: str, country_id: str = "IN") -> str:
    """Submit a visa application and return its id."""
    resp = await client.post(
        "/api/users/me/applications",
        json={"country_id": country_id, "visa_type": "Tourist"},
        headers={"Authorization": f"Bearer {user_jwt}"},
    )
    assert resp.status_code in (200, 201), resp.text
    data = resp.json()
    return data.get("id") or data.get("_id") or data["application"]["id"]
