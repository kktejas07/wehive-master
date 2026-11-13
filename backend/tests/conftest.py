"""
conftest.py — inject fake db / motor / model_router / fastapi modules before
any test imports the wise.* package, so the test suite never tries to connect
to MongoDB, touch the network, or pull in incompatible native packages.
"""
import os
import sys
import types
from unittest.mock import MagicMock, AsyncMock

# Set test env before ANY module import so auth_utils.py won't raise on
# insecure JWT_SECRET default.
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-for-unit-tests")


def _make_async_collection(name: str):
    col = MagicMock(name=name)
    for method in (
        "find_one", "find", "insert_one", "insert_many",
        "update_one", "update_many", "delete_one", "delete_many",
        "count_documents", "aggregate",
    ):
        setattr(col, method, AsyncMock())
    return col


def _stub_module(name: str, **attrs):
    mod = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(mod, k, v)
    sys.modules[name] = mod
    return mod


def _inject_fake_modules():
    # ------------------------------------------------------------------ motor / pymongo
    for mod_name in ("motor", "motor.motor_asyncio", "pymongo", "pymongo.errors"):
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)
    sys.modules["motor.motor_asyncio"].AsyncIOMotorClient = MagicMock(
        name="AsyncIOMotorClient"
    )

    # ------------------------------------------------------------------ db
    db_mod = types.ModuleType("db")
    # All collections referenced by any route module under test
    for col in (
        # wise-specific
        "wise_packs_col",
        "visa_knowledge_col",
        "travel_plans_col",
        "ai_feeds_col",
        "interview_sessions_col",
        "interview_questions_col",
        "users_col",
        "pipeline_runs_col",
        "countries_col",
        "countries_v2",
        # core collections (also used by admin routes)
        "applications",
        "users",
        "otps",
        "scans",
        "payments",
        "notifications_col",
        "referrals_col",
        "universities_col",
        "holiday_plans",
        "leads",
        "flights_cache",
        "ai_settings",
        "third_party_settings",
        "profile_change_requests",
        "agents_col",
        "agent_students_col",
        "commissions_col",
        "usvisa_slots_col",
        "usvisa_subscriptions_col",
        "training_enrollments_col",
        "training_certificates_col",
        "kg_entity_cache_col",
        "kg_insight_runs_col",
        "promotions_col",
        "referrals_col",
    ):
        setattr(db_mod, col, _make_async_collection(col))
    # 'db' itself is the motor database object — stub it as a MagicMock
    # so code that does `db['collection_name']` or `db.some_col` doesn't crash
    db_obj = MagicMock(name="db")
    db_obj.__getitem__ = MagicMock(side_effect=lambda k: _make_async_collection(k))
    db_mod.db = db_obj
    sys.modules["db"] = db_mod

    # ------------------------------------------------------------------ model_router
    mr_mod = types.ModuleType("model_router")
    mr_mod.chat_with_profile = AsyncMock(
        return_value='{"score": 70, "feedback": "Good answer.", "method": "llm"}'
    )
    sys.modules["model_router"] = mr_mod

    # ------------------------------------------------------------------ apscheduler
    for mod_name in (
        "apscheduler",
        "apscheduler.schedulers",
        "apscheduler.schedulers.asyncio",
        "apscheduler.triggers",
        "apscheduler.triggers.cron",
    ):
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)
    sys.modules["apscheduler.schedulers.asyncio"].AsyncIOScheduler = MagicMock(
        name="AsyncIOScheduler"
    )

    # ------------------------------------------------------------------ anyio / starlette / fastapi
    # If the real packages are installed (they are in CI), import them normally
    # so other test files that use real route modules aren't broken.
    # Only fall back to hollow stubs when the real package is absent.
    _use_fastapi_stub = False
    try:
        import fastapi as _fastapi_real  # noqa: F401
    except Exception:
        _use_fastapi_stub = True

    if _use_fastapi_stub:
        # anyio stubs (only needed when fastapi isn't installed)
        anyio_mods = [
            "anyio", "anyio.abc", "anyio._core", "anyio._core._typedattr",
            "anyio._core._eventloop", "anyio._core._tasks",
            "anyio._backends", "anyio._backends._asyncio",
            "anyio.streams", "anyio.streams.memory",
        ]
        for m in anyio_mods:
            if m not in sys.modules:
                sys.modules[m] = types.ModuleType(m)
        sys.modules["anyio.abc"].ObjectReceiveStream = MagicMock(name="ObjectReceiveStream")

        starlette_mods = [
            "starlette", "starlette.routing", "starlette.requests",
            "starlette.responses", "starlette.background", "starlette.exceptions",
            "starlette.middleware", "starlette.middleware.base",
            "starlette.concurrency", "starlette.datastructures", "starlette.types",
            "starlette.status", "starlette.websockets", "starlette.testclient",
            "starlette.convertors",
        ]
        for m in starlette_mods:
            if m not in sys.modules:
                sys.modules[m] = types.ModuleType(m)

        fastapi_mods = [
            "fastapi", "fastapi.routing", "fastapi.params",
            "fastapi.dependencies", "fastapi.dependencies.utils",
            "fastapi.security", "fastapi.security.oauth2", "fastapi.security.http",
            "fastapi.exceptions", "fastapi.encoders", "fastapi.responses",
            "fastapi.middleware", "fastapi.middleware.cors",
            "fastapi.staticfiles", "fastapi.openapi", "fastapi.openapi.utils",
        ]
        for m in fastapi_mods:
            if m not in sys.modules:
                sys.modules[m] = types.ModuleType(m)

        fastapi_mod = sys.modules["fastapi"]
        fastapi_mod.APIRouter = MagicMock(name="APIRouter")
        fastapi_mod.Depends = MagicMock(name="Depends")
        fastapi_mod.HTTPException = type("HTTPException", (Exception,), {"status_code": 400})
        fastapi_mod.BackgroundTasks = MagicMock(name="BackgroundTasks")
        fastapi_mod.Request = MagicMock(name="Request")
        fastapi_mod.FastAPI = MagicMock(name="FastAPI")

    # ------------------------------------------------------------------ jose / passlib stubs
    for m in ("jose", "jose.jwt", "passlib", "passlib.context"):
        if m not in sys.modules:
            sys.modules[m] = types.ModuleType(m)

    # ------------------------------------------------------------------ httpx stub
    if "httpx" not in sys.modules:
        httpx_mod = types.ModuleType("httpx")
        httpx_mod.AsyncClient = MagicMock(name="AsyncClient")
        sys.modules["httpx"] = httpx_mod

    # ------------------------------------------------------------------ pydantic stub
    if "pydantic" not in sys.modules:
        pydantic_mod = types.ModuleType("pydantic")
        pydantic_mod.BaseModel = object  # basic stub
        pydantic_mod.Field = MagicMock(name="Field")
        pydantic_mod.validator = MagicMock(name="validator")
        pydantic_mod.root_validator = MagicMock(name="root_validator")
        sys.modules["pydantic"] = pydantic_mod

    # ------------------------------------------------------------------ extend fastapi stub with missing attrs
    fastapi_mod = sys.modules["fastapi"]
    for attr in ("Header", "Query", "Body", "Path", "Form", "File",
                 "UploadFile", "status", "responses", "WebSocket"):
        if not hasattr(fastapi_mod, attr):
            setattr(fastapi_mod, attr, MagicMock(name=attr))

    # ------------------------------------------------------------------ pre-import wise.* modules
    # patch("wise.pipeline.visa_knowledge_col") requires wise.pipeline to already
    # be in sys.modules when the patch context manager enters. Import them here.
    import importlib
    for submod in ("embeddings", "packs", "interview", "pipeline", "travel", "rag"):
        try:
            importlib.import_module(f"wise.{submod}")
        except Exception:
            pass  # best-effort; individual test errors will surface clearly


# Run once at collection time — before any test file is imported.
_inject_fake_modules()
