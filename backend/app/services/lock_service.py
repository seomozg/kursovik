import redis.asyncio as redis
from typing import Optional
import asyncio


class LockService:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def acquire_lock(self, key: str, ttl: int = 300) -> bool:
        """Пытается получить блокировку. Возвращает True если успешно."""
        return await self.redis.set(key, "locked", ex=ttl, nx=True)

    async def release_lock(self, key: str) -> None:
        """Освобождает блокировку."""
        await self.redis.delete(key)

    async def is_locked(self, key: str) -> bool:
        """Проверяет, установлена ли блокировка."""
        return await self.redis.exists(key) == 1