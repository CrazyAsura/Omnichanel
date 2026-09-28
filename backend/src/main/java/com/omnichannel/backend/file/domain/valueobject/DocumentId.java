package com.omnichannel.backend.file.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

public record DocumentId(UUID value) {
    public DocumentId {
        Objects.requireNonNull(value, "O identificador do documento não pode ser nulo.");
    }

    public static DocumentId generate() {
        return new DocumentId(UUID.randomUUID());
    }

    public static DocumentId fromString(String id) {
        return new DocumentId(UUID.fromString(id));
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
