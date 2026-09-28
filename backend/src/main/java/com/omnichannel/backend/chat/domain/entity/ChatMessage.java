package com.omnichannel.backend.chat.domain.entity;

import com.omnichannel.backend.chat.domain.exception.InvalidPromptException;
import com.omnichannel.backend.chat.domain.valueobject.GeneratedFile;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class ChatMessage {

    private final String id;
    private final String role;
    private final String content;
    private final GeneratedFile generatedFile;
    private final Instant createdAt;

    public ChatMessage(String id, String role, String content, GeneratedFile generatedFile, Instant createdAt) {
        if (role == null || role.isBlank()) {
            throw new InvalidPromptException("Message role cannot be empty");
        }
        if (content == null) {
            throw new InvalidPromptException("Message content cannot be null");
        }
        this.id = (id == null || id.isBlank()) ? UUID.randomUUID().toString() : id;
        this.role = role;
        this.content = content;
        this.generatedFile = generatedFile;
        this.createdAt = Objects.requireNonNullElseGet(createdAt, Instant::now);
    }

    public static ChatMessage user(String content) {
        if (content == null || content.trim().isEmpty()) {
            throw new InvalidPromptException("User prompt cannot be empty");
        }
        return new ChatMessage(UUID.randomUUID().toString(), "employee", content.trim(), null, Instant.now());
    }

    public static ChatMessage assistant(String content, GeneratedFile generatedFile) {
        return new ChatMessage(UUID.randomUUID().toString(), "assistant", content != null ? content : "", generatedFile, Instant.now());
    }

    public String getId() {
        return id;
    }

    public String getRole() {
        return role;
    }

    public String getContent() {
        return content;
    }

    public GeneratedFile getGeneratedFile() {
        return generatedFile;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean hasFile() {
        return generatedFile != null;
    }
}
