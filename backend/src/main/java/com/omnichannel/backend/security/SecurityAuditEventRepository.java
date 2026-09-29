package com.omnichannel.backend.security;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SecurityAuditEventRepository extends JpaRepository<SecurityAuditEvent, UUID> {
    @Modifying
    @Query("delete from SecurityAuditEvent e where e.occurredAt < :cutoff")
    int deleteExpired(@Param("cutoff") Instant cutoff);

    List<SecurityAuditEvent> findTop100ByOrderByOccurredAtDesc();

    List<SecurityAuditEvent> findTop100ByOutcomeOrderByOccurredAtDesc(String outcome);

    List<SecurityAuditEvent> findTop100ByOutcomeNotOrderByOccurredAtDesc(String outcome);

    long countByOutcome(String outcome);

    long countByOutcomeNot(String outcome);
}
