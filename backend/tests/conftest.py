"""Lightweight stubs for heavy runtime deps so pure-logic tests run without
a live MongoDB or motor installed.

Only the symbols actually used in the test suite are stubbed; real integration
tests that need a DB should run against a local/test MongoDB with motor installed.
"""

from __future__ import annotations

import sys
import types
from unittest.mock import AsyncMock, MagicMock


def _make_motor_stub() -> types.ModuleType:
    """Return a minimal motor stub so `from motor.motor_asyncio import ...` works."""
    motor = types.ModuleType("motor")
    motor_async = types.ModuleType("motor.motor_asyncio")

    class FakeCollection:
        def find_one(self, *a, **kw): ...
        def insert_one(self, *a, **kw): ...
        def update_one(self, *a, **kw): ...
        def find(self, *a, **kw): return iter([])

    class FakeDB:
        def __getitem__(self, name):
            return FakeCollection()

    class AsyncIOMotorClient:
        def __init__(self, *a, **kw): ...
        def __getitem__(self, name):
            return FakeDB()

    motor_async.AsyncIOMotorClient = AsyncIOMotorClient
    motor.motor_asyncio = motor_async
    return motor, motor_async


def _make_db_stub() -> types.ModuleType:
    """Return a minimal db stub exposing `db` as a MagicMock."""
    db_mod = types.ModuleType("db")

    class _FakeCollection(MagicMock):
        """Async-compatible collection stub."""
        find_one = AsyncMock(return_value=None)
        insert_one = AsyncMock(return_value=MagicMock(inserted_id="fake-id"))
        update_one = AsyncMock(return_value=MagicMock(modified_count=1))

        def find(self, *a, **kw):
            class _EmptyCursor:
                def __aiter__(self): return self
                async def __anext__(self): raise StopAsyncIteration
            return _EmptyCursor()

    class _FakeDB:
        def __getitem__(self, name):
            return _FakeCollection()

    db_mod.db = _FakeDB()
    return db_mod


# Install stubs before any test module imports them
motor_mod, motor_async_mod = _make_motor_stub()
sys.modules.setdefault("motor", motor_mod)
sys.modules.setdefault("motor.motor_asyncio", motor_async_mod)
sys.modules.setdefault("db", _make_db_stub())
