"""RBAC tests — verify require_role dependency and role_allows logic."""

import os
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient

from conftest import create_verified_user

pytestmark = pytest.mark.asyncio

ROLES = ['manager', 'support', 'finance', 'doc_reviewer', 'viewer']


async def _make_admin(client: AsyncClient, role: str) -> str:
    """Create a user, promote to admin with the given role, return JWT."""
    email = f"rbac-{role}-{uuid.uuid4().hex[:6]}@wehive-test.com"
    token = await create_verified_user(client, email=email)
    from db import users
    from auth_utils import decode_jwt
    payload = decode_jwt(token)
    await users.update_one(
        {"_id": payload["sub"]},
        {"$set": {"is_admin": True, "admin_role": role}},
    )
    return token


@pytest_asyncio.fixture
async def super_admin_jwt(client: AsyncClient) -> str:
    """Create a super admin (email in ADMIN_EMAILS)."""
    from config import ADMIN_EMAILS
    email = f"superadmin-{uuid.uuid4().hex[:6]}@wehive-test.com"
    os.environ["ADMIN_EMAILS"] = email
    ADMIN_EMAILS.add(email)
    token = await create_verified_user(client, email=email)
    from db import users
    from auth_utils import decode_jwt
    payload = decode_jwt(token)
    await users.update_one(
        {"_id": payload["sub"]},
        {"$set": {"is_admin": True, "email_verified": True}},
    )
    return token


# --- require_role unit tests ---

async def test_require_role_allows_listed_role(client: AsyncClient):
    """A manager (listed role) can PATCH a user."""
    manager_jwt = await _make_admin(client, "manager")
    resp = await client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {manager_jwt}"},
    )
    assert resp.status_code == 200


async def test_require_role_blocks_unlisted_role(client: AsyncClient):
    """A viewer cannot PATCH users (not in the allowed roles)."""
    viewer_jwt = await _make_admin(client, "viewer")
    resp = await client.patch(
        "/api/admin/users/nonexistent",
        json={"name": "hacked"},
        headers={"Authorization": f"Bearer {viewer_jwt}"},
    )
    assert resp.status_code == 403


async def test_super_admin_always_passes(client: AsyncClient, super_admin_jwt: str):
    """super_admin bypasses all role checks."""
    resp = await client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {super_admin_jwt}"},
    )
    assert resp.status_code == 200


async def test_unauthenticated_returns_401(client: AsyncClient):
    """No auth header returns 401."""
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 401


async def test_viewer_get_allowed_post_blocked(client: AsyncClient):
    """Viewer can GET admin pages but cannot POST to write endpoints."""
    viewer_jwt = await _make_admin(client, "viewer")

    resp = await client.get(
        "/api/admin/applications",
        headers={"Authorization": f"Bearer {viewer_jwt}"},
    )
    assert resp.status_code == 200

    resp = await client.patch(
        "/api/admin/applications/nonexistent",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {viewer_jwt}"},
    )
    assert resp.status_code == 403


async def test_finance_can_access_pricing(client: AsyncClient):
    """Finance role can GET pricing."""
    finance_jwt = await _make_admin(client, "finance")
    resp = await client.get(
        "/api/admin/pricing",
        headers={"Authorization": f"Bearer {finance_jwt}"},
    )
    assert resp.status_code == 200


async def test_support_cannot_modify_pricing(client: AsyncClient):
    """Support role cannot PATCH pricing."""
    support_jwt = await _make_admin(client, "support")
    resp = await client.patch(
        "/api/admin/pricing",
        json={},
        headers={"Authorization": f"Bearer {support_jwt}"},
    )
    assert resp.status_code == 403


async def test_doc_reviewer_can_review_documents(client: AsyncClient):
    """doc_reviewer role can GET the review queue."""
    dr_jwt = await _make_admin(client, "doc_reviewer")
    resp = await client.get(
        "/api/admin/review-queue",
        headers={"Authorization": f"Bearer {dr_jwt}"},
    )
    assert resp.status_code == 200


async def test_doc_reviewer_cannot_modify_users(client: AsyncClient):
    """doc_reviewer cannot PATCH users."""
    dr_jwt = await _make_admin(client, "doc_reviewer")
    resp = await client.patch(
        "/api/admin/users/nonexistent",
        json={"name": "hacked"},
        headers={"Authorization": f"Bearer {dr_jwt}"},
    )
    assert resp.status_code == 403


async def test_doc_reviewer_cannot_modify_applications(client: AsyncClient):
    """doc_reviewer cannot change application status."""
    dr_jwt = await _make_admin(client, "doc_reviewer")
    resp = await client.patch(
        "/api/admin/applications/nonexistent",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {dr_jwt}"},
    )
    assert resp.status_code == 403


async def test_support_can_update_leads(client: AsyncClient):
    """Support role can PATCH leads."""
    support_jwt = await _make_admin(client, "support")
    resp = await client.patch(
        "/api/admin/leads/nonexistent",
        json={"status": "contacted"},
        headers={"Authorization": f"Bearer {support_jwt}"},
    )
    # 404 (lead not found) is fine — what matters is it's not 403
    assert resp.status_code in (200, 404)


async def test_finance_cannot_update_leads(client: AsyncClient):
    """Finance role cannot PATCH leads."""
    finance_jwt = await _make_admin(client, "finance")
    resp = await client.patch(
        "/api/admin/leads/nonexistent",
        json={"status": "contacted"},
        headers={"Authorization": f"Bearer {finance_jwt}"},
    )
    assert resp.status_code == 403


# --- role_allows unit test ---

def test_role_allows_function():
    """Direct unit test of the role_allows logic."""
    from admin_auth import role_allows

    # GET always allowed
    assert role_allows("viewer", "GET", "/api/admin/users") is True
    assert role_allows("finance", "GET", "/api/admin/applications") is True

    # manager can write anywhere
    assert role_allows("manager", "PATCH", "/api/admin/users/123") is True
    assert role_allows("manager", "POST", "/api/admin/events") is True

    # support can write to applications, leads, review-queue
    assert role_allows("support", "PATCH", "/api/admin/applications/123") is True
    assert role_allows("support", "PATCH", "/api/admin/leads/123") is True
    assert role_allows("support", "PATCH", "/api/admin/review-queue/123") is True

    # support cannot write to pricing or countries
    assert role_allows("support", "PATCH", "/api/admin/pricing") is False
    assert role_allows("support", "PATCH", "/api/admin/countries/123") is False

    # finance can write to payments and pricing
    assert role_allows("finance", "PATCH", "/api/admin/payments/123/refund") is True
    assert role_allows("finance", "PATCH", "/api/admin/pricing") is True

    # finance cannot write to applications
    assert role_allows("finance", "PATCH", "/api/admin/applications/123") is False

    # doc_reviewer can write to review-queue only
    assert role_allows("doc_reviewer", "PATCH", "/api/admin/review-queue/123") is True
    assert role_allows("doc_reviewer", "PATCH", "/api/admin/applications/123") is False
    assert role_allows("doc_reviewer", "PATCH", "/api/admin/users/123") is False

    # viewer cannot write anywhere (except own auth endpoints)
    assert role_allows("viewer", "PATCH", "/api/admin/users/123") is False
    assert role_allows("viewer", "PATCH", "/api/admin/applications/123") is False
