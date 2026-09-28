package com.omnichannel.backend.chat.infrastructure.persistence.redis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Cache de Sessões em Duas Camadas (Multi-Tier L1/L2):
 * - L1: Cache em memória de alta performance com estrutura Bounded LRU (sub-microsegundo).
 * - L2: Cluster Redis distribuído com TTL.
 *
 * Garante resiliência e baixa latência caso o Redis esteja indisponível.
 */
@Component
public class ChatSessionRedisCache {

    private static final Logger log = LoggerFactory.getLogger(ChatSessionRedisCache.class);
    private static final String KEY_PREFIX = "chat:session:";
    private static final int L1_MAX_CAPACITY = 1000;

    private record CacheEntry(Object data, long expiresAtMillis) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAtMillis;
        }
    }

    // Estrutura de Dados Bounded LRU thread-safe para L1 (Least Recently Used)
    private final Map<String, CacheEntry> localL1Cache = Collections.synchronizedMap(
            new LinkedHashMap<>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
                    return size() > L1_MAX_CAPACITY || eldest.getValue().isExpired();
                }
            }
    );

    private final RedisTemplate<String, Object> redisTemplate;

    public ChatSessionRedisCache(@Autowired(required = false) RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void cacheSessionContext(String sessionId, Object contextData, Duration ttl) {
        if (sessionId == null || contextData == null) {
            return;
        }

        long ttlMillis = (ttl != null) ? ttl.toMillis() : Duration.ofHours(2).toMillis();
        long expiresAt = System.currentTimeMillis() + ttlMillis;

        // 1. Armazena no cache L1 local (O(1))
        localL1Cache.put(sessionId, new CacheEntry(contextData, expiresAt));

        // 2. Persiste assincronamente/diretamente no Redis L2 se disponível
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(KEY_PREFIX + sessionId, contextData, Duration.ofMillis(ttlMillis));
                log.debug("Contexto da sessão salvo no Redis L2: {}", sessionId);
            } catch (Exception e) {
                log.warn("Redis temporariamente inacessível, operando via L1 em memória: {}", e.getMessage());
            }
        }
    }

    public Optional<Object> getSessionContext(String sessionId) {
        if (sessionId == null) {
            return Optional.empty();
        }

        // 1. Consulta L1 em memória (Zero I/O de rede)
        CacheEntry localEntry = localL1Cache.get(sessionId);
        if (localEntry != null) {
            if (!localEntry.isExpired()) {
                return Optional.of(localEntry.data());
            }
            localL1Cache.remove(sessionId);
        }

        // 2. Se falhar L1, consulta L2 no Redis
        if (redisTemplate != null) {
            try {
                Object val = redisTemplate.opsForValue().get(KEY_PREFIX + sessionId);
                if (val != null) {
                    // Reabastece o cache L1
                    localL1Cache.put(sessionId, new CacheEntry(val, System.currentTimeMillis() + Duration.ofMinutes(30).toMillis()));
                    return Optional.of(val);
                }
            } catch (Exception e) {
                log.warn("Falha ao recuperar sessão do Redis L2: {}", e.getMessage());
            }
        }

        return Optional.empty();
    }
}
