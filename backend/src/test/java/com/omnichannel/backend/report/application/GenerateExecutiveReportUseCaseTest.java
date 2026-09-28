package com.omnichannel.backend.report.application;

import com.omnichannel.backend.report.application.dto.GenerateReportCommand;
import com.omnichannel.backend.report.application.dto.ReportDocumentOutput;
import com.omnichannel.backend.report.application.port.output.PdfReportGeneratorPort;
import com.omnichannel.backend.report.application.port.output.ReportDataProviderPort;
import com.omnichannel.backend.report.application.usecase.GenerateExecutiveReportUseCase;
import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.exception.ReportGenerationException;
import com.omnichannel.backend.report.domain.valueobject.DistributionItem;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;
import com.omnichannel.backend.report.domain.valueobject.SummaryItem;
import com.omnichannel.backend.report.domain.valueobject.TimeSeriesPoint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerateExecutiveReportUseCaseTest {

    @Mock
    private ReportDataProviderPort dataProviderPort;

    @Mock
    private PdfReportGeneratorPort pdfGeneratorPort;

    @InjectMocks
    private GenerateExecutiveReportUseCase useCase;

    @Test
    @DisplayName("Deve gerar o relatório executivo em PDF com metadados corretos")
    void shouldGenerateExecutiveReportPdfSuccessfully() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 27);
        GenerateReportCommand command = new GenerateReportCommand(
                start,
                end,
                "Relatorio Operacional Omnichannel",
                "Gestor de Atendimento"
        );

        ExecutiveReportData mockData = new ExecutiveReportData(
                "REP-TEST-123",
                "Relatorio Operacional Omnichannel",
                "Gestor de Atendimento",
                Instant.now(),
                new ReportPeriod(start, end),
                100,
                300,
                1.25,
                98.5,
                List.of(new DistributionItem("WhatsApp", 60.0, "60%")),
                List.of(new TimeSeriesPoint(start, 50.0)),
                List.of(new SummaryItem("WhatsApp", 300, 1.25, 98.5, "EXCELENTE"))
        );

        byte[] fakePdfBytes = "%PDF-1.4 Mocked Content".getBytes();

        when(dataProviderPort.provideData(any(ReportPeriod.class), eq(command.title()), eq(command.requestedBy())))
                .thenReturn(mockData);
        when(pdfGeneratorPort.generatePdf(mockData)).thenReturn(fakePdfBytes);

        ReportDocumentOutput output = useCase.execute(command);

        assertNotNull(output);
        assertEquals("application/pdf", output.contentType());
        assertTrue(output.fileName().endsWith(".pdf"));
        assertTrue(output.fileName().contains("relatorio-operacional-omnichannel"));
        assertArrayEquals(fakePdfBytes, output.content());
        assertEquals(fakePdfBytes.length, output.sizeInBytes());

        verify(dataProviderPort).provideData(any(ReportPeriod.class), eq(command.title()), eq(command.requestedBy()));
        verify(pdfGeneratorPort).generatePdf(mockData);
    }

    @Test
    @DisplayName("Deve lançar ReportGenerationException quando o command for nulo")
    void shouldThrowExceptionWhenCommandIsNull() {
        assertThrows(ReportGenerationException.class, () -> useCase.execute(null));
    }
}
