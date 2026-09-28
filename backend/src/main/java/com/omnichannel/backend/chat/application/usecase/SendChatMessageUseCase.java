package com.omnichannel.backend.chat.application.usecase;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.SendChatMessageCommand;
import com.omnichannel.backend.chat.application.port.input.SendChatMessageInputPort;
import com.omnichannel.backend.chat.application.port.output.AiAgentRpcPort;
import com.omnichannel.backend.chat.domain.entity.ChatMessage;
import com.omnichannel.backend.chat.domain.entity.ChatSession;
import com.omnichannel.backend.chat.domain.valueobject.AgentMode;
import com.omnichannel.backend.chat.domain.valueobject.SessionId;

import java.util.Objects;

public final class SendChatMessageUseCase implements SendChatMessageInputPort {

    private final AiAgentRpcPort aiAgentRpcPort;

    public SendChatMessageUseCase(AiAgentRpcPort aiAgentRpcPort) {
        this.aiAgentRpcPort = Objects.requireNonNull(aiAgentRpcPort, "aiAgentRpcPort cannot be null");
    }

    @Override
    public ChatMessageOutput execute(SendChatMessageCommand command) {
        // Valida invariantes do domínio
        ChatMessage userMessage = ChatMessage.user(command.message());
        SessionId sessionId = SessionId.of(command.sessionId());
        AgentMode agentMode = AgentMode.fromString(command.agentMode());

        ChatSession session = new ChatSession(sessionId, "Nova conversa", agentMode);
        session.addMessage(userMessage);

        // Orquestra a execução via porta RPC do agente AgentScope
        return aiAgentRpcPort.callAgent(command);
    }
}
