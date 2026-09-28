package com.omnichannel.backend.file.application.dto;

public record CreateDocumentCommand(
        String name,
        String owner,
        String size,
        String type
) {}
