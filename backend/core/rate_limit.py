"""Simple in-process sliding-window rate limiter.

Uses a per-key deque of timestamps. Thread-safe via threading.Lock.
Not suitable for multi-process deployments — replace with Redis in that case.

Usage (FastAPI dependency):
    from core.rate_limit import RateLimit
    otp_limiter = RateLimit(max_calls=5, window_seconds=60)

    @router.post('/send-otp')
    async def send_otp(req: Request, _=Depends(otp_limiter)):
        ...
"""
from __future__ import annotations

import time
import threading
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request


class RateLimit:
    """Callable FastAPI dependency that enforces a sliding-window rate limit."""

    def __init__(self, max_calls: int, window_seconds: int, by: str = 'ip'):
        self.max_calls = max_calls
        self.window = window_seconds
        self.by = by  # 'ip' or 'user'
        self._buckets: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def _key(self, request: Request) -> str:
        if self.by == 'ip':
            forwarded = request.headers.get('X-Forwarded-For', '')
            ip = forwarded.split(',')[0].strip() if forwarded else (request.client.host if request.client else 'unknown')
            return ip
        return 'global'

    def __call__(self, request: Request) -> None:
        key = self._key(request)
        now = time.monotonic()
        cutoff = now - self.window

        with self._lock:
            bucket = self._buckets[key]
            # Evict timestamps outside the current window.
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= self.max_calls:
                retry_after = int(self.window - (now - bucket[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f'Too many requests. Retry after {retry_after}s.',
                    headers={'Retry-After': str(retry_after)},
                )
            bucket.append(now)
