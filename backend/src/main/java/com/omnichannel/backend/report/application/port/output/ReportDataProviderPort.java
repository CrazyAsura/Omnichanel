package com.omnichannel.backend.report.application.port.output;

import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;

public interface ReportDataProviderPort {

    ExecutiveReportData provideData(ReportPeriod period, String title, String requestedBy);
}
