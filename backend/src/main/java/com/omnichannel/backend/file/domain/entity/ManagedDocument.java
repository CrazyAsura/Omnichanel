package com.omnichannel.backend.file.domain.entity;

import com.omnichannel.backend.file.domain.exception.InvalidDocumentException;
import com.omnichannel.backend.file.domain.valueobject.DocumentAccessLevel;
import com.omnichannel.backend.file.domain.valueobject.DocumentId;

import java.time.Instant;
import java.util.Objects;

public class ManagedDocument {
    private final DocumentId id;
    private final String name;
    private final String owner;
    private final String size;
    private final String type;
    private DocumentAccessLevel accessLevel;
    private boolean deleted;
    private String deletionReason;
    private Instant deletedAt;
    private final Instant createdAt;
    private Instant updatedAt;

    public ManagedDocument(
            DocumentId id,
            String name,
            String owner,
            String size,
            String type,
            DocumentAccessLevel accessLevel,
            boolean deleted,
            String deletionReason,
            Instant deletedAt,
            Instant createdAt,
            Instant updatedAt) {
        if (name == null || name.trim().isEmpty()) {
            throw new InvalidDocumentException("O nome do documento não pode ser vazio.");
        }
        this.id = id != null ? id : DocumentId.generate();
        this.name = name.trim();
        this.owner = owner != null && !owner.trim().isEmpty() ? owner.trim() : "Sistema";
        this.size = size != null && !size.trim().isEmpty() ? size.trim() : "0 KB";
        this.type = type != null && !type.trim().isEmpty() ? type.trim().toUpperCase() : resolveExtension(name);
        this.accessLevel = accessLevel != null ? accessLevel : DocumentAccessLevel.ALL;
        this.deleted = deleted;
        this.deletionReason = deletionReason;
        this.deletedAt = deletedAt;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt != null ? updatedAt : this.createdAt;
    }

    public static ManagedDocument create(String name, String owner, String size, String type) {
        Instant now = Instant.now();
        return new ManagedDocument(
                DocumentId.generate(),
                name,
                owner,
                size,
                type,
                DocumentAccessLevel.ALL,
                false,
                null,
                null,
                now,
                now
        );
    }

    public void updateAccessLevel(DocumentAccessLevel newLevel) {
        if (this.deleted) {
            throw new InvalidDocumentException("Não é possível alterar o nível de acesso de um documento excluído.");
        }
        this.accessLevel = Objects.requireNonNull(newLevel, "O nível de acesso não pode ser nulo.");
        this.updatedAt = Instant.now();
    }

    public void markAsDeleted(String reason) {
        if (reason == null || reason.trim().length() < 8) {
            throw new InvalidDocumentException("A justificativa de exclusão deve conter no mínimo 8 caracteres.");
        }
        this.deleted = true;
        this.deletionReason = reason.trim();
        this.deletedAt = Instant.now();
        this.updatedAt = this.deletedAt;
    }

    private static String resolveExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "FILE";
        }
        String ext = fileName.substring(dot + 1).toUpperCase();
        return "DOCX".equals(ext) ? "DOC" : ext;
    }

    public DocumentId getId() { return id; }
    public String getName() { return name; }
    public String getOwner() { return owner; }
    public String getSize() { return size; }
    public String getType() { return type; }
    public DocumentAccessLevel getAccessLevel() { return accessLevel; }
    public boolean isDeleted() { return deleted; }
    public String getDeletionReason() { return deletionReason; }
    public Instant getDeletedAt() { return deletedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
