package com.omnichannel.backend.chat.domain.valueobject;

public record GeneratedFile(
    String name,
    String content,
    String mimeType
) {
    public GeneratedFile {
        if (name == null || name.isBlank()) {
            name = "documento-gerado.md";
        }
        if (content == null) {
            content = "";
        }
        if (mimeType == null || mimeType.isBlank()) {
            mimeType = "text/markdown";
        }
    }
}
