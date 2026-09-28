package com.omnichannel.backend.security;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SecurityAuditEventRepository extends JpaRepository<SecurityAuditEvent, UUID> {
    @Modifying
    @Query("delete from SecurityAuditEvent e where e.occurredAt < :cutoff")
    int deleteExpired(@Param("cutoff") Instant cutoff);
}
