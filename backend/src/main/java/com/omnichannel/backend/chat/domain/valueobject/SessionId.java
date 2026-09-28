package com.omnichannel.backend.chat.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

public record SessionId(String value) {

    public SessionId {
        if (value == null || value.isBlank()) {
            value = UUID.randomUUID().toString();
        }
    }

    public static SessionId of(String value) {
        return new SessionId(value);
    }

    public static SessionId generate() {
        return new SessionId(UUID.randomUUID().toString());
    }
}
