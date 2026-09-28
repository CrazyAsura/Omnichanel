package com.omnichannel.backend.file.presentation.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeleteDocumentRequest(
        @NotBlank(message = "A justificativa é obrigatória.")
        @Size(min = 8, message = "A justificativa deve ter no mínimo 8 caracteres.")
        @Schema(description = "Justificativa auditável para exclusão do documento", example = "Arquivo duplicado ou desatualizado")
        String reason
) {}
