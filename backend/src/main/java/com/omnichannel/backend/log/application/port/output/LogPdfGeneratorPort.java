package com.omnichannel.backend.log.application.port.output;

import com.omnichannel.backend.log.domain.dto.ActivityLogDto;
import com.omnichannel.backend.log.domain.dto.ErrorLogDto;

import java.util.List;

public interface LogPdfGeneratorPort {
    byte[] generateActivityLogsPdf(List<ActivityLogDto> logs, String requestedBy);
    byte[] generateErrorLogsPdf(List<ErrorLogDto> logs, String requestedBy);
}
