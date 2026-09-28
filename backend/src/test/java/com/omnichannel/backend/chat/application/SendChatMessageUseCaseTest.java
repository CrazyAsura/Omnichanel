package com.omnichannel.backend.chat.application;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.SendChatMessageCommand;
import com.omnichannel.backend.chat.application.port.output.AiAgentRpcPort;
import com.omnichannel.backend.chat.application.usecase.SendChatMessageUseCase;
import com.omnichannel.backend.chat.domain.exception.InvalidPromptException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SendChatMessageUseCaseTest {

    @Mock
    private AiAgentRpcPort aiAgentRpcPort;

    @InjectMocks
    private SendChatMessageUseCase useCase;

    @Test
    @DisplayName("Deve orquestrar envio de mensagem para a porta gRPC com sucesso")
    void shouldOrchestrateMessageSendingSuccessfully() {
        SendChatMessageCommand command = new SendChatMessageCommand(
                "session-123",
                "Quais os canais integrados?",
                "Leitor de documentos internos",
                List.of("Manual de processos internos.md"),
                List.of("Base de documentos")
        );

        ChatMessageOutput expectedOutput = new ChatMessageOutput(
                "session-123",
                "Os canais integrados são WhatsApp, Chat Web, E-mail, CRM e ERP.",
                "Leitor de Documentos Internos",
                null,
                List.of("Manual de processos internos.md"),
                150L,
                true,
                ""
        );

        when(aiAgentRpcPort.callAgent(command)).thenReturn(expectedOutput);

        ChatMessageOutput result = useCase.execute(command);

        assertNotNull(result);
        assertEquals("session-123", result.sessionId());
        assertEquals("Leitor de Documentos Internos", result.agentUsed());
        assertEquals("Os canais integrados são WhatsApp, Chat Web, E-mail, CRM e ERP.", result.reply());

        verify(aiAgentRpcPort).callAgent(command);
    }

    @Test
    @DisplayName("Deve falhar e não chamar porta quando prompt for inválido")
    void shouldThrowWhenPromptIsBlank() {
        SendChatMessageCommand invalidCommand = new SendChatMessageCommand(
                "session-123",
                "   ",
                "Leitor de documentos internos",
                List.of(),
                List.of()
        );

        assertThrows(InvalidPromptException.class, () -> useCase.execute(invalidCommand));
    }
}
