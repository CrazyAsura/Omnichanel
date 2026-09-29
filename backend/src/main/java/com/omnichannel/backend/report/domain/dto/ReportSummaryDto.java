package com.omnichannel.backend.report.domain.dto;

import java.util.List;

public record ReportSummaryDto(
        String users,
        String requests,
        String files,
        String errors,
        List<ReportRowDto> reportRows
) {
    public record ReportRowDto(
            String label,
            String value,
            String change,
            String width
    ) {}
}
