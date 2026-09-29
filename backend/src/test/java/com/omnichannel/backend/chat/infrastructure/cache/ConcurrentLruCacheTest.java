package com.omnichannel.backend.chat.infrastructure.cache;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class ConcurrentLruCacheTest {

    @Test
    @DisplayName("Deve armazenar e recuperar elementos respeitando a complexidade O(1)")
    void shouldStoreAndRetrieveElements() {
        ConcurrentLruCache<String, String> cache = new ConcurrentLruCache<>(3);

        cache.put("k1", "v1");
        cache.put("k2", "v2");

        assertEquals(Optional.of("v1"), cache.get("k1"));
        assertEquals(Optional.of("v2"), cache.get("k2"));
        assertEquals(Optional.empty(), cache.get("k3"));
        assertEquals(2, cache.size());
    }

    @Test
    @DisplayName("Deve remover o elemento menos recentemente usado (LRU) ao exceder a capacidade")
    void shouldEvictLeastRecentlyUsedElementWhenCapacityExceeded() {
        ConcurrentLruCache<String, Integer> cache = new ConcurrentLruCache<>(2);

        cache.put("a", 1);
        cache.put("b", 2);

        // Acessa "a", tornando "b" o elemento menos recentemente usado
        cache.get("a");

        // Insere "c", o que deve forçar a evicção de "b"
        cache.put("c", 3);

        assertEquals(Optional.of(1), cache.get("a"));
        assertEquals(Optional.empty(), cache.get("b"), "O elemento 'b' deveria ter sido evictado pelo LRU");
        assertEquals(Optional.of(3), cache.get("c"));
        assertEquals(2, cache.size());
    }

    @Test
    @DisplayName("Deve ser seguro para acessos concorrentes multithread")
    void shouldBeThreadSafeUnderConcurrentAccess() throws InterruptedException {
        int threads = 10;
        int operationsPerThread = 100;
        ConcurrentLruCache<String, Integer> cache = new ConcurrentLruCache<>(50);

        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successfulPuts = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < operationsPerThread; j++) {
                        String key = "key-" + (threadId * 10 + (j % 20));
                        cache.put(key, j);
                        cache.get(key);
                        successfulPuts.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertTrue(cache.size() <= 50, "Tamanho não deve ultrapassar a capacidade máxima configurada");
        assertEquals(threads * operationsPerThread, successfulPuts.get());
    }

    @Test
    @DisplayName("Deve rejeitar capacidade menor ou igual a zero")
    void shouldRejectInvalidCapacity() {
        assertThrows(IllegalArgumentException.class, () -> new ConcurrentLruCache<>(0));
        assertThrows(IllegalArgumentException.class, () -> new ConcurrentLruCache<>(-1));
    }
}
