import grpc
import logging
from typing import Optional

from app.grpc_service import pb2, pb2_grpc
from app.agents.agent_orchestrator import AgentOrchestrator

logger = logging.getLogger("omnichannel-ai.grpc")

class AgentServiceServicer(pb2_grpc.AgentServiceServicer):
    """
    Implementação do serviço gRPC do AgentScope para comunicação com o backend Java.
    """
    def __init__(self, orchestrator: Optional[AgentOrchestrator] = None):
        self.orchestrator = orchestrator or AgentOrchestrator()

    async def Chat(
        self,
        request: pb2.AgentChatRequest,
        context: grpc.aio.ServicerContext
    ) -> pb2.AgentChatResponse:
        request_id = request.metadata.get("request_id", "unknown")
        try:
            result = await self.orchestrator.execute(
                session_id=request.session_id,
                message=request.message,
                agent_mode=request.agent_mode,
                selected_docs=list(request.selected_docs),
                enabled_sources=list(request.enabled_sources),
                requester_role=request.metadata.get("requester_role", "EMPLOYEE")
            )

            gen_file = None
            if result.get("generated_file"):
                gf = result["generated_file"]
                gen_file = pb2.GeneratedFile(
                    name=gf["name"],
                    content=gf["content"],
                    mime_type=gf["mime_type"]
                )

            logger.info(
                "security_audit request_id=%s action=ai_chat role=%s outcome=success",
                request_id,
                request.metadata.get("requester_role", "EMPLOYEE"),
            )
            return pb2.AgentChatResponse(
                session_id=result["session_id"],
                reply=result["reply"],
                agent_used=result["agent_used"],
                generated_file=gen_file,
                sources_consulted=result["sources_consulted"],
                execution_time_ms=result["execution_time_ms"],
                success=True,
                error_message=""
            )
        except Exception:
            logger.exception("security_audit request_id=%s action=ai_chat outcome=error", request_id)
            return pb2.AgentChatResponse(
                session_id=request.session_id,
                reply="",
                agent_used="Erro",
                sources_consulted=[],
                execution_time_ms=0,
                success=False,
                error_message="Nao foi possivel processar a solicitacao"
            )


    async def HealthCheck(
        self,
        request: pb2.HealthCheckRequest,
        context: grpc.aio.ServicerContext
    ) -> pb2.HealthCheckResponse:
        return pb2.HealthCheckResponse(
            status=pb2.HealthCheckResponse.ServingStatus.SERVING,
            message="AgentScope gRPC Service is healthy and active"
        )
