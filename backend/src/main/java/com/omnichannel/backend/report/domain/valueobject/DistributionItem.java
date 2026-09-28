package com.omnichannel.backend.report.domain.valueobject;

public record DistributionItem(
    String category,
    double value,
    String percentageLabel
) {
    public DistributionItem {
        if (category == null || category.isBlank()) {
            category = "Outros";
        }
        if (value < 0) {
            value = 0;
        }
        if (percentageLabel == null || percentageLabel.isBlank()) {
            percentageLabel = "";
        }
    }
}
