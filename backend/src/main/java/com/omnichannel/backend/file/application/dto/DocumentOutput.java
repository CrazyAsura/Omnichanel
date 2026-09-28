package com.omnichannel.backend.file.application.dto;

import com.omnichannel.backend.file.domain.entity.ManagedDocument;

import java.time.Instant;
import java.util.UUID;

public record DocumentOutput(
        UUID id,
        String name,
        String owner,
        String size,
        String updated,
        String type,
        String accessLevel
) {
    public static DocumentOutput fromDomain(ManagedDocument doc) {
        return new DocumentOutput(
                doc.getId().value(),
                doc.getName(),
                doc.getOwner(),
                doc.getSize(),
                formatUpdatedTime(doc.getUpdatedAt()),
                doc.getType(),
                doc.getAccessLevel().getCode()
        );
    }

    private static String formatUpdatedTime(Instant instant) {
        if (instant == null) return "Recente";
        return instant.toString();
    }
}
