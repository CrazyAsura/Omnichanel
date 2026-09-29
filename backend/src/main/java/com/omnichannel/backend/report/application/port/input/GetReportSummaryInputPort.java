package com.omnichannel.backend.report.application.port.input;

import com.omnichannel.backend.report.domain.dto.ReportSummaryDto;

public interface GetReportSummaryInputPort {
    ReportSummaryDto execute();
}
