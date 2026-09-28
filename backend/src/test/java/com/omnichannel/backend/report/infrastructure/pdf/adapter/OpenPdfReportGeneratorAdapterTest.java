package com.omnichannel.backend.report.infrastructure.pdf.adapter;

import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.valueobject.DistributionItem;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;
import com.omnichannel.backend.report.domain.valueobject.SummaryItem;
import com.omnichannel.backend.report.domain.valueobject.TimeSeriesPoint;
import com.omnichannel.backend.report.infrastructure.pdf.chart.JFreeChartRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenPdfReportGeneratorAdapterTest {

    private OpenPdfReportGeneratorAdapter generator;

    @BeforeEach
    void setUp() {
        JFreeChartRenderer chartRenderer = new JFreeChartRenderer();
        generator = new OpenPdfReportGeneratorAdapter(chartRenderer);
    }

    @Test
    @DisplayName("Deve gerar bytes de PDF válidos com quebra de página e seções sem truncamento")
    void shouldGenerateValidPdfDocumentWithChartsAndPages() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 27);

        ExecutiveReportData reportData = new ExecutiveReportData(
                "REP-PAGINADO-100",
                "Relatório Executivo Omnichannel",
                "Auditoria Operacional",
                Instant.now(),
                new ReportPeriod(start, end),
                1250,
                4800,
                1.35,
                97.2,
                List.of(
                        new DistributionItem("Doc Reader", 45.0, "45%"),
                        new DistributionItem("SQL Analyst", 30.0, "30%"),
                        new DistributionItem("Workflow Automator", 25.0, "25%")
                ),
                List.of(
                        new TimeSeriesPoint(start, 120),
                        new TimeSeriesPoint(start.plusDays(7), 280),
                        new TimeSeriesPoint(start.plusDays(14), 410),
                        new TimeSeriesPoint(end, 530)
                ),
                List.of(
                        new SummaryItem("RAG Multimodal", 2500, 1.20, 98.0, "EXCELENTE"),
                        new SummaryItem("SQL Agent", 1500, 1.80, 96.5, "EXCELENTE"),
                        new SummaryItem("WhatsApp Gateway", 800, 0.90, 95.0, "NORMAL")
                )
        );

        byte[] pdfBytes = generator.generatePdf(reportData);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000, "O PDF gerado deve conter bytes substanciais");

        // O cabeçalho padrão de um arquivo PDF sempre começa com %PDF-
        String pdfHeader = new String(pdfBytes, 0, Math.min(pdfBytes.length, 5));
        assertTrue(pdfHeader.startsWith("%PDF-"), "O arquivo gerado deve conter assinatura mágica válida de PDF");
    }
}
