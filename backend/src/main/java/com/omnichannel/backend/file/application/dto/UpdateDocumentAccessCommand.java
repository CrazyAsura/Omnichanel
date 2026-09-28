package com.omnichannel.backend.file.application.dto;

public record UpdateDocumentAccessCommand(
        String name,
        String accessLevel
) {}
