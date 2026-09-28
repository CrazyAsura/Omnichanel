package com.omnichannel.backend.report.domain.entity;

import com.omnichannel.backend.report.domain.valueobject.DistributionItem;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;
import com.omnichannel.backend.report.domain.valueobject.SummaryItem;
import com.omnichannel.backend.report.domain.valueobject.TimeSeriesPoint;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

public class ExecutiveReportData {

    private final String reportId;
    private final String title;
    private final String generatedBy;
    private final Instant generatedAt;
    private final ReportPeriod period;

    // Métricas principais de KPI
    private final long totalSessions;
    private final long totalMessages;
    private final double averageResponseTimeSeconds;
    private final double overallSatisfactionPercentage;

    // Dados para Gráficos
    private final List<DistributionItem> modeDistribution;
    private final List<TimeSeriesPoint> dailyVolumeSeries;

    // Dados para Tabela Detalhada
    private final List<SummaryItem> summaryItems;

    public ExecutiveReportData(
            String reportId,
            String title,
            String generatedBy,
            Instant generatedAt,
            ReportPeriod period,
            long totalSessions,
            long totalMessages,
            double averageResponseTimeSeconds,
            double overallSatisfactionPercentage,
            List<DistributionItem> modeDistribution,
            List<TimeSeriesPoint> dailyVolumeSeries,
            List<SummaryItem> summaryItems) {
        this.reportId = (reportId == null || reportId.isBlank()) ? "REP-" + System.currentTimeMillis() : reportId;
        this.title = (title == null || title.isBlank()) ? "Relatório Executivo Omnichannel" : title;
        this.generatedBy = (generatedBy == null || generatedBy.isBlank()) ? "Sistema Omnichannel Analytics" : generatedBy;
        this.generatedAt = (generatedAt == null) ? Instant.now() : generatedAt;
        this.period = (period == null) ? ReportPeriod.lastDays(30) : period;
        this.totalSessions = Math.max(0, totalSessions);
        this.totalMessages = Math.max(0, totalMessages);
        this.averageResponseTimeSeconds = Math.max(0.0, averageResponseTimeSeconds);
        this.overallSatisfactionPercentage = Math.max(0.0, Math.min(100.0, overallSatisfactionPercentage));
        this.modeDistribution = modeDistribution != null ? List.copyOf(modeDistribution) : Collections.emptyList();
        this.dailyVolumeSeries = dailyVolumeSeries != null ? List.copyOf(dailyVolumeSeries) : Collections.emptyList();
        this.summaryItems = summaryItems != null ? List.copyOf(summaryItems) : Collections.emptyList();
    }

    public String getReportId() {
        return reportId;
    }

    public String getTitle() {
        return title;
    }

    public String getGeneratedBy() {
        return generatedBy;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public ReportPeriod getPeriod() {
        return period;
    }

    public long getTotalSessions() {
        return totalSessions;
    }

    public long getTotalMessages() {
        return totalMessages;
    }

    public double getAverageResponseTimeSeconds() {
        return averageResponseTimeSeconds;
    }

    public double getOverallSatisfactionPercentage() {
        return overallSatisfactionPercentage;
    }

    public List<DistributionItem> getModeDistribution() {
        return modeDistribution;
    }

    public List<TimeSeriesPoint> getDailyVolumeSeries() {
        return dailyVolumeSeries;
    }

    public List<SummaryItem> getSummaryItems() {
        return summaryItems;
    }
}
