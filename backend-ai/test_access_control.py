import unittest

from app.access_control import allowed_document_roles, can_read_document, normalize_role
from app.rag.chroma_store import ChromaVectorStore


class FakeCollection:
    def count(self):
        return 10

    def query(self, **kwargs):
        self.where = kwargs["where"]
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}


class DocumentAccessTests(unittest.TestCase):
    def test_role_hierarchy_grants_only_lower_or_equal_classifications(self):
        self.assertEqual(allowed_document_roles("EMPLOYEE"), {"EMPLOYEE"})
        self.assertEqual(allowed_document_roles("ADMIN"), {"EMPLOYEE", "ADMIN"})
        self.assertEqual(allowed_document_roles("SUPER_ADMIN"), {"EMPLOYEE", "ADMIN", "SUPER_ADMIN"})

    def test_unclassified_documents_default_to_super_admin(self):
        self.assertFalse(can_read_document("EMPLOYEE", None))
        self.assertTrue(can_read_document("SUPER_ADMIN", None))

    def test_unknown_requester_role_is_reduced_to_employee(self):
        self.assertEqual(normalize_role("made-up-role"), "EMPLOYEE")

    def test_invalid_document_classification_fails_closed(self):
        self.assertFalse(can_read_document("EMPLOYEE", "unknown-classification"))

    def test_vector_search_filters_role_and_empty_selected_sources(self):
        store = ChromaVectorStore.__new__(ChromaVectorStore)
        store.collection = FakeCollection()

        store.query("payroll", requester_role="EMPLOYEE", selected_sources=[])

        self.assertEqual(
            store.collection.where,
            {"$and": [
                {"access_role": {"$in": ["EMPLOYEE"]}},
                {"source": {"$in": []}},
            ]},
        )


if __name__ == "__main__":
    unittest.main()
