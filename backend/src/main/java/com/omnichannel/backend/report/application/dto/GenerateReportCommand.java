package com.omnichannel.backend.report.application.dto;

import java.time.LocalDate;

public record GenerateReportCommand(
    LocalDate startDate,
    LocalDate endDate,
    String title,
    String requestedBy
) {
    public GenerateReportCommand {
        if (title == null || title.isBlank()) {
            title = "Relatório Executivo Omnichannel";
        }
        if (requestedBy == null || requestedBy.isBlank()) {
            requestedBy = "Admin";
        }
    }
}
