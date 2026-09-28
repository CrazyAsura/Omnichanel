package com.omnichannel.backend.file.application.dto;

public record DeleteDocumentCommand(
        String name,
        String reason
) {}
