import collections
import hashlib
import unittest

from app.access_control import allowed_document_roles, normalize_role, can_read_document


class SpeechAudioLruCacheTestHelper:
    """Réplica pura da estrutura de dados do cache LRU para validação de algoritmos."""
    def __init__(self, capacity: int = 3):
        self.capacity = capacity
        self._cache = collections.OrderedDict()

    def get(self, key: str):
        if key not in self._cache:
            return None
        self._cache.move_to_end(key)
        return self._cache[key]

    def put(self, key: str, value: bytes):
        if key in self._cache:
            self._cache.move_to_end(key)
            self._cache[key] = value
            return
        if len(self._cache) >= self.capacity:
            self._cache.popitem(last=False)
        self._cache[key] = value

    def __len__(self):
        return len(self._cache)


class TestDataStructures(unittest.TestCase):
    def test_lru_cache_eviction_and_order(self):
        cache = SpeechAudioLruCacheTestHelper(capacity=3)
        cache.put("k1", b"wav1")
        cache.put("k2", b"wav2")
        cache.put("k3", b"wav3")

        # Acessa k1, tornando k2 o elemento menos recentemente usado
        self.assertEqual(cache.get("k1"), b"wav1")

        # Adiciona k4, o que deve evictar k2 em O(1)
        cache.put("k4", b"wav4")

        self.assertEqual(cache.get("k1"), b"wav1")
        self.assertIsNone(cache.get("k2"))
        self.assertEqual(cache.get("k3"), b"wav3")
        self.assertEqual(cache.get("k4"), b"wav4")
        self.assertEqual(len(cache), 3)

    def test_sha256_cache_key_generation(self):
        text1 = "Olá, tudo bem?"
        text2 = "Olá, tudo bem?"
        text3 = "Outra frase"

        h1 = hashlib.sha256(text1.encode("utf-8")).hexdigest()
        h2 = hashlib.sha256(text2.encode("utf-8")).hexdigest()
        h3 = hashlib.sha256(text3.encode("utf-8")).hexdigest()

        self.assertEqual(h1, h2)
        self.assertNotEqual(h1, h3)
        self.assertEqual(len(h1), 64)

    def test_static_lookup_table_access_control(self):
        self.assertEqual(allowed_document_roles("EMPLOYEE"), frozenset({"EMPLOYEE"}))
        self.assertEqual(allowed_document_roles("ADMIN"), frozenset({"EMPLOYEE", "ADMIN"}))
        self.assertEqual(allowed_document_roles("SUPER_ADMIN"), frozenset({"EMPLOYEE", "ADMIN", "SUPER_ADMIN"}))
        self.assertTrue(can_read_document("ADMIN", "EMPLOYEE"))
        self.assertFalse(can_read_document("EMPLOYEE", "ADMIN"))


if __name__ == "__main__":
    unittest.main()
