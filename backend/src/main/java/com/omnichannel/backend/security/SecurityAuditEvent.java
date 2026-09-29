package com.omnichannel.backend.security;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_audit_event")
public class SecurityAuditEvent {
    @Id
    private UUID id;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "actor_id", nullable = false, length = 200)
    private String actorId;

    @Column(name = "action", nullable = false, length = 32)
    private String action;

    @Column(name = "resource", nullable = false, length = 160)
    private String resource;

    @Column(name = "outcome", nullable = false, length = 32)
    private String outcome;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    protected SecurityAuditEvent() {}

    public SecurityAuditEvent(String actorId, String action, String resource, String outcome, UUID requestId) {
        this.id = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.actorId = actorId;
        this.action = action;
        this.resource = resource;
        this.outcome = outcome;
        this.requestId = requestId;
    }

    public UUID getId() { return id; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getResource() { return resource; }
    public String getOutcome() { return outcome; }
    public UUID getRequestId() { return requestId; }
}

