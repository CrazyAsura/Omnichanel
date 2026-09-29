package com.omnichannel.backend.report.infrastructure.config;

import com.omnichannel.backend.file.infrastructure.persistence.repository.SpringDataDocumentRepository;
import com.omnichannel.backend.report.application.port.input.GenerateExecutiveReportInputPort;
import com.omnichannel.backend.report.application.port.output.PdfReportGeneratorPort;
import com.omnichannel.backend.report.application.port.output.ReportDataProviderPort;
import com.omnichannel.backend.report.application.usecase.GenerateExecutiveReportUseCase;
import com.omnichannel.backend.report.infrastructure.pdf.adapter.OpenPdfReportGeneratorAdapter;
import com.omnichannel.backend.report.infrastructure.pdf.chart.JFreeChartRenderer;
import com.omnichannel.backend.report.infrastructure.persistence.adapter.ChatSessionReportDataProviderAdapter;
import com.omnichannel.backend.security.SecurityAuditService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReportConfiguration {

    @Bean
    public JFreeChartRenderer jFreeChartRenderer() {
        return new JFreeChartRenderer();
    }

    @Bean
    public PdfReportGeneratorPort pdfReportGeneratorPort(JFreeChartRenderer chartRenderer) {
        return new OpenPdfReportGeneratorAdapter(chartRenderer);
    }

    @Bean
    public ReportDataProviderPort reportDataProviderPort(
            SecurityAuditService auditService,
            SpringDataDocumentRepository documentRepository) {
        return new ChatSessionReportDataProviderAdapter(auditService, documentRepository);
    }

    @Bean
    public GenerateExecutiveReportInputPort generateExecutiveReportInputPort(
            ReportDataProviderPort reportDataProviderPort,
            PdfReportGeneratorPort pdfReportGeneratorPort) {
        return new GenerateExecutiveReportUseCase(reportDataProviderPort, pdfReportGeneratorPort);
    }

    @Bean
    public com.omnichannel.backend.report.application.port.input.GetReportSummaryInputPort getReportSummaryInputPort(
            ReportDataProviderPort reportDataProviderPort) {
        return new com.omnichannel.backend.report.application.usecase.GetReportSummaryUseCase(reportDataProviderPort);
    }
}
