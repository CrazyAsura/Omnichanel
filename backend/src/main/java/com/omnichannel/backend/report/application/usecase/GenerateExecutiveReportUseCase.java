package com.omnichannel.backend.report.application.usecase;

import com.omnichannel.backend.report.application.dto.GenerateReportCommand;
import com.omnichannel.backend.report.application.dto.ReportDocumentOutput;
import com.omnichannel.backend.report.application.port.input.GenerateExecutiveReportInputPort;
import com.omnichannel.backend.report.application.port.output.PdfReportGeneratorPort;
import com.omnichannel.backend.report.application.port.output.ReportDataProviderPort;
import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.exception.ReportGenerationException;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;

import java.time.format.DateTimeFormatter;
import java.util.Objects;

public final class GenerateExecutiveReportUseCase implements GenerateExecutiveReportInputPort {

    private final ReportDataProviderPort dataProviderPort;
    private final PdfReportGeneratorPort pdfGeneratorPort;

    public GenerateExecutiveReportUseCase(
            ReportDataProviderPort dataProviderPort,
            PdfReportGeneratorPort pdfGeneratorPort) {
        this.dataProviderPort = Objects.requireNonNull(dataProviderPort, "dataProviderPort cannot be null");
        this.pdfGeneratorPort = Objects.requireNonNull(pdfGeneratorPort, "pdfGeneratorPort cannot be null");
    }

    @Override
    public ReportDocumentOutput execute(GenerateReportCommand command) {
        if (command == null) {
            throw new ReportGenerationException("Comando de relatório não pode ser nulo");
        }

        ReportPeriod period = new ReportPeriod(command.startDate(), command.endDate());
        ExecutiveReportData reportData = dataProviderPort.provideData(period, command.title(), command.requestedBy());

        byte[] pdfBytes = pdfGeneratorPort.generatePdf(reportData);

        String sanitizedTitle = command.title().toLowerCase()
                .replaceAll("[^a-z0-9_-]", "-")
                .replaceAll("-+", "-");
        String fileName = String.format("%s_%s.pdf",
                sanitizedTitle,
                period.startDate().format(DateTimeFormatter.BASIC_ISO_DATE));

        return new ReportDocumentOutput(fileName, "application/pdf", pdfBytes);
    }
}
