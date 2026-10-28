"""Application lifecycle — walk the full state machine."""

import pytest
import pytest_asyncio
from httpx import AsyncClient

from conftest import create_verified_user, create_application

pytestmark = pytest.mark.asyncio

TRANSITIONS = [
    "draft",
    "submitted",
    "in_review",
    "approved",
]


@pytest_asyncio.fixture
async def admin_jwt(client: AsyncClient) -> str:
    """Create a user and promote to admin so we can drive status changes."""
    token = await create_verified_user(client, email="admin-flow@wehive-test.com")
    from db import users
    # Decode the token to get the user id
    from auth_utils import decode_jwt
    payload = decode_jwt(token)
    await users.update_one({"_id": payload["sub"]}, {"$set": {"is_admin": True}})
    return token


async def test_full_state_machine(client: AsyncClient, admin_jwt: str):
    """Walk DRAFT → SUBMITTED → IN_REVIEW → APPROVED, asserting status at each step."""
    user_jwt = await create_verified_user(client, email="statemachine@wehive-test.com")
    app_id = await create_application(client, user_jwt)

    # Verify initial status
    resp = await client.get(
        f"/api/users/me/applications/{app_id}",
        headers={"Authorization": f"Bearer {user_jwt}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    app_data = data if "status" in data else data.get("application", data)
    assert app_data["status"] == "draft"

    for next_status in TRANSITIONS[1:]:
        resp = await client.patch(
            f"/api/admin/applications/{app_id}",
            json={"status": next_status},
            headers={"Authorization": f"Bearer {admin_jwt}"},
        )
        assert resp.status_code == 200, f"Failed transition to {next_status}: {resp.text}"

        resp = await client.get(
            f"/api/users/me/applications/{app_id}",
            headers={"Authorization": f"Bearer {user_jwt}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        app_data = data if "status" in data else data.get("application", data)
        assert app_data["status"] == next_status, (
            f"Expected {next_status}, got {app_data['status']}"
        )
