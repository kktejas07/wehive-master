import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'wehive_test')
os.environ.setdefault('JWT_SECRET', 'test_secret_key_for_unit_tests_do_not_use_in_prod')
os.environ.setdefault('APP_ENV', 'test')
os.environ.setdefault('ADMIN_EMAILS', 'admin@test.com')
