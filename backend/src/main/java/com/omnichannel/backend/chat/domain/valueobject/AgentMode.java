package com.omnichannel.backend.chat.domain.valueobject;

public enum AgentMode {
    DOC_READER("Leitor de documentos internos"),
    DATA_ANALYST("Analista de dados"),
    FILE_GENERATOR("Gerador de arquivos"),
    GENERAL_ASSISTANT("Assistente geral");

    private final String description;

    AgentMode(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public static AgentMode fromString(String value) {
        if (value == null || value.isBlank()) {
            return DOC_READER;
        }
        String normalized = value.trim().toLowerCase();
        if (normalized.contains("leitor") || normalized.contains("document")) {
            return DOC_READER;
        }
        if (normalized.contains("analista") || normalized.contains("dado")) {
            return DATA_ANALYST;
        }
        if (normalized.contains("gerador") || normalized.contains("arquivo") || normalized.contains("relat")) {
            return FILE_GENERATOR;
        }
        return DOC_READER;
    }
}
