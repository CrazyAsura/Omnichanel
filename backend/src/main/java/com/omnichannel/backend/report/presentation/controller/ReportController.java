package com.omnichannel.backend.report.presentation.controller;

import com.omnichannel.backend.report.application.dto.GenerateReportCommand;
import com.omnichannel.backend.report.application.dto.ReportDocumentOutput;
import com.omnichannel.backend.report.application.port.input.GenerateExecutiveReportInputPort;
import com.omnichannel.backend.report.presentation.request.GenerateReportRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping({"/api/reports", "/api/v1/reports"})
@Tag(name = "Reports & Analytics PDF", description = "Endpoints para geração de relatórios corporativos em PDF com gráficos de alta fidelidade")
public class ReportController {

    private final GenerateExecutiveReportInputPort generateExecutiveReportInputPort;

    public ReportController(GenerateExecutiveReportInputPort generateExecutiveReportInputPort) {
        this.generateExecutiveReportInputPort = generateExecutiveReportInputPort;
    }

    @GetMapping("/executive/pdf")
    @Operation(
            summary = "Emitir Relatório Executivo em PDF com Gráficos",
            description = "Gera um relatório analítico contendo indicadores KPI, gráfico de distribuição por canal/modo, gráfico de volume diário e tabela de performance."
    )
    @ApiResponse(responseCode = "200", description = "Documento PDF gerado com sucesso")
    public ResponseEntity<byte[]> generateExecutiveReportPdf(
            @ModelAttribute GenerateReportRequest request, Authentication authentication) {
        GenerateReportCommand command = new GenerateReportCommand(
                request.startDate(),
                request.endDate(),
                request.title(),
                authentication == null ? "unknown" : authentication.getName()
        );

        ReportDocumentOutput output = generateExecutiveReportInputPort.execute(command);

        String dispositionType = Boolean.TRUE.equals(request.download()) ? "attachment" : "inline";
        String contentDisposition = String.format("%s; filename=\"%s\"", dispositionType, output.fileName());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(output.sizeInBytes())
                .body(output.content());
    }
}
