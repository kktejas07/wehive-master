import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'wehive_test')
os.environ.setdefault('JWT_SECRET', 'test_secret_key_for_unit_tests_do_not_use_in_prod')
os.environ.setdefault('APP_ENV', 'test')
os.environ.setdefault('ADMIN_EMAILS', 'admin@test.com')

# Snapshot before test modules mutate os.environ at import (some force DB_NAME).
_LIVE_MONGO_URL = os.environ['MONGO_URL']
_LIVE_DB_NAME = os.environ['DB_NAME']

import pytest


@pytest.hookimpl(tryfirst=True)
def pytest_runtest_setup(item):
    """Live-server suites share one seeded admin; a lockout test would otherwise
    cascade 429s into every later admin login. Clear lockout state before each
    test's fixtures (incl. module-scoped admin_token fixtures) are set up."""
    if not os.environ.get('REACT_APP_BACKEND_URL'):
        return
    try:
        from pymongo import MongoClient
        c = MongoClient(_LIVE_MONGO_URL, serverSelectionTimeoutMS=500)
        c[_LIVE_DB_NAME]['login_attempts'].delete_many({})
        c.close()
    except Exception:
        pass
