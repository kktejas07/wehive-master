"""Payment tests — webhook idempotency, admin-only guards, input validation."""

import hashlib
import hmac
import json
import os
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient

from conftest import create_verified_user

pytestmark = pytest.mark.asyncio


async def _create_order(client: AsyncClient, user_jwt: str, plan_id: str = "lite") -> dict:
    """Create a Razorpay order (or bypass order) and return the response dict."""
    resp = await client.post(
        "/api/payments/create-order",
        json={"plan_id": plan_id},
        headers={"Authorization": f"Bearer {user_jwt}"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _sign_webhook(body: bytes) -> str:
    """Compute the HMAC-SHA256 expected by the webhook handler."""
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@pytest_asyncio.fixture
async def admin_jwt(client: AsyncClient) -> str:
    token = await create_verified_user(client, email="admin-pay@wehive-test.com")
    from db import users
    from auth_utils import decode_jwt
    payload = decode_jwt(token)
    await users.update_one({"_id": payload["sub"]}, {"$set": {"is_admin": True}})
    return token


async def test_webhook_idempotency(client: AsyncClient):
    """Posting payment.captured twice for the same order must upgrade the plan exactly once."""
    user_jwt = await create_verified_user(client, email="idempotent@wehive-test.com")
    order = await _create_order(client, user_jwt)
    order_id = order["order_id"]
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": order["amount"],
                }
            }
        },
    }
    body = json.dumps(webhook_payload).encode()
    sig = _sign_webhook(body)

    resp1 = await client.post(
        "/api/payments/webhook",
        content=body,
        headers={"x-razorpay-signature": sig, "content-type": "application/json"},
    )
    assert resp1.status_code == 200

    resp2 = await client.post(
        "/api/payments/webhook",
        content=body,
        headers={"x-razorpay-signature": sig, "content-type": "application/json"},
    )
    assert resp2.status_code == 200

    # Verify premium was granted exactly once
    from db import users
    from auth_utils import decode_jwt
    payload = decode_jwt(user_jwt)
    user = await users.find_one({"_id": payload["sub"]})
    assert user.get("is_premium") is True
    assert user.get("plan_id") == "lite"


async def test_admin_status_change_forbidden(client: AsyncClient):
    """A non-admin JWT must get 403 on admin application-status endpoint."""
    user_jwt = await create_verified_user(client, email="nonadmin@wehive-test.com")

    resp = await client.patch(
        "/api/admin/applications/nonexistent-id",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {user_jwt}"},
    )
    assert resp.status_code in (401, 403), (
        f"Expected 401/403 for non-admin, got {resp.status_code}"
    )


async def test_invalid_status_string(client: AsyncClient, admin_jwt: str):
    """Passing an invalid status string must return 422 (Pydantic validation)."""
    resp = await client.patch(
        "/api/admin/applications/some-fake-id",
        json={"status": "BANANA"},
        headers={"Authorization": f"Bearer {admin_jwt}"},
    )
    assert resp.status_code == 422, (
        f"Expected 422 for invalid status, got {resp.status_code}: {resp.text}"
    )
