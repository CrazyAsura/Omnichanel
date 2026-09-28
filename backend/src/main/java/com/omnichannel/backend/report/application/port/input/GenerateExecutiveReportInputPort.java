package com.omnichannel.backend.report.application.port.input;

import com.omnichannel.backend.report.application.dto.GenerateReportCommand;
import com.omnichannel.backend.report.application.dto.ReportDocumentOutput;

public interface GenerateExecutiveReportInputPort {

    ReportDocumentOutput execute(GenerateReportCommand command);
}
