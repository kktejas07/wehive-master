"""Focused TestClient route tests. Tests cover route handler execution paths.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "wehive_test"
os.environ["JWT_SECRET"] = "testkey_testkey_testkey_testkey_testkey_12345"
os.environ["JWT_ALG"] = "HS256"
os.environ["APP_ENV"] = "test"
os.environ["ADMIN_EMAILS"] = "admin@test.com"
os.environ["OTP_LENGTH"] = "6"
os.environ["OTP_TTL_MINUTES"] = "10"
os.environ["JWT_EXPIRES_HOURS"] = "720"

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


class AsyncIter:
    def __init__(self, items):
        self.items = items
    def __aiter__(self):
        return self._async_gen()
    async def _async_gen(self):
        for item in self.items:
            yield item
    def sort(self, *args, **kwargs):
        return self
    def limit(self, n):
        return self


def col_mock(**kw):
    d = dict(
        find_one=AsyncMock(return_value=None),
        find=MagicMock(return_value=AsyncIter([])),
        insert_one=AsyncMock(),
        update_one=AsyncMock(),
        update_many=AsyncMock(),
        delete_one=AsyncMock(),
        count_documents=AsyncMock(return_value=0),
        distinct=AsyncMock(return_value=[]),
        create_index=AsyncMock(),
        aggregate=MagicMock(return_value=AsyncIter([])),
        find_one_and_update=AsyncMock(return_value=None),
        bulk_write=AsyncMock(),
    )
    d.update(kw)
    m = MagicMock()
    for k, v in d.items():
        setattr(m, k, v)
    return m


# ─── Routes Public ───────────────────────────────────────────────────────────
class TestPublicRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_public.settings_col") as s, \
             patch("routes_public.events_col") as e, \
             patch("routes_public.applications_col") as a, \
             patch("routes_public.countries_col") as c:
            s.find_one = AsyncMock(return_value=None)
            e.find = MagicMock(return_value=AsyncIter([]))
            a.find_one = AsyncMock(return_value={"_id": "a1", "country_id": "ca", "visa_type": "Tourist", "status": "in_review", "timeline": []})
            c.find_one = AsyncMock(return_value={"name": "Canada"})
            import modules.core_api.routes_public as routes_public
            app = FastAPI(); app.include_router(routes_public.router); self.client = TestClient(app)
            yield

    def test_pricing_ok(self):
        assert self.client.get("/public/pricing").status_code == 200
    def test_track_found(self):
        assert self.client.get("/public/track/a1").status_code == 200


# ─── Routes Leads ────────────────────────────────────────────────────────────
class TestLeadsRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_leads.leads") as col:
            col.insert_one = AsyncMock()
            import modules.core_api.routes_leads as routes_leads
            app = FastAPI(); app.include_router(routes_leads.router); self.client = TestClient(app)
            yield
    def test_create(self):
        r = self.client.post("/leads", json={"name": "J", "email": "j@t.com", "message": "Hi"})
        assert r.status_code == 200


# ─── Routes i18n ────────────────────────────────────────────────────────────
class TestI18nRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_i18n.translations_col") as col, \
             patch("routes_i18n.get_current_admin_flex") as auth:
            col.find_one = AsyncMock(return_value=None)
            col.update_one = AsyncMock()
            auth.return_value = {"_id": "a1"}
            import routes_i18n; app = FastAPI(); app.include_router(routes_i18n.router); self.client = TestClient(app)
            yield
    def test_get(self):
        assert self.client.get("/i18n/universities/u1").status_code == 200
    def test_locales(self):
        r = self.client.get("/i18n/locales"); assert r.status_code == 200
    def test_put(self):
        r = self.client.put("/i18n/universities/u1", json={"locale": "es", "fields": {"name": "Hola"}})
        assert r.status_code == 200
    def test_bad_locale(self):
        assert self.client.get("/i18n/universities/u1?locale=zz").status_code == 400


# ─── Routes Countries ────────────────────────────────────────────────────────
class TestCountriesRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_countries.db") as db:
            c = col_mock(
                find_one=AsyncMock(return_value={"id": "ca", "name": "Canada", "categories": [], "delivery": {}}),
                distinct=AsyncMock(return_value=["Tourist"]),
            )
            db.__getitem__.return_value = c
            import modules.core_api.routes_countries as routes_countries
            app = FastAPI(); app.include_router(routes_countries.router); self.client = TestClient(app)
            yield
    def test_list(self):
        assert self.client.get("/countries").status_code == 200
    def test_get(self):
        assert self.client.get("/countries/ca").status_code == 200


# ─── Routes Notifications ────────────────────────────────────────────────────
class TestNotificationsRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_notifications.notifications_col") as col:
            col.update_one = AsyncMock(); col.update_many = AsyncMock()
            col.delete_one = AsyncMock(); col.count_documents = AsyncMock(return_value=5)
            from core.auth_utils import get_current_user
            import modules.core_api.routes_notifications as routes_notifications
            app = FastAPI(); app.include_router(routes_notifications.router)
            app.dependency_overrides[get_current_user] = lambda: {"_id": "u1"}
            self.client = TestClient(app)
            yield
    def test_list(self):
        assert self.client.get("/notifications").status_code == 200
    def test_mark_read(self):
        assert self.client.post("/notifications/mark-read", json={"ids": ["n1"]}).status_code == 200
    def test_mark_all(self):
        assert self.client.post("/notifications/mark-all-read").status_code == 200
    def test_delete(self):
        assert self.client.delete("/notifications/n1").status_code == 200


# ─── Routes Programs ────────────────────────────────────────────────────────
class TestProgramsRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_programs.db") as db:
            c = col_mock(
                find=MagicMock(return_value=AsyncIter([{"_id": "p1"}])),
                find_one=AsyncMock(return_value={"_id": "p1", "name": "CS", "requirements": []}),
            )
            db.__getitem__.return_value = c
            import modules.core_api.routes_programs as routes_programs
            app = FastAPI(); app.include_router(routes_programs.router); self.client = TestClient(app)
            yield
    def test_list(self):
        assert self.client.get("/programs/u1").status_code == 200
    def test_get(self):
        assert self.client.get("/programs/u1/p1").status_code == 200


# ─── Routes Reviews ─────────────────────────────────────────────────────────
class TestReviewsRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_reviews.reviews_col") as col:
            col.insert_one = AsyncMock(); col.delete_one = AsyncMock()
            col.count_documents = AsyncMock(return_value=0)
            from core.auth_utils import get_current_user
            import modules.core_api.routes_reviews as routes_reviews
            app = FastAPI(); app.include_router(routes_reviews.router)
            app.dependency_overrides[get_current_user] = lambda: {"_id": "u1"}
            self.client = TestClient(app)
            yield
    def test_list(self):
        assert self.client.get("/reviews/u1").status_code == 200


# ─── Routes Profile Requests ────────────────────────────────────────────────
class TestProfileRequestRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_profile_requests.profile_change_requests") as col:
            col.insert_one = AsyncMock(); col.update_one = AsyncMock()
            from core.auth_utils import get_current_user
            import modules.agents.routes_profile_requests as routes_profile_requests
            app = FastAPI(); app.include_router(routes_profile_requests.router)
            app.dependency_overrides[get_current_user] = lambda: {"_id": "u1"}
            self.client = TestClient(app)
            yield
    def test_list(self):
        assert self.client.get("/users/me/profile-requests").status_code == 200


# ─── Routes Chatbot ─────────────────────────────────────────────────────────
class TestChatbotRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_chatbot.chat_sessions") as s, \
             patch("routes_chatbot.chat_messages") as m, \
             patch("routes_chatbot.notifications_col") as n:
            s.insert_one = AsyncMock()
            s.find_one = AsyncMock(return_value={"_id": "s1", "user_id": "u1"})
            m.insert_one = AsyncMock()
            n.insert_one = AsyncMock()
            from core.auth_utils import get_current_user_optional
            import modules.integrations.routes_chatbot as routes_chatbot
            app = FastAPI(); app.include_router(routes_chatbot.router)
            app.dependency_overrides[get_current_user_optional] = lambda: {"_id": "u1"}
            self.client = TestClient(app)
            yield
    def test_start_session(self):
        r = self.client.post("/chatbot/sessions", json={})
        assert r.status_code == 200
        assert r.json()["session_id"]


# ─── Routes Users ───────────────────────────────────────────────────────────
class TestUsersRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        with patch("routes_users.users") as users, \
             patch("routes_users.applications") as apps, \
             patch("routes_users.holiday_plans") as plans, \
             patch("routes_users.db") as db:
            users.find_one = AsyncMock(return_value={"_id": "u1", "email": "u@t.com"})
            users.update_one = AsyncMock()
            apps.insert_one = AsyncMock()
            apps.find = MagicMock(return_value=AsyncIter([]))
            plans.insert_one = AsyncMock()
            plans.find = MagicMock(return_value=AsyncIter([]))
            from core.auth_utils import get_current_user
            import modules.core_api.routes_users as routes_users
            app = FastAPI(); app.include_router(routes_users.router)
            app.dependency_overrides[get_current_user] = lambda: {"_id": "u1"}
            self.client = TestClient(app)
            yield
    def test_update_me(self):
        r = self.client.put("/users/me", json={"name": "NewName"})
        assert r.status_code == 200
    def test_list_apps(self):
        assert self.client.get("/users/me/applications").status_code == 200
    def test_create_app(self):
        r = self.client.post("/users/me/applications", json={"country_id": "ca", "visa_type": "Tourist"})
        assert r.status_code in (200, 201, 422)
    def test_list_saved_plans(self):
        assert self.client.get("/users/me/saved-plans").status_code == 200
