import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

import grpc
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from threading import Lock

from app.config import settings
from app.speech import router as speech_router
from app.grpc_service import pb2_grpc
from app.grpc_service.agent_servicer import AgentServiceServicer
from app.agents.agent_orchestrator import AgentOrchestrator
from app.security import is_valid_service_token, require_service_token_configuration
from app.grpc_service.security_interceptor import ServiceTokenServerInterceptor

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("omnichannel-ai")

orchestrator = AgentOrchestrator()
grpc_server: Optional[grpc.aio.Server] = None
metrics_lock = Lock()
chat_success_count = 0
chat_error_count = 0
auth_failure_count = 0
chat_duration_sum = 0.0
chat_duration_count = 0

tags_metadata = [
    {
        "name": "Chat & AgentScope Orchestrator",
        "description": "Orquestração de agentes multi-skills com AgentScope e Gemma 4 (Leitor de documentos, Analista de dados, Gerador de arquivos).",
    },
    {
        "name": "ChromaDB Vector Store",
        "description": "Endpoints para gestão e consulta do banco vetorial ChromaDB com RAG Multimodal.",
    },
    {
        "name": "Redis Cache",
        "description": "Cache de alta velocidade para sessões de chat e contexto de agentes.",
    },
    {
        "name": "Observability & Health",
        "description": "Monitoramento de integridade dos serviços, conectividade gRPC e modelos de linguagem.",
    },
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global grpc_server
    require_service_token_configuration(settings.SERVICE_AUTH_TOKEN)
    logger.info("Iniciando AgentScope Orchestrator e ChromaDB...")
    await orchestrator.initialize()
    await orchestrator.rag.index_documents()

    # Inicia o servidor gRPC na porta configurada (padrão 50051)
    logger.info(f"Iniciando gRPC server na porta {settings.GRPC_PORT}...")
    grpc_server = grpc.aio.server(interceptors=[ServiceTokenServerInterceptor(settings.SERVICE_AUTH_TOKEN)])
    pb2_grpc.add_AgentServiceServicer_to_server(AgentServiceServicer(orchestrator), grpc_server)
    listen_addr = f"[::]:{settings.GRPC_PORT}"
    grpc_server.add_insecure_port(listen_addr)
    await grpc_server.start()
    logger.info(f"gRPC server ativo e escutando em {listen_addr}")

    yield

    logger.info("Encerrando gRPC server e conexões...")
    if grpc_server:
        await grpc_server.stop(grace=5)
    logger.info("Serviços finalizados com sucesso.")

app = FastAPI(
    title="Omnichannel AgentScope AI & Vector Service",
    version=settings.VERSION,
    description="""
### Omnichannel AI Intelligence Backend
Backend de alta performance com **FastAPI**, **gRPC**, **AgentScope (Alibaba)**, **ChromaDB**, **RabbitMQ**, **Kafka**, **Redis** e **Gemma 4 (Ollama)**.

* **Swagger UI:** Disponível em `/docs`
* **ReDoc:** Disponível em `/redoc`
* **gRPC Endpoint:** Porta `50051` (atende requisições do backend Spring Boot)
    """,
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.include_router(speech_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def require_internal_service_token(request: Request, call_next):
    global auth_failure_count
    request_id = str(uuid.uuid4())
    if request.url.path not in {"/health", "/metrics"} and not is_valid_service_token(
        request.headers.get("x-service-token"), settings.SERVICE_AUTH_TOKEN
    ):
        with metrics_lock:
            auth_failure_count += 1
        logger.warning("security_audit request_id=%s method=%s route=%s outcome=authentication_failure", request_id, request.method, request.url.path)
        return JSONResponse(status_code=401, content={"detail": "Autenticação de serviço necessária"})
    request.state.audit_id = request_id
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("security_audit request_id=%s method=%s route=%s outcome=error", request_id, request.method, request.url.path)
        raise
    response.headers["X-Request-ID"] = request_id
    if request.url.path.startswith("/api/"):
        logger.info("security_audit request_id=%s method=%s route=%s status=%s", request_id, request.method, request.url.path, response.status_code)
    return response

class RestChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128, description="ID pseudonimo da sessao")
    message: str = Field(..., min_length=1, max_length=16000, description="Pergunta ou instrucao do usuario")
    agent_mode: str = Field(default="Leitor de documentos internos", max_length=80)
    selected_docs: List[str] = Field(default_factory=list, max_length=20)
    enabled_sources: List[str] = Field(default_factory=list, max_length=20)

class GeneratedFileSchema(BaseModel):
    name: str = Field(..., examples=["relatorio-operacional.md"])
    content: str = Field(..., examples=["# Relatório de Operações\n\nConteúdo..."])
    mime_type: str = Field(default="text/markdown", examples=["text/markdown"])

class RestChatResponse(BaseModel):
    session_id: str
    reply: str
    agent_used: str
    generated_file: Optional[GeneratedFileSchema] = None
    sources_consulted: List[str]
    execution_time_ms: int
    success: bool
    error_message: Optional[str] = ""

class VectorQueryRequest(BaseModel):
    query: str = Field(..., examples=["regras de SLA e atendimento"])
    n_results: int = Field(default=3, ge=1, le=10)

@app.get("/health", tags=["Observability & Health"], summary="Verificar saúde do serviço")
async def health_check():
    return {
        "status": "UP",
        "service": "backend-ai",
        "grpc_port": settings.GRPC_PORT,
        "http_port": settings.HTTP_PORT,
    }

@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    with metrics_lock:
        values = (
            ("backend_ai_chat_requests_total", "Chat requests handled", "counter", chat_success_count + chat_error_count),
            ("backend_ai_chat_errors_total", "Chat processing failures", "counter", chat_error_count),
            ("backend_ai_auth_failures_total", "Rejected service authentication attempts", "counter", auth_failure_count),
            ("backend_ai_chat_duration_seconds_sum", "Total chat request duration", "counter", chat_duration_sum),
            ("backend_ai_chat_duration_seconds_count", "Chat requests observed for duration", "counter", chat_duration_count),
        )
    lines = []
    for name, help_text, metric_type, value in values:
        lines.extend((f"# HELP {name} {help_text}", f"# TYPE {name} {metric_type}", f"{name} {value}"))
    return "\n".join(lines) + "\n"

@app.get("/api/skills", tags=["Chat & AgentScope Orchestrator"], summary="Listar skills do AgentScope")
async def list_skills():
    await orchestrator.initialize()
    return {
        "skills": [
            {"name": name, "description": skill.description if hasattr(skill, "description") else ""}
            for name, skill in orchestrator._skills.items()
        ]
    }

@app.post("/api/chat", response_model=RestChatResponse, tags=["Chat & AgentScope Orchestrator"], summary="Enviar mensagem para orquestração de agentes")
async def chat_endpoint(request: RestChatRequest):
    global chat_success_count, chat_error_count, chat_duration_sum, chat_duration_count
    started = time.perf_counter()
    try:
        result = await orchestrator.execute(
            session_id=request.session_id,
            message=request.message,
            agent_mode=request.agent_mode,
            selected_docs=request.selected_docs,
            enabled_sources=request.enabled_sources,
            requester_role="EMPLOYEE"
        )

        with metrics_lock:
            chat_success_count += 1
        return RestChatResponse(**result)
    except Exception:
        with metrics_lock:
            chat_error_count += 1
        logger.exception("Falha ao processar solicitacao de chat")
        raise HTTPException(status_code=500, detail="Nao foi possivel processar a solicitacao")
    finally:
        with metrics_lock:
            chat_duration_sum += time.perf_counter() - started
            chat_duration_count += 1

@app.get("/api/vector-store/status", tags=["ChromaDB Vector Store"], summary="Status e contagem do ChromaDB")
async def vector_store_status():
    count = orchestrator.rag.vector_store.count()
    return {
        "vector_store": "ChromaDB",
        "collection": orchestrator.rag.vector_store.collection_name,
        "indexed_documents_count": count
    }

@app.post("/api/vector-store/query", tags=["ChromaDB Vector Store"], summary="Busca semântica no ChromaDB")
async def query_vector_store(req: VectorQueryRequest):
    hits = orchestrator.rag.vector_store.query(req.query, n_results=req.n_results, requester_role="EMPLOYEE")
    return {"query": req.query, "total_hits": len(hits), "results": hits}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.HTTP_PORT)
