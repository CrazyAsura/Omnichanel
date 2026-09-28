package com.omnichannel.backend.report.application.port.output;

import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;

public interface PdfReportGeneratorPort {

    byte[] generatePdf(ExecutiveReportData reportData);
}
