package com.omnichannel.backend.log.domain.dto;

import java.time.Instant;
import java.util.UUID;

public record ActivityLogDto(
        UUID id,
        String user,
        String initials,
        String action,
        String target,
        String time,
        String tone,
        String outcome,
        Instant occurredAt
) {}
