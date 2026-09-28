package com.omnichannel.backend.chat.domain;

import com.omnichannel.backend.chat.domain.entity.ChatMessage;
import com.omnichannel.backend.chat.domain.exception.InvalidPromptException;
import com.omnichannel.backend.chat.domain.valueobject.GeneratedFile;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatMessageTest {

    @Test
    @DisplayName("Deve criar mensagem de usuário com sucesso")
    void shouldCreateUserMessageSuccessfully() {
        ChatMessage message = ChatMessage.user("Como funciona o SLA?");
        assertNotNull(message.getId());
        assertEquals("employee", message.getRole());
        assertEquals("Como funciona o SLA?", message.getContent());
        assertNotNull(message.getCreatedAt());
    }

    @Test
    @DisplayName("Deve lançar InvalidPromptException ao criar mensagem com texto vazio")
    void shouldThrowWhenPromptIsEmpty() {
        assertThrows(InvalidPromptException.class, () -> ChatMessage.user(""));
        assertThrows(InvalidPromptException.class, () -> ChatMessage.user("   "));
        assertThrows(InvalidPromptException.class, () -> ChatMessage.user(null));
    }

    @Test
    @DisplayName("Deve criar mensagem do assistente com arquivo gerado")
    void shouldCreateAssistantMessageWithFile() {
        GeneratedFile file = new GeneratedFile("relatorio.md", "# Relatório", "text/markdown");
        ChatMessage message = ChatMessage.assistant("Aqui está seu relatório", file);

        assertEquals("assistant", message.getRole());
        assertTrue(message.hasFile());
        assertEquals("relatorio.md", message.getGeneratedFile().name());
    }
}
