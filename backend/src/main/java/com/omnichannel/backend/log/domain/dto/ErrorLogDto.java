package com.omnichannel.backend.log.domain.dto;

import java.time.Instant;

public record ErrorLogDto(
        String id,
        String title,
        String service,
        String severity,
        String time,
        String code,
        String actor,
        Instant occurredAt
) {}
