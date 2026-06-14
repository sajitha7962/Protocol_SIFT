"""
Redis stub — not used in the MongoDB MVP.
Kept as a compatibility shim so imports in legacy files don't break.
All operations are no-ops or return safe defaults.
"""
from __future__ import annotations

import json
from typing import Any

# In-memory cache as a lightweight replacement for Redis in the MVP
_cache: dict[str, str] = {}


async def set_json(key: str, value: Any, ttl: int | None = None) -> None:
    """Store JSON-serialisable value in the in-memory cache."""
    _cache[key] = json.dumps(value)


async def get_json(key: str) -> Any | None:
    """Retrieve and deserialise a cached value."""
    raw = _cache.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def delete_key(key: str) -> None:
    _cache.pop(key, None)


async def exists(key: str) -> bool:
    return key in _cache


# Compatibility stubs used by evidence_store.py via get_redis()
class _FakeRedis:
    async def sadd(self, key: str, *values: str) -> None:
        existing = json.loads(_cache.get(key, "[]"))
        for v in values:
            if v not in existing:
                existing.append(v)
        _cache[key] = json.dumps(existing)

    async def smembers(self, key: str) -> set:
        return set(json.loads(_cache.get(key, "[]")))

    async def srem(self, key: str, *values: str) -> None:
        existing = json.loads(_cache.get(key, "[]"))
        for v in values:
            if v in existing:
                existing.remove(v)
        _cache[key] = json.dumps(existing)

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        pass


_fake_redis = _FakeRedis()


def get_redis() -> _FakeRedis:
    return _fake_redis


async def close_redis() -> None:
    pass


async def verify_connectivity() -> bool:
    return True


# Celery stub — not used in MVP (FastAPI BackgroundTasks replace Celery)
class _FakeCelery:
    class control:
        @staticmethod
        def ping(timeout: float = 1.0):
            return []

    def task(self, *args, **kwargs):
        def decorator(fn):
            return fn
        return decorator


celery_app = _FakeCelery()
