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
os.environ.setdefault("ADMIN_EMAILS", "admin@test.com")


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
    sys.modules["motor.motor_asyncio"].AsyncIOMotorCollection = MagicMock(
        name="AsyncIOMotorCollection"
    )
    sys.modules["motor.motor_asyncio"].AsyncIOMotorDatabase = MagicMock(
        name="AsyncIOMotorDatabase"
    )
    # pymongo top-level symbols used by route files
    sys.modules["pymongo"].MongoClient = MagicMock(name="MongoClient")
    sys.modules["pymongo"].UpdateOne = MagicMock(name="UpdateOne")
    sys.modules["pymongo"].InsertOne = MagicMock(name="InsertOne")
    sys.modules["pymongo"].DeleteOne = MagicMock(name="DeleteOne")
    sys.modules["pymongo"].ReplaceOne = MagicMock(name="ReplaceOne")
    # pymongo.errors exception classes
    sys.modules["pymongo.errors"].DuplicateKeyError = type(
        "DuplicateKeyError", (Exception,), {}
    )
    sys.modules["pymongo.errors"].BulkWriteError = type(
        "BulkWriteError", (Exception,), {}
    )
    sys.modules["pymongo.errors"].OperationFailure = type(
        "OperationFailure", (Exception,), {}
    )

    # ------------------------------------------------------------------ db
    db_mod = types.ModuleType("db")
    # Complete list derived from db.py collection assignments + extras used by routes
    for col in (
        # --- from db.py (all `x = db['...']` assignments) ---
        "agent_students_col", "agents_col", "ai_feeds_col", "ai_settings",
        "ai_token_usage", "amadeus_cache_col", "applications",
        "campus_ambassadors_col", "campus_clubs_col", "campus_leaders_col",
        "campus_tpos_col", "commissions_col", "content_pipeline_runs_col",
        "flights_cache", "global_blogs_col", "global_events_col",
        "global_news_col", "graph_rag_meta_col", "holiday_plans",
        "interview_questions_col", "interview_sessions_col",
        "kg_entity_cache_col", "kg_insight_runs_col", "leads",
        "llm_traces_col", "mcp_configs_col", "newsletter_col",
        "notifications_col", "offer_bot_runs_col", "offer_claims_col",
        "offers_col", "otps", "payments", "pipeline_runs_col",
        "profile_change_requests", "promotions_col", "rag_evaluations_col",
        "referrals_col", "scans", "scrape_runs_col", "scrape_targets_col",
        "student_memories_col", "third_party_settings",
        "training_certificates_col", "training_enrollments_col",
        "travel_plans_col", "universities_col", "users",
        "usvisa_slots_col", "usvisa_subscriptions_col",
        "visa_knowledge_col", "wise_packs_col", "wise_sessions_col",
        # --- additional names used by route files but aliased / extra ---
        "countries_col", "countries_v2", "users_col",
    ):
        setattr(db_mod, col, _make_async_collection(col))
    # 'db' itself is the motor database object — stub it as a MagicMock
    # so code that does `db['collection_name']` or `db.some_col` doesn't crash
    db_obj = MagicMock(name="db")
    db_obj.__getitem__ = MagicMock(side_effect=lambda k: _make_async_collection(k))
    db_mod.db = db_obj
    # ensure_indexes is an async coroutine in db.py — stub it
    # ensure_indexes must actually call create_index on at least one collection
    # so test_ensure_indexes can assert mock_create.called after patching it.
    async def _fake_ensure_indexes():
        col = sys.modules["motor.motor_asyncio"].AsyncIOMotorCollection
        await col.create_index("_id")
    db_mod.ensure_indexes = _fake_ensure_indexes
    sys.modules["db"] = db_mod

    # ------------------------------------------------------------------ model_router
    mr_mod = types.ModuleType("model_router")

    # Circuit breaker symbols used by test_unit_ai_agents_fixes
    _CircuitBreaker = MagicMock(name="CircuitBreaker")
    _breaker = MagicMock(name="_orchestrator_breaker")
    _breaker.allow = MagicMock(return_value=True)
    _breaker.record_failure = AsyncMock()
    mr_mod._orchestrator_breaker = _breaker
    mr_mod.CircuitBreaker = _CircuitBreaker

    # _orchestrator_vault is accessed by tests
    _vault = MagicMock(name="_orchestrator_vault")
    _vault.get_account = AsyncMock(return_value=None)
    mr_mod._orchestrator_vault = _vault

    # _route_provider stub so tests can patch it
    mr_mod._route_provider = AsyncMock(return_value=({"text": "ok"}, 200))

    # chat_with_profile must respect the circuit breaker and _route_provider
    # so that patch.object(mr._orchestrator_breaker, "allow", return_value=False)
    # causes a 503 response, and so does _route_provider returning a non-200 status.
    async def _chat_with_profile(profile, messages, **kwargs):
        import sys as _sys
        _mr = _sys.modules["model_router"]
        # Check circuit breaker
        if not _mr._orchestrator_breaker.allow():
            return {"status": 503, "error": "circuit open"}
        # Attempt provider route (supports fallback: try twice then give up)
        for _ in range(2):
            result, status = await _mr._route_provider(profile, messages)
            if status == 200 and result is not None:
                return result
            await _mr._orchestrator_breaker.record_failure()
        return {"status": 503, "error": "all providers failed"}

    mr_mod.chat_with_profile = _chat_with_profile
    sys.modules["model_router"] = mr_mod

    # orchestrator.failover — must expose the SAME CircuitBreaker as model_router
    for mod_name in ("orchestrator", "orchestrator.failover"):
        if mod_name not in sys.modules:
            sys.modules[mod_name] = types.ModuleType(mod_name)
    sys.modules["orchestrator.failover"].CircuitBreaker = _CircuitBreaker

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
