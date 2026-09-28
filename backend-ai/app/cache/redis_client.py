import json
import logging
from typing import Optional, Any
import redis.asyncio as aioredis

logger = logging.getLogger("omnichannel-redis")

class RedisCacheClient:
    """Cliente assíncrono do Redis para cache de contexto e respostas de IA."""

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self.host = host
        self.port = port
        self.db = db
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            self._redis = aioredis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                decode_responses=True,
                socket_timeout=2.0
            )
            await self._redis.ping()
            logger.info("Conectado ao Redis com sucesso.")
        except Exception as e:
            logger.warning(f"Não foi possível conectar ao Redis ({self.host}:{self.port}): {e}")
            self._redis = None

    async def set_cache(self, key: str, value: Any, ttl_seconds: int = 3600):
        if self._redis:
            try:
                serialized = json.dumps(value) if not isinstance(value, str) else value
                await self._redis.set(key, serialized, ex=ttl_seconds)
            except Exception as e:
                logger.warning(f"Falha ao gravar no Redis: {e}")

    async def get_cache(self, key: str) -> Optional[Any]:
        if self._redis:
            try:
                val = await self._redis.get(key)
                if val:
                    try:
                        return json.loads(val)
                    except json.JSONDecodeError:
                        return val
            except Exception as e:
                logger.warning(f"Falha ao ler do Redis: {e}")
        return None

    async def close(self):
        if self._redis:
            await self._redis.aclose()
