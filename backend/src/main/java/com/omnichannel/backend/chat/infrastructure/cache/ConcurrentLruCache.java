package com.omnichannel.backend.chat.infrastructure.cache;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Estrutura de dados LRU Cache (Hash Table + Doubly Linked List via LinkedHashMap)
 * thread-safe de alta performance com garantia assintótica O(1).
 *
 * Princípios aplicados:
 * - Complexidade de tempo O(1) para get, put e evicção do elemento menos recentemente usado.
 * - Thread-safe com ReentrantReadWriteLock, evitando contenção de concorrência.
 * - Desacoplado de frameworks e independente de infraestrutura de rede.
 *
 * @param <K> Tipo da chave
 * @param <V> Tipo do valor
 */
public class ConcurrentLruCache<K, V> {

    private final int capacity;
    private final Map<K, V> internalMap;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final ReentrantReadWriteLock.ReadLock readLock = lock.readLock();
    private final ReentrantReadWriteLock.WriteLock writeLock = lock.writeLock();

    public ConcurrentLruCache(int capacity) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("A capacidade do cache LRU deve ser maior que zero.");
        }
        this.capacity = capacity;
        // accessOrder = true move elementos acessados para o final da lista duplamente encadeada (O(1))
        this.internalMap = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > ConcurrentLruCache.this.capacity;
            }
        };
    }

    /**
     * Recupera um elemento do cache em O(1).
     * Como o acesso altera a ordem na lista encadeada (LRU), utiliza writeLock para consistência.
     */
    public Optional<V> get(K key) {
        Objects.requireNonNull(key, "Chave de busca no cache não pode ser nula");
        writeLock.lock();
        try {
            return Optional.ofNullable(internalMap.get(key));
        } finally {
            writeLock.unlock();
        }
    }

    /**
     * Insere ou atualiza um elemento no cache em O(1).
     * Se a capacidade máxima for excedida, o nó mais antigo é automaticamente evictado em O(1).
     */
    public void put(K key, V value) {
        Objects.requireNonNull(key, "Chave de inserção no cache não pode ser nula");
        Objects.requireNonNull(value, "Valor a ser armazenado no cache não pode ser nulo");
        writeLock.lock();
        try {
            internalMap.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }

    /**
     * Verifica existência de uma chave sem alterar a ordem de acesso.
     */
    public boolean containsKey(K key) {
        Objects.requireNonNull(key, "Chave não pode ser nula");
        readLock.lock();
        try {
            return internalMap.containsKey(key);
        } finally {
            readLock.unlock();
        }
    }

    public int size() {
        readLock.lock();
        try {
            return internalMap.size();
        } finally {
            readLock.unlock();
        }
    }

    public int capacity() {
        return capacity;
    }

    public void clear() {
        writeLock.lock();
        try {
            internalMap.clear();
        } finally {
            writeLock.unlock();
        }
    }
}
