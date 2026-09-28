package com.omnichannel.backend.chat.domain.entity;

import com.omnichannel.backend.chat.domain.valueobject.AgentMode;
import com.omnichannel.backend.chat.domain.valueobject.SessionId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ChatSession {

    private final SessionId id;
    private String title;
    private AgentMode mode;
    private final List<ChatMessage> messages;
    private Instant updatedAt;

    public ChatSession(SessionId id, String title, AgentMode mode) {
        this.id = (id == null) ? SessionId.generate() : id;
        this.title = (title == null || title.isBlank()) ? "Nova conversa" : title;
        this.mode = (mode == null) ? AgentMode.DOC_READER : mode;
        this.messages = new ArrayList<>();
        this.updatedAt = Instant.now();
    }

    public void addMessage(ChatMessage message) {
        if (message != null) {
            this.messages.add(message);
            this.updatedAt = Instant.now();
            if ("Nova conversa".equals(this.title) && "employee".equals(message.getRole())) {
                String text = message.getContent();
                this.title = text.length() > 40 ? text.substring(0, 37) + "..." : text;
            }
        }
    }

    public void changeMode(AgentMode newMode) {
        if (newMode != null) {
            this.mode = newMode;
            this.updatedAt = Instant.now();
        }
    }

    public SessionId getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public AgentMode getMode() {
        return mode;
    }

    public List<ChatMessage> getMessages() {
        return Collections.unmodifiableList(messages);
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
