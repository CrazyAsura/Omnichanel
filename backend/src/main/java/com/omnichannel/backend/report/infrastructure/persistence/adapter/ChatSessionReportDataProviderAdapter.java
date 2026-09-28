package com.omnichannel.backend.report.infrastructure.persistence.adapter;

import com.omnichannel.backend.report.application.port.output.ReportDataProviderPort;
import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.valueobject.DistributionItem;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;
import com.omnichannel.backend.report.domain.valueobject.SummaryItem;
import com.omnichannel.backend.report.domain.valueobject.TimeSeriesPoint;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ChatSessionReportDataProviderAdapter implements ReportDataProviderPort {

    @Override
    public ExecutiveReportData provideData(ReportPeriod period, String title, String requestedBy) {
        String reportId = "REP-" + System.currentTimeMillis();

        // Distribuição por Modo / Canal de Atendimento
        List<DistributionItem> modes = List.of(
                new DistributionItem("Doc Reader (RAG)", 42.0, "42%"),
                new DistributionItem("SQL Analyst", 28.0, "28%"),
                new DistributionItem("Workflow Automator", 18.0, "18%"),
                new DistributionItem("Suporte Humano", 12.0, "12%")
        );

        // Volume diário ao longo dos últimos dias do período
        List<TimeSeriesPoint> timeSeries = new ArrayList<>();
        LocalDate current = period.startDate();
        LocalDate end = period.endDate();
        int stepDays = Math.max(1, (int) java.time.temporal.ChronoUnit.DAYS.between(current, end) / 7);

        int sampleIndex = 0;
        int[] baseValues = {145, 230, 310, 280, 420, 390, 510, 480};

        while (!current.isAfter(end) && timeSeries.size() < 10) {
            double val = baseValues[sampleIndex % baseValues.length] + (sampleIndex * 15);
            timeSeries.add(new TimeSeriesPoint(current, val));
            current = current.plusDays(stepDays);
            sampleIndex++;
        }

        // Tabela detalhada de canais
        List<SummaryItem> summaryItems = List.of(
                new SummaryItem("RAG Documental Multimodal", 3540, 1.45, 96.8, "EXCELENTE"),
                new SummaryItem("SQL Agent Analytics", 2120, 2.10, 94.2, "EXCELENTE"),
                new SummaryItem("Automação de Tarefas & CRM", 1480, 0.85, 98.1, "EXCELENTE"),
                new SummaryItem("Triagem Omnichannel (WhatsApp)", 4890, 0.60, 92.5, "NORMAL"),
                new SummaryItem("Transbordo Humano N2", 640, 14.50, 89.0, "ALERTA")
        );

        long totalMessages = 0;
        double sumResponseTime = 0.0;
        double sumResolutionRate = 0.0;
        int count = summaryItems.size();

        for (SummaryItem item : summaryItems) {
            totalMessages += item.totalInteractions();
            sumResponseTime += item.averageResponseTimeSec();
            sumResolutionRate += item.resolutionRatePercentage();
        }

        long totalSessions = totalMessages / 3;
        double avgResponseTime = count > 0 ? sumResponseTime / count : 1.5;
        double satisfaction = count > 0 ? sumResolutionRate / count : 95.0;

        return new ExecutiveReportData(
                reportId,
                title,
                requestedBy,
                Instant.now(),
                period,
                totalSessions,
                totalMessages,
                avgResponseTime,
                satisfaction,
                modes,
                timeSeries,
                summaryItems
        );
    }
}
