package com.omnichannel.backend.chat.presentation.controller;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.SendChatMessageCommand;
import com.omnichannel.backend.chat.application.port.input.SendChatMessageInputPort;
import com.omnichannel.backend.chat.application.port.output.AiAgentRpcPort;
import com.omnichannel.backend.chat.presentation.request.ChatPromptRequest;
import com.omnichannel.backend.chat.presentation.response.ChatPromptResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import org.springframework.security.core.Authentication;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@Tag(name = "Chat & AgentScope Orchestrator", description = "Endpoints para interação com os agentes especialistas da Omnichannel via gRPC")
public class ChatController {

    private final SendChatMessageInputPort sendChatMessageInputPort;
    private final AiAgentRpcPort aiAgentRpcPort;

    public ChatController(
            SendChatMessageInputPort sendChatMessageInputPort,
            AiAgentRpcPort aiAgentRpcPort) {
        this.sendChatMessageInputPort = sendChatMessageInputPort;
        this.aiAgentRpcPort = aiAgentRpcPort;
    }

    @PostMapping
    @Operation(summary = "Enviar mensagem ao agente", description = "Orquestra a consulta multimodal, aciona as skills do AgentScope e o modelo Gemma 4 via gRPC")
    @ApiResponse(responseCode = "200", description = "Resposta gerada com sucesso pelo agente especialista")
    public ResponseEntity<ChatPromptResponse> sendChatMessage(
            @Valid @RequestBody ChatPromptRequest request, Authentication authentication,
            HttpServletRequest servletRequest) {
        SendChatMessageCommand command = new SendChatMessageCommand(
                request.sessionId(),
                request.message(),
                request.agentMode(),
                request.selectedDocs(),
                request.enabledSources(),
                String.valueOf(servletRequest.getAttribute("requestId") == null
                        ? UUID.randomUUID() : servletRequest.getAttribute("requestId")),
                requesterRole(authentication)
        );

        ChatMessageOutput output = sendChatMessageInputPort.execute(command);
        return ResponseEntity.ok(ChatPromptResponse.from(output));
    }

    private String requesterRole(Authentication authentication) {
        if (authentication == null) return "EMPLOYEE";
        var roles = authentication.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        if (roles.contains("ROLE_SUPER_ADMIN")) return "SUPER_ADMIN";
        if (roles.contains("ROLE_ADMIN")) return "ADMIN";
        return "EMPLOYEE";
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkAiAgentHealth() {
        boolean healthy = aiAgentRpcPort.isHealthy();
        return ResponseEntity.ok(Map.of(
                "service", "omnichannel-backend-chat",
                "aiAgentGrpcHealthy", healthy,
                "status", healthy ? "UP" : "DEGRADED"
        ));
    }
}
