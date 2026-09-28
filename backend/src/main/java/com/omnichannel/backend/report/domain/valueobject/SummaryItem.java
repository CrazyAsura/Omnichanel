package com.omnichannel.backend.report.domain.valueobject;

public record SummaryItem(
    String channelOrMode,
    long totalInteractions,
    double averageResponseTimeSec,
    double resolutionRatePercentage,
    String status
) {
    public SummaryItem {
        if (channelOrMode == null || channelOrMode.isBlank()) {
            channelOrMode = "Desconhecido";
        }
        if (status == null || status.isBlank()) {
            status = "NORMAL";
        }
    }
}
