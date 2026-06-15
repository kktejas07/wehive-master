"""Unit tests for serializers.py — pure serialization logic."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'wehive_test'
os.environ['JWT_SECRET'] = 'test_secret'
os.environ['ADMIN_EMAILS'] = 'admin@test.com'

from datetime import datetime
from serializers import serialize_doc, public_user, public_admin


class TestSerializeDoc:
    def test_converts_id_to_id(self):
        result = serialize_doc({'_id': 'abc123', 'name': 'test'})
        assert result['id'] == 'abc123'
        assert '_id' not in result

    def test_serializes_datetime(self):
        dt = datetime(2025, 6, 1, 12, 0, 0)
        result = serialize_doc({'_id': '1', 'created_at': dt})
        assert isinstance(result['created_at'], str)
        assert '2025' in result['created_at']

    def test_leaves_non_datetime_unchanged(self):
        result = serialize_doc({'_id': '1', 'name': 'hello', 'count': 42})
        assert result['name'] == 'hello'
        assert result['count'] == 42

    def test_convert_timeline(self):
        dt = datetime(2025, 6, 1, 12, 0, 0)
        doc = {
            '_id': '1',
            'timeline': [
                {'status': 'draft', 'at': dt},
                {'status': 'submitted', 'at': dt},
            ]
        }
        result = serialize_doc(doc, convert_timeline=True)
        for entry in result['timeline']:
            assert isinstance(entry['at'], str)

    def test_handles_empty_dict(self):
        result = serialize_doc({'_id': '1'})
        assert result['id'] == '1'

    def test_id_from_id_takes_precedence(self):
        result = serialize_doc({'_id': 'abc', 'name': 'test'})
        assert result['id'] == 'abc'


class TestPublicUser:
    def test_basic_fields(self):
        u = {'_id': 'u1', 'email': 'user@test.com'}
        result = public_user(u)
        assert result['id'] == 'u1'
        assert result['email'] == 'user@test.com'
        assert result['is_premium'] is False

    def test_premium_flag(self):
        u = {'_id': 'u1', 'is_premium': True, 'premium_since': datetime(2025, 1, 1)}
        result = public_user(u)
        assert result['is_premium'] is True
        assert isinstance(result['premium_since'], str)

    def test_include_admin_flag(self):
        u = {'_id': 'u1', 'email': 'admin@test.com'}
        result = public_user(u, include_admin_flag=True)
        assert result['is_admin'] is True

    def test_exclude_admin_flag_by_default(self):
        u = {'_id': 'u1', 'email': 'admin@test.com'}
        result = public_user(u)
        assert 'is_admin' not in result

    def test_serializes_datetimes(self):
        u = {'_id': 'u1', 'created_at': datetime(2025, 1, 1), 'updated_at': datetime(2025, 6, 1)}
        result = public_user(u)
        assert isinstance(result['created_at'], str)
        assert isinstance(result['updated_at'], str)


class TestPublicAdmin:
    def test_basic_fields(self):
        u = {'_id': 'a1', 'email': 'admin@wehive.co.in', 'name': 'Admin'}
        result = public_admin(u)
        assert result['id'] == 'a1'
        assert result['email'] == 'admin@wehive.co.in'
        assert result['name'] == 'Admin'

    def test_has_password_flag(self):
        u = {'_id': 'a1', 'password_hash': 'hash123'}
        result = public_admin(u)
        assert result['has_password'] is True

    def test_no_password_flag(self):
        u = {'_id': 'a1'}
        result = public_admin(u)
        assert result['has_password'] is False

    def test_staff_roles(self):
        u = {'_id': 'a1', 'is_staff': True, 'staff_role': 'moderator'}
        result = public_admin(u)
        assert result['is_staff'] is True
        assert result['staff_role'] == 'moderator'
