"""Unit tests for rate_limit.py — sliding-window in-process rate limiter.

Tests:
- Allows up to max_calls per window
- Blocks on max_calls+1 with HTTP 429
- Old timestamps expire and free up slots
- Different IPs have independent buckets
- X-Forwarded-For header is used for IP detection
- Retry-After header is present in 429 response
"""
import sys
import os
import time
import threading
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import HTTPException
from rate_limit import RateLimit


def _make_request(ip: str = '1.2.3.4', forwarded: str = None) -> MagicMock:
    """Build a minimal fake FastAPI Request with the given client IP."""
    req = MagicMock()
    req.client.host = ip
    headers = {}
    if forwarded:
        headers['X-Forwarded-For'] = forwarded
    req.headers.get = lambda key, default=None: headers.get(key, default)
    return req


class TestRateLimitBasic:
    def test_allows_up_to_max_calls(self):
        limiter = RateLimit(max_calls=3, window_seconds=60)
        req = _make_request('10.0.0.1')
        for _ in range(3):
            limiter(req)  # should not raise

    def test_blocks_on_max_plus_one(self):
        limiter = RateLimit(max_calls=3, window_seconds=60)
        req = _make_request('10.0.0.2')
        for _ in range(3):
            limiter(req)
        try:
            limiter(req)
            assert False, 'Expected HTTPException(429)'
        except HTTPException as e:
            assert e.status_code == 429

    def test_429_has_retry_after_header(self):
        limiter = RateLimit(max_calls=1, window_seconds=30)
        req = _make_request('10.0.0.3')
        limiter(req)
        try:
            limiter(req)
            assert False
        except HTTPException as e:
            assert e.status_code == 429
            assert 'Retry-After' in e.headers
            assert int(e.headers['Retry-After']) > 0

    def test_429_detail_mentions_retry(self):
        limiter = RateLimit(max_calls=1, window_seconds=60)
        req = _make_request('10.0.0.4')
        limiter(req)
        try:
            limiter(req)
        except HTTPException as e:
            assert 'retry' in e.detail.lower() or 'too many' in e.detail.lower()


class TestRateLimitWindow:
    def test_old_calls_expire_and_free_slots(self):
        """Calls outside the window should not count."""
        limiter = RateLimit(max_calls=2, window_seconds=1)
        req = _make_request('10.1.0.1')
        limiter(req)
        limiter(req)
        # Exhaust limit
        try:
            limiter(req)
            assert False, 'Should have been blocked'
        except HTTPException:
            pass
        # Wait for the window to expire
        time.sleep(1.1)
        # Should be allowed again
        limiter(req)  # no exception

    def test_calls_in_new_window_allowed(self):
        limiter = RateLimit(max_calls=1, window_seconds=1)
        req = _make_request('10.1.0.2')
        limiter(req)
        time.sleep(1.05)
        limiter(req)  # second window — should not raise


class TestRateLimitIsolation:
    def test_different_ips_have_independent_buckets(self):
        limiter = RateLimit(max_calls=2, window_seconds=60)
        req_a = _make_request('192.168.1.1')
        req_b = _make_request('192.168.1.2')
        limiter(req_a)
        limiter(req_a)
        # A is exhausted, B should still be fine
        limiter(req_b)
        limiter(req_b)
        try:
            limiter(req_a)
            assert False
        except HTTPException as e:
            assert e.status_code == 429
        # B is also now exhausted independently
        try:
            limiter(req_b)
            assert False
        except HTTPException as e:
            assert e.status_code == 429

    def test_forwarded_for_header_used(self):
        """X-Forwarded-For takes precedence over client.host."""
        limiter = RateLimit(max_calls=1, window_seconds=60)
        # Two requests with same client.host but different X-Forwarded-For
        req_a = _make_request('10.0.0.1', forwarded='203.0.113.1')
        req_b = _make_request('10.0.0.1', forwarded='203.0.113.2')
        limiter(req_a)  # uses 203.0.113.1 as key
        limiter(req_b)  # different key — should not raise

    def test_forwarded_for_comma_list_uses_first(self):
        """When X-Forwarded-For is a comma list, use the leftmost (client) IP."""
        limiter = RateLimit(max_calls=1, window_seconds=60)
        req = _make_request('10.0.0.1', forwarded='1.2.3.4, 5.6.7.8, 9.10.11.12')
        limiter(req)  # key should be '1.2.3.4'
        # Second request from same real IP should be blocked
        req2 = _make_request('10.0.0.1', forwarded='1.2.3.4')
        try:
            limiter(req2)
            assert False
        except HTTPException as e:
            assert e.status_code == 429


class TestRateLimitConcurrency:
    def test_thread_safety(self):
        """Concurrent requests from the same IP should not exceed max_calls."""
        limiter = RateLimit(max_calls=5, window_seconds=60)
        req = _make_request('172.16.0.1')
        errors = []
        allowed = []

        def make_request():
            try:
                limiter(req)
                allowed.append(1)
            except HTTPException as e:
                if e.status_code == 429:
                    errors.append(1)

        threads = [threading.Thread(target=make_request) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(allowed) == 5, f'Expected exactly 5 allowed, got {len(allowed)}'
        assert len(errors) == 15, f'Expected 15 blocked, got {len(errors)}'


class TestRateLimitEdgeCases:
    def test_max_calls_one(self):
        limiter = RateLimit(max_calls=1, window_seconds=60)
        req = _make_request('10.2.0.1')
        limiter(req)
        try:
            limiter(req)
            assert False
        except HTTPException as e:
            assert e.status_code == 429

    def test_no_client_ip(self):
        """Falls back gracefully when client is None."""
        limiter = RateLimit(max_calls=2, window_seconds=60)
        req = MagicMock()
        req.client = None
        req.headers.get = lambda key, default=None: None
        limiter(req)  # should not crash
        limiter(req)
        try:
            limiter(req)
            assert False
        except HTTPException as e:
            assert e.status_code == 429
