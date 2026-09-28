from pathlib import Path
from typing import List, Dict, Any, Optional

import chromadb
from app.config import settings
from app.access_control import allowed_document_roles

class ChromaVectorStore:
    """
    Banco vetorial ChromaDB integrado ao RAG Multimodal do AgentScope.
    Armazena e indexa embeddings e metadados dos documentos corporativos.
    """
    def __init__(self, persist_dir: Optional[Path] = None):
        self.persist_dir = persist_dir or (settings.BASE_DIR / "data" / "chroma")
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        
        # Cliente persistente local do ChromaDB
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.collection_name = "omnichannel_knowledge"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "Base vetorial de documentos e manuais corporativos Omnichannel"}
        )

    def add_documents(self, documents: List[Dict[str, Any]]):
        """Indexa documentos no ChromaDB com IDs, textos e metadados."""
        if not documents:
            return

        ids = []
        documents_text = []
        metadatas = []

        for idx, doc in enumerate(documents):
            doc_id = f"{doc.get('source', 'doc')}_{idx}_{doc.get('page', 1)}"
            text = doc.get("text", "").strip()
            if text:
                ids.append(doc_id)
                documents_text.append(text)
                metadatas.append({
                    "source": str(doc.get("source", "unknown")),
                    "type": str(doc.get("type", "text")),
                    "page": int(doc.get("page", 1)),
                    "access_role": str(doc.get("access_role", "SUPER_ADMIN")).upper(),
                })

        if ids:
            self.collection.upsert(
                ids=ids,
                documents=documents_text,
                metadatas=metadatas
            )

    def clear_documents(self) -> None:
        """Rebuild the vector index only from the current approved source files."""
        existing_ids = self.collection.get(include=[]).get("ids", [])
        for start in range(0, len(existing_ids), 500):
            self.collection.delete(ids=existing_ids[start:start + 500])

    def query(
        self,
        query_text: str,
        n_results: int = 3,
        requester_role: str = "EMPLOYEE",
        selected_sources: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Realiza busca semântica por similaridade vetorial no ChromaDB."""
        if not query_text.strip() or self.collection.count() == 0:
            return []

        filters = [{"access_role": {"$in": sorted(allowed_document_roles(requester_role))}}]
        if selected_sources is not None:
            filters.append({"source": {"$in": selected_sources}})
        where = filters[0] if len(filters) == 1 else {"$and": filters}
        results = self.collection.query(
            query_texts=[query_text],
            n_results=min(n_results, max(1, self.collection.count())),
            where=where,
        )

        hits = []
        if results and results.get("documents") and results["documents"][0]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

            for text, meta, dist in zip(docs, metas, dists):
                hits.append({
                    "text": text,
                    "metadata": meta,
                    "distance": dist,
                    "source": meta.get("source", "unknown")
                })

        return hits

    def count(self) -> int:
        return self.collection.count()
