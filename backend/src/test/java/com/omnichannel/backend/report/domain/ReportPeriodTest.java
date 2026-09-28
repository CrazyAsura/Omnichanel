package com.omnichannel.backend.report.domain;

import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ReportPeriodTest {

    @Test
    @DisplayName("Deve criar período válido quando datas forem consistentes")
    void shouldCreateValidReportPeriodWhenDatesAreConsistent() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 27);

        ReportPeriod period = new ReportPeriod(start, end);

        assertNotNull(period);
        assertEquals(start, period.startDate());
        assertEquals(end, period.endDate());
        assertEquals("01/09/2026 a 27/09/2026", period.formatted());
    }

    @Test
    @DisplayName("Deve lançar IllegalArgumentException quando data inicial for posterior à data final")
    void shouldThrowExceptionWhenStartDateIsAfterEndDate() {
        LocalDate start = LocalDate.of(2026, 9, 28);
        LocalDate end = LocalDate.of(2026, 9, 27);

        assertThrows(IllegalArgumentException.class, () -> new ReportPeriod(start, end));
    }

    @Test
    @DisplayName("Deve aplicar valores default seguros quando datas forem nulas")
    void shouldFallbackToDefaultsWhenDatesAreNull() {
        ReportPeriod period = new ReportPeriod(null, null);

        assertNotNull(period.startDate());
        assertNotNull(period.endDate());
        assertEquals(LocalDate.now(), period.endDate());
        assertEquals(LocalDate.now().minusDays(30), period.startDate());
    }
}
