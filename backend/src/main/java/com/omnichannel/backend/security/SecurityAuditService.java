package com.omnichannel.backend.security;

import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SecurityAuditService {
    private final SecurityAuditEventRepository repository;
    private final int retentionDays;

    public SecurityAuditService(
            SecurityAuditEventRepository repository,
            @Value("${app.security.audit-retention-days:365}") int retentionDays) {
        this.repository = repository;
        this.retentionDays = retentionDays;
        if (retentionDays < 30) {
            throw new IllegalArgumentException("Security audit retention must be at least 30 days");
        }
    }

    @Transactional
    public void record(SecurityAuditEvent event) {
        repository.save(event);
    }

    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public void purgeExpiredEvents() {
        repository.deleteExpired(Instant.now().minusSeconds(retentionDays * 86_400L));
    }
}
