package com.omnichannel.backend.file.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "managed_document")
public class DocumentJpaEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 255, unique = true)
    private String name;

    @Column(name = "owner", nullable = false, length = 120)
    private String owner;

    @Column(name = "size", nullable = false, length = 50)
    private String size;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "access_level", nullable = false, length = 30)
    private String accessLevel;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    @Column(name = "deletion_reason", length = 500)
    private String deletionReason;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DocumentJpaEntity() {}

    public DocumentJpaEntity(
            UUID id,
            String name,
            String owner,
            String size,
            String type,
            String accessLevel,
            boolean deleted,
            String deletionReason,
            Instant deletedAt,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.owner = owner;
        this.size = size;
        this.type = type;
        this.accessLevel = accessLevel;
        this.deleted = deleted;
        this.deletionReason = deletionReason;
        this.deletedAt = deletedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getOwner() { return owner; }
    public String getSize() { return size; }
    public String getType() { return type; }
    public String getAccessLevel() { return accessLevel; }
    public boolean isDeleted() { return deleted; }
    public String getDeletionReason() { return deletionReason; }
    public Instant getDeletedAt() { return deletedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setAccessLevel(String accessLevel) { this.accessLevel = accessLevel; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public void setDeletionReason(String deletionReason) { this.deletionReason = deletionReason; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
