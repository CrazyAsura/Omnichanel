import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from agentscope.rag import PDFParser, ImageParser, TextParser
from agentscope.message import TextBlock, DataBlock

from app.config import settings
from app.rag.chroma_store import ChromaVectorStore
from app.access_control import can_read_document, normalize_role

class MultimodalDocumentRetriever:
    """
    RAG Multimodal utilizando os parsers nativos do AgentScope (PDFParser, ImageParser, TextParser)
    e o banco vetorial ChromaDB para indexação e recuperação semântica de alta performance.
    """
    def __init__(self, docs_dir: Optional[Path] = None):
        self.docs_dir = Path(docs_dir or settings.DOCS_DIR)
        self.pdf_parser = PDFParser()
        self.image_parser = ImageParser()
        self.text_parser = TextParser()
        self.vector_store = ChromaVectorStore()
        self._indexed = False
        try:
            policy = json.loads(settings.DOCUMENT_ACCESS_POLICY.read_text(encoding="utf-8"))
            self._document_roles = {key.casefold(): value for key, value in policy.get("documents", {}).items()}
            self._default_minimum_role = policy.get("default_minimum_role", "SUPER_ADMIN")
        except (OSError, ValueError, TypeError):
            self._document_roles = {}
            self._default_minimum_role = "SUPER_ADMIN"

    def _minimum_role(self, filename: str) -> str:
        return str(self._document_roles.get(filename.casefold(), self._default_minimum_role)).upper()

    async def index_documents(self):
        """Indexa todos os documentos disponíveis na pasta docs_dir no ChromaDB."""
        if self._indexed:
            return

        self.vector_store.clear_documents()
        docs_to_index = []
        for file_path in self.docs_dir.glob("*.*"):
            if file_path.is_file():
                parsed_sections = await self.parse_file(file_path)
                for item in parsed_sections:
                    if item["type"] == "text" and item["text"].strip():
                        docs_to_index.append(item)

        if docs_to_index:
            self.vector_store.add_documents(docs_to_index)
        self._indexed = True

    async def parse_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Analisa um arquivo individual usando o parser apropriado do AgentScope."""
        if not file_path.exists():
            return []
        
        ext = file_path.suffix.lower()
        filename = file_path.name
        results = []

        try:
            if ext == ".pdf":
                sections = await self.pdf_parser.parse(str(file_path), filename)
            elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
                sections = await self.image_parser.parse(str(file_path), filename)
            else:
                sections = await self.text_parser.parse(str(file_path), filename)

            for section in sections:
                if isinstance(section.content, TextBlock):
                    results.append({
                        "source": filename,
                        "type": "text",
                        "text": section.content.text,
                        "metadata": section.metadata or {},
                        "access_role": self._minimum_role(filename)
                    })
                elif isinstance(section.content, DataBlock):
                    media_type = section.metadata.get("media_type", "image/png")
                    results.append({
                        "source": filename,
                        "type": "image",
                        "media_type": media_type,
                        "data": section.content.source.data if hasattr(section.content.source, "data") else "",
                        "metadata": section.metadata or {},
                        "access_role": self._minimum_role(filename)
                    })
        except Exception as e:
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                results.append({
                    "source": filename,
                    "type": "text",
                    "text": content,
                    "metadata": {"fallback": True, "error": str(e)}
                })
            except Exception:
                pass

        return results

    async def retrieve_context(
        self, selected_docs: List[str], query: str = "", requester_role: str = "EMPLOYEE"
    ) -> Dict[str, Any]:
        """
        Recupera os trechos e imagens dos documentos selecionados pelo usuário via menu '@' e
        combina com busca vetorial semântica no ChromaDB para relevância contextual máxima.
        """
        await self.index_documents()
        requester_role = normalize_role(requester_role)

        retrieved_texts: List[str] = []
        retrieved_images: List[Dict[str, str]] = []
        sources_found: List[str] = []

        # 1. Busca Semântica no Banco Vetorial ChromaDB se houver query
        if query.strip():
            selected_sources = []
            if selected_docs:
                for requested_name in selected_docs:
                    safe_name = Path(requested_name).name.casefold()
                    matched = next((p for p in self.docs_dir.glob("*") if p.is_file() and p.name.casefold() == safe_name), None)
                    if matched and can_read_document(requester_role, self._minimum_role(matched.name)):
                        selected_sources.append(matched.name)
            vector_results = [] if selected_docs and not selected_sources else self.vector_store.query(
                query,
                n_results=3,
                requester_role=requester_role,
                selected_sources=selected_sources if selected_docs else None,
            )
            for hit in vector_results:
                retrieved_texts.append(f"--- [ChromaDB Vetorial] Fonte: {hit['source']} ---\n{hit['text']}")
                if hit['source'] not in sources_found:
                    sources_found.append(hit['source'])

        # 2. Documentos selecionados explicitamente com '@' no menu do frontend
        available_files = {p.name.casefold(): p for p in self.docs_dir.glob("*.*") if p.is_file()}
        target_files: List[Path] = []
        if selected_docs:
            for doc_name in selected_docs:
                safe_name = Path(doc_name.strip()).name.casefold()
                candidate = available_files.get(safe_name)
                if candidate and can_read_document(requester_role, self._minimum_role(candidate.name)):
                    target_files.append(candidate)
        elif not query.strip():
            target_files = [p for p in available_files.values()
                            if can_read_document(requester_role, self._minimum_role(p.name))][:3]

        for file_path in target_files:
            parsed_sections = await self.parse_file(file_path)
            for item in parsed_sections:
                if item["type"] == "text" and item["text"].strip():
                    text_block = f"--- Fonte: {item['source']} ---\n{item['text'].strip()}"
                    if text_block not in retrieved_texts:
                        retrieved_texts.append(text_block)
                    if item["source"] not in sources_found:
                        sources_found.append(item["source"])
                elif item["type"] == "image":
                    retrieved_images.append({
                        "name": item["source"],
                        "media_type": item["media_type"],
                        "data": item["data"]
                    })
                    if item["source"] not in sources_found:
                        sources_found.append(item["source"])

        return {
            "context_text": "\n\n".join(retrieved_texts),
            "images": retrieved_images,
            "sources": sources_found
        }
