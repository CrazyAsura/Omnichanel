package com.omnichannel.backend.file.presentation.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDocumentRequest(
        @NotBlank(message = "O nome do arquivo é obrigatório.")
        @Size(max = 255, message = "O nome do arquivo não pode exceder 255 caracteres.")
        @Schema(description = "Nome do documento com extensão", example = "Relatório de Vendas.pdf")
        String name,

        @Schema(description = "Proprietário ou autor do arquivo", example = "Marina Costa")
        String owner,

        @Schema(description = "Tamanho formatado do arquivo", example = "1,5 MB")
        String size,

        @Schema(description = "Extensão ou tipo do arquivo", example = "PDF")
        String type
) {}
