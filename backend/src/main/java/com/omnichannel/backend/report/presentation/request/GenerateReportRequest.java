package com.omnichannel.backend.report.presentation.request;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Schema(description = "Filtros para emissão do relatório analítico executivo")
public record GenerateReportRequest(
        @Schema(description = "Data inicial (padrão: 30 dias atrás)", example = "2026-08-28")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate startDate,

        @Schema(description = "Data final (padrão: hoje)", example = "2026-09-27")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate endDate,

        @Schema(description = "Título customizado para o documento", example = "Relatório Executivo Omnichannel")
        String title,

        @Schema(description = "Nome do operador ou solicitante", example = "Coordenação de Atendimento")
        String requestedBy,

        @Schema(description = "Se verdadeiro, força o download (attachment). Se falso, exibe no navegador (inline)", example = "false")
        Boolean download
) {}
