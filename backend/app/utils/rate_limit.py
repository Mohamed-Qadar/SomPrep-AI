"""
Lightweight, dependency-free rate limiting for FastAPI.

Per-IP sliding window kept in process memory — no extra packages required, so
it can never break imports in an environment that hasn't installed slowapi/redis.

Usage:
    from app.utils.rate_limit import rate_limit
    @router.post("/login", dependencies=[Depends(rate_limit("login", 10, 60))])

NOTE: state is per-process. For multi-worker / multi-instance production, back
this with Redis (or use slowapi) so limits are shared across processes.
"""
import threading
import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import HTTPException, Request, status

_LOCK = threading.Lock()
_HITS: "defaultdict[str, deque]" = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    def __init__(self, scope: str, max_calls: int, window_seconds: float):
        self.scope = scope
        self.max_calls = max_calls
        self.window = float(window_seconds)

    def __call__(self, request: Request) -> None:
        now = time.monotonic()
        key = f"{self.scope}:{_client_ip(request)}"
        with _LOCK:
            bucket = _HITS[key]
            cutoff = now - self.window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= self.max_calls:
                retry_after = max(1, int(self.window - (now - bucket[0])) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        "Codad badan ayaad isku dayday. Fadlan sug daqiiqad oo isku day "
                        f"markale. (Too many requests. Try again in ~{retry_after}s.)"
                    ),
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)


def rate_limit(scope: str, max_calls: int, window_seconds: float) -> RateLimiter:
    """Build a reusable FastAPI dependency enforcing max_calls per window per IP."""
    return RateLimiter(scope, max_calls, window_seconds)
