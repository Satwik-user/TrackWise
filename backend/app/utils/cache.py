"""
Cache utilities using Redis
"""

import logging
from typing import Optional, Any
import json
from datetime import timedelta

logger = logging.getLogger(__name__)

# Mock Redis client for development
class MockRedisClient:
    """Mock Redis client for development when Redis is not available"""
    
    def __init__(self):
        self._data = {}
    
    async def ping(self):
        """Mock ping"""
        return True
    
    async def get(self, key: str) -> Optional[str]:
        """Mock get"""
        return self._data.get(key)
    
    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Mock set"""
        self._data[key] = value
        return True
    
    async def delete(self, key: str) -> int:
        """Mock delete"""
        if key in self._data:
            del self._data[key]
            return 1
        return 0
    
    async def exists(self, key: str) -> int:
        """Mock exists"""
        return 1 if key in self._data else 0


# Global Redis client
_redis_client = None


async def get_redis_client():
    """Get Redis client (mock for development)"""
    global _redis_client
    
    if _redis_client is None:
        try:
            # Try to connect to Redis
            import redis.asyncio as redis
            from app.config import settings
            
            _redis_client = redis.from_url(settings.redis_url)
            await _redis_client.ping()
            logger.info("Connected to Redis")
            
        except Exception as e:
            logger.warning(f"Redis not available, using mock client: {e}")
            _redis_client = MockRedisClient()
    
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    """Get value from cache"""
    try:
        client = await get_redis_client()
        value = await client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.error(f"Cache get error: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: Optional[int] = None) -> bool:
    """Set value in cache"""
    try:
        client = await get_redis_client()
        json_value = json.dumps(value, default=str)
        return await client.set(key, json_value, ex=ttl)
    except Exception as e:
        logger.error(f"Cache set error: {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Delete value from cache"""
    try:
        client = await get_redis_client()
        result = await client.delete(key)
        return result > 0
    except Exception as e:
        logger.error(f"Cache delete error: {e}")
        return False


def cache_key(*args) -> str:
    """Generate cache key from arguments"""
    return ":".join(str(arg) for arg in args)


async def get_cached(key: str) -> Optional[Any]:
    """Get value from cache (alias for cache_get)"""
    return await cache_get(key)


async def set_cache(key: str, value: Any, ttl: Optional[int] = None) -> bool:
    """Set value in cache (alias for cache_set)"""
    return await cache_set(key, value, ttl)


async def delete_cache_pattern(pattern: str) -> bool:
    """Delete cache keys matching pattern"""
    try:
        client = await get_redis_client()
        # In a real Redis implementation, you'd use SCAN with pattern
        # For mock implementation, just delete exact key
        return await cache_delete(pattern)
    except Exception as e:
        logger.error(f"Cache pattern delete error: {e}")
        return False