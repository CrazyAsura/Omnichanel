package com.omnichannel.backend.report.domain.valueobject;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public record ReportPeriod(LocalDate startDate, LocalDate endDate) {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public ReportPeriod {
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Data inicial (" + startDate + ") não pode ser posterior à data final (" + endDate + ")");
        }
    }

    public static ReportPeriod lastDays(int days) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(Math.max(1, days));
        return new ReportPeriod(start, end);
    }

    public String formatted() {
        return startDate.format(FORMATTER) + " a " + endDate.format(FORMATTER);
    }
}
