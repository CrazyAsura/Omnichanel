package com.omnichannel.backend.file.presentation.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record UpdateAccessRequest(
        @NotBlank(message = "O nível de acesso é obrigatório.")
        @Schema(description = "Nível de acesso (all, admin, super-admin)", example = "admin")
        String accessLevel
) {}
