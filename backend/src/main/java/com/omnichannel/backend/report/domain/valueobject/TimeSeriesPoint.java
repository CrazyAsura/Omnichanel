package com.omnichannel.backend.report.domain.valueobject;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public record TimeSeriesPoint(
    LocalDate date,
    double value,
    String label
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM");

    public TimeSeriesPoint {
        if (date == null) {
            date = LocalDate.now();
        }
        if (label == null || label.isBlank()) {
            label = date.format(FORMATTER);
        }
    }

    public TimeSeriesPoint(LocalDate date, double value) {
        this(date, value, date != null ? date.format(FORMATTER) : "");
    }
}
