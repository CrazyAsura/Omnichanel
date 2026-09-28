package com.omnichannel.backend.chat.infrastructure.grpc.adapter;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.GeneratedFileOutput;
import com.omnichannel.backend.chat.application.dto.SendChatMessageCommand;
import com.omnichannel.backend.chat.application.port.output.AiAgentRpcPort;
import com.omnichannel.backend.chat.domain.exception.AgentExecutionException;
import com.omnichannel.backend.grpc.AgentChatRequest;
import com.omnichannel.backend.grpc.AgentChatResponse;
import com.omnichannel.backend.grpc.AgentServiceGrpc;
import com.omnichannel.backend.grpc.HealthCheckRequest;
import com.omnichannel.backend.grpc.HealthCheckResponse;
import io.grpc.StatusRuntimeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.TimeUnit;

public class GrpcAiAgentAdapter implements AiAgentRpcPort {

    private static final Logger log = LoggerFactory.getLogger(GrpcAiAgentAdapter.class);

    private final AgentServiceGrpc.AgentServiceBlockingStub agentStub;

    public GrpcAiAgentAdapter(AgentServiceGrpc.AgentServiceBlockingStub agentStub) {
        this.agentStub = agentStub;
    }

    @Override
    public ChatMessageOutput callAgent(SendChatMessageCommand command) {
        log.info("Invoking AI agent over gRPC; mode={}", command.agentMode());

        AgentChatRequest request = AgentChatRequest.newBuilder()
                .setSessionId(command.sessionId() != null ? command.sessionId() : "")
                .setMessage(command.message())
                .setAgentMode(command.agentMode() != null ? command.agentMode() : "Leitor de documentos internos")
                .addAllSelectedDocs(command.selectedDocs() != null ? command.selectedDocs() : List.of())
                .addAllEnabledSources(command.enabledSources() != null ? command.enabledSources() : List.of())
                .putMetadata("requester_role", command.requesterRole())
                .putMetadata("request_id", command.requestId() == null ? "unknown" : command.requestId())
                .build();

        try {
            // Permite que o modelo local conclua inferências lentas ou a primeira carga.
            AgentChatResponse response = agentStub
                    .withDeadlineAfter(300, TimeUnit.SECONDS)
                    .chat(request);

            GeneratedFileOutput generatedFile = null;
            if (response.hasGeneratedFile()) {
                var gf = response.getGeneratedFile();
                generatedFile = new GeneratedFileOutput(gf.getName(), gf.getContent(), gf.getMimeType());
            }

            return new ChatMessageOutput(
                    response.getSessionId(),
                    response.getReply(),
                    response.getAgentUsed(),
                    generatedFile,
                    response.getSourcesConsultedList(),
                    response.getExecutionTimeMs(),
                    response.getSuccess(),
                    response.getErrorMessage()
            );
        } catch (StatusRuntimeException e) {
            log.error("Falha na chamada gRPC ao serviço AgentScope: {}", e.getStatus(), e);
            throw new AgentExecutionException("Falha na comunicação com o agente inteligente: " + e.getStatus().getDescription(), e);
        } catch (Exception e) {
            log.error("Erro inesperado no adapter gRPC: {}", e.getMessage(), e);
            throw new AgentExecutionException("Erro ao processar chamada com agente: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean isHealthy() {
        try {
            HealthCheckResponse resp = agentStub
                    .withDeadlineAfter(3, TimeUnit.SECONDS)
                    .healthCheck(HealthCheckRequest.newBuilder().setService("backend-ai").build());
            return resp.getStatus() == HealthCheckResponse.ServingStatus.SERVING;
        } catch (Exception e) {
            log.warn("Health check gRPC falhou: {}", e.getMessage());
            return false;
        }
    }
}
