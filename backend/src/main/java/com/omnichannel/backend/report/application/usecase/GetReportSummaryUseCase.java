package com.omnichannel.backend.report.application.usecase;

import com.omnichannel.backend.report.application.port.input.GetReportSummaryInputPort;
import com.omnichannel.backend.report.application.port.output.ReportDataProviderPort;
import com.omnichannel.backend.report.domain.dto.ReportSummaryDto;
import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.valueobject.ReportPeriod;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

public final class GetReportSummaryUseCase implements GetReportSummaryInputPort {

    private final ReportDataProviderPort dataProviderPort;
    private final NumberFormat numberFormat;

    public GetReportSummaryUseCase(ReportDataProviderPort dataProviderPort) {
        this.dataProviderPort = Objects.requireNonNull(dataProviderPort, "dataProviderPort cannot be null");
        this.numberFormat = NumberFormat.getInstance(Locale.forLanguageTag("pt-BR"));
    }

    @Override
    public ReportSummaryDto execute() {
        ExecutiveReportData data = dataProviderPort.provideData(
                ReportPeriod.lastDays(30),
                "Painel Executivo Omnichannel",
                "system"
        );

        long sessions = Math.max(1, data.getTotalSessions());
        long requests = Math.max(1, data.getTotalMessages());

        // Document count from first summary item if present or approximate
        long filesCount = 12L;
        if (!data.getSummaryItems().isEmpty()) {
            String ragName = data.getSummaryItems().get(0).channelOrMode();
            if (ragName.contains("(") && ragName.contains(" docs)")) {
                try {
                    String part = ragName.substring(ragName.indexOf('(') + 1, ragName.indexOf(" docs)"));
                    filesCount = Long.parseLong(part);
                } catch (Exception ignored) {
                }
            }
        }

        long errorCount = Math.max(0, (long)(requests * (1.0 - (data.getOverallSatisfactionPercentage() / 100.0))));

        String usersStr = numberFormat.format(sessions);
        String requestsStr = numberFormat.format(requests);
        String filesStr = numberFormat.format(filesCount);
        String errorsStr = numberFormat.format(errorCount);

        List<ReportSummaryDto.ReportRowDto> rows = List.of(
                new ReportSummaryDto.ReportRowDto("Usuários ativos", usersStr, "+12,8%", "76%"),
                new ReportSummaryDto.ReportRowDto("Requisições da API", requestsStr, "+8,2%", "88%"),
                new ReportSummaryDto.ReportRowDto("Arquivos armazenados", filesStr, "+4,1%", "58%"),
                new ReportSummaryDto.ReportRowDto("Erros registrados", errorsStr, "−2,4%", "24%")
        );

        return new ReportSummaryDto(usersStr, requestsStr, filesStr, errorsStr, rows);
    }
}
