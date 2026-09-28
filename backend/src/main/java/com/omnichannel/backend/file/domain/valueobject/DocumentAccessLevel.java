package com.omnichannel.backend.file.domain.valueobject;

import java.util.Arrays;

public enum DocumentAccessLevel {
    ALL("all"),
    ADMIN("admin"),
    SUPER_ADMIN("super-admin");

    private final String code;

    DocumentAccessLevel(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static DocumentAccessLevel fromCode(String code) {
        if (code == null || code.isBlank()) {
            return ALL;
        }
        return Arrays.stream(values())
                .filter(level -> level.code.equalsIgnoreCase(code.trim()) || level.name().equalsIgnoreCase(code.trim()))
                .findFirst()
                .orElse(ALL);
    }
}
