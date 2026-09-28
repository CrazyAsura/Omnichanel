package com.omnichannel.backend.file.presentation.response;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

public record DocumentResponse(
        @Schema(description = "Identificador único do documento")
        UUID id,

        @Schema(description = "Nome do arquivo", example = "Contrato de integração.pdf")
        String name,

        @Schema(description = "Proprietário", example = "Marina Costa")
        String owner,

        @Schema(description = "Tamanho do arquivo", example = "2,4 MB")
        String size,

        @Schema(description = "Data ou status da última modificação", example = "Hoje, 10:42")
        String updated,

        @Schema(description = "Tipo/extensão do documento", example = "PDF")
        String type,

        @Schema(description = "Nível de permissão atribuído", example = "all")
        String accessLevel
) {
    public static DocumentResponse fromOutput(DocumentOutput out) {
        return new DocumentResponse(
                out.id(),
                out.name(),
                out.owner(),
                out.size(),
                out.updated(),
                out.type(),
                out.accessLevel()
        );
    }
}
