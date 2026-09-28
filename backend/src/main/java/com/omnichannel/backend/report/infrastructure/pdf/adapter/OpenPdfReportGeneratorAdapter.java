package com.omnichannel.backend.report.infrastructure.pdf.adapter;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.omnichannel.backend.report.application.port.output.PdfReportGeneratorPort;
import com.omnichannel.backend.report.domain.entity.ExecutiveReportData;
import com.omnichannel.backend.report.domain.exception.ReportGenerationException;
import com.omnichannel.backend.report.domain.valueobject.SummaryItem;
import com.omnichannel.backend.report.infrastructure.pdf.chart.JFreeChartRenderer;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class OpenPdfReportGeneratorAdapter implements PdfReportGeneratorPort {

    private final JFreeChartRenderer chartRenderer;

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").withZone(ZoneId.systemDefault());

    // Cores corporativas elegantes
    private static final Color COLOR_PRIMARY = new Color(15, 23, 42);      // Slate 900
    private static final Color COLOR_ACCENT = new Color(79, 70, 229);      // Indigo 600
    private static final Color COLOR_TEXT_MUTED = new Color(100, 116, 139);// Slate 500
    private static final Color COLOR_BG_LIGHT = new Color(248, 250, 252);  // Slate 50
    private static final Color COLOR_BORDER = new Color(226, 232, 240);    // Slate 200
    private static final Color COLOR_WHITE = Color.WHITE;

    // Fontes
    private final Font fontTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, COLOR_PRIMARY);
    private final Font fontSubtitle = FontFactory.getFont(FontFactory.HELVETICA, 10, COLOR_TEXT_MUTED);
    private final Font fontSectionTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, COLOR_PRIMARY);
    private final Font fontKpiNumber = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, COLOR_ACCENT);
    private final Font fontKpiLabel = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, COLOR_TEXT_MUTED);
    private final Font fontTableHeader = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, COLOR_WHITE);
    private final Font fontTableCell = FontFactory.getFont(FontFactory.HELVETICA, 9, COLOR_PRIMARY);
    private final Font fontTableNumber = FontFactory.getFont(FontFactory.HELVETICA, 9, COLOR_PRIMARY);

    public OpenPdfReportGeneratorAdapter(JFreeChartRenderer chartRenderer) {
        this.chartRenderer = chartRenderer;
    }

    @Override
    public byte[] generatePdf(ExecutiveReportData reportData) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024);
        Document document = new Document(PageSize.A4, 36, 36, 46, 46);

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            HeaderFooterPageEvent event = new HeaderFooterPageEvent(reportData);
            writer.setPageEvent(event);

            document.open();

            // 1. Cabeçalho / Identificação do Relatório
            addReportHeader(document, reportData);

            // 2. Cards de KPI (Key Performance Indicators)
            addKpiSection(document, reportData);

            // 3. Gráficos (Pizza/Donut de Modos + Barras de Volume Diário)
            addChartsSection(document, reportData);

            // Quebra de página intencional para manter o Dashboard e a Tabela em páginas limpas e dedicadas
            document.newPage();

            // 4. Tabela de Detalhamento Operacional (com repetição de cabeçalho e proteção de linha)
            addDetailedTableSection(document, reportData);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new ReportGenerationException("Falha ao gerar o documento PDF do relatório executivo", e);
        }
    }

    private void addReportHeader(Document document, ExecutiveReportData reportData) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{65f, 35f});
        headerTable.setSpacingAfter(15f);

        // Coluna da Esquerda: Título e Período
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.addElement(new Paragraph(reportData.getTitle(), fontTitle));
        Paragraph subtitle = new Paragraph("Período analisado: " + reportData.getPeriod().formatted(), fontSubtitle);
        subtitle.setSpacingBefore(3f);
        leftCell.addElement(subtitle);
        headerTable.addCell(leftCell);

        // Coluna da Direita: Metadados (Emissão, Solicitante, ID)
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Paragraph meta = new Paragraph();
        meta.setAlignment(Element.ALIGN_RIGHT);
        meta.add(new Phrase("Protocolo: " + reportData.getReportId() + "\n", fontKpiLabel));
        meta.add(new Phrase("Emitido em: " + DATE_TIME_FORMATTER.format(reportData.getGeneratedAt()) + "\n", fontSubtitle));
        meta.add(new Phrase("Gerado por: " + reportData.getGeneratedBy(), fontSubtitle));
        rightCell.addElement(meta);
        headerTable.addCell(rightCell);

        document.add(headerTable);

        // Linha divisória sutil
        document.add(createDividerLine());
    }

    private void addKpiSection(Document document, ExecutiveReportData data) throws DocumentException {
        Paragraph title = new Paragraph("Indicadores Principais", fontSectionTitle);
        title.setSpacingBefore(10f);
        title.setSpacingAfter(8f);
        document.add(title);

        PdfPTable kpiTable = new PdfPTable(4);
        kpiTable.setWidthPercentage(100);
        kpiTable.setKeepTogether(true);
        kpiTable.setSpacingAfter(15f);

        kpiTable.addCell(createKpiCard("TOTAL DE SESSÕES", String.format("%,d", data.getTotalSessions())));
        kpiTable.addCell(createKpiCard("MENSAGENS TROCADAS", String.format("%,d", data.getTotalMessages())));
        kpiTable.addCell(createKpiCard("TEMPO MÉDIO RESPOSTA", String.format("%.2fs", data.getAverageResponseTimeSeconds())));
        kpiTable.addCell(createKpiCard("TAXA DE RESOLUÇÃO", String.format("%.1f%%", data.getOverallSatisfactionPercentage())));

        document.add(kpiTable);
    }

    private PdfPCell createKpiCard(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(COLOR_BG_LIGHT);
        cell.setBorderColor(COLOR_BORDER);
        cell.setBorderWidth(1f);
        cell.setPadding(8f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph lbl = new Paragraph(label, fontKpiLabel);
        lbl.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(lbl);

        Paragraph val = new Paragraph(value, fontKpiNumber);
        val.setAlignment(Element.ALIGN_CENTER);
        val.setSpacingBefore(4f);
        cell.addElement(val);

        return cell;
    }

    private void addChartsSection(Document document, ExecutiveReportData reportData) throws Exception {
        Paragraph title = new Paragraph("Análise Visual de Performance", fontSectionTitle);
        title.setSpacingBefore(5f);
        title.setSpacingAfter(8f);
        document.add(title);

        PdfPTable chartsTable = new PdfPTable(2);
        chartsTable.setWidthPercentage(100);
        chartsTable.setWidths(new float[]{50f, 50f});
        chartsTable.setKeepTogether(true);
        chartsTable.setSpacingAfter(15f);

        // 1. Gráfico de Pizza (Distribuição de Modos/Canais)
        byte[] pieBytes = chartRenderer.renderDistributionPieChart(reportData.getModeDistribution(), 300, 200);
        Image pieImage = Image.getInstance(pieBytes);
        pieImage.scaleToFit(250, 160);
        pieImage.setAlignment(Element.ALIGN_CENTER);

        PdfPCell pieCell = new PdfPCell();
        pieCell.setBorderColor(COLOR_BORDER);
        pieCell.setBackgroundColor(COLOR_WHITE);
        pieCell.setPadding(6f);
        pieCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        pieCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        pieCell.addElement(pieImage);
        chartsTable.addCell(pieCell);

        // 2. Gráfico de Barras (Volume Temporal)
        byte[] barBytes = chartRenderer.renderTimeSeriesBarChart(reportData.getDailyVolumeSeries(), 300, 200);
        Image barImage = Image.getInstance(barBytes);
        barImage.scaleToFit(250, 160);
        barImage.setAlignment(Element.ALIGN_CENTER);

        PdfPCell barCell = new PdfPCell();
        barCell.setBorderColor(COLOR_BORDER);
        barCell.setBackgroundColor(COLOR_WHITE);
        barCell.setPadding(6f);
        barCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        barCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        barCell.addElement(barImage);
        chartsTable.addCell(barCell);

        document.add(chartsTable);
    }

    private void addDetailedTableSection(Document document, ExecutiveReportData reportData) throws DocumentException {
        Paragraph pageContext = new Paragraph("OMNICHANNEL ENTERPRISE ANALYTICS — SEÇÃO OPERACIONAL", fontKpiLabel);
        pageContext.setSpacingBefore(0f);
        pageContext.setSpacingAfter(3f);
        document.add(pageContext);

        Paragraph title = new Paragraph("Detalhamento por Canal e Especialidade", fontSectionTitle);
        title.setSpacingBefore(2f);
        title.setSpacingAfter(8f);
        document.add(title);

        document.add(createDividerLine());

        List<SummaryItem> items = reportData.getSummaryItems();
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{30f, 20f, 20f, 18f, 12f});
        table.setHeaderRows(1);      // Cabeçalho da tabela se repete caso transborde para a próxima página
        table.setSplitLate(true);    // Nunca corta uma linha ao meio: empurra a linha inteira para a nova página
        table.setSplitRows(true);

        // Headers
        String[] headers = {"Canal / Especialidade", "Interações", "Tempo Médio", "Resolução", "Status"};
        for (int i = 0; i < headers.length; i++) {
            PdfPCell cell = new PdfPCell(new Phrase(headers[i], fontTableHeader));
            cell.setBackgroundColor(COLOR_PRIMARY);
            cell.setPadding(6f);
            cell.setHorizontalAlignment(i >= 1 && i <= 3 ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
            if (i == 4) cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setBorder(Rectangle.NO_BORDER);
            table.addCell(cell);
        }

        // Rows
        boolean alternate = false;
        for (SummaryItem item : items) {
            Color rowBg = alternate ? COLOR_BG_LIGHT : COLOR_WHITE;
            alternate = !alternate;

            table.addCell(createDataCell(item.channelOrMode(), Element.ALIGN_LEFT, rowBg, fontTableCell));
            table.addCell(createDataCell(String.format("%,d", item.totalInteractions()), Element.ALIGN_RIGHT, rowBg, fontTableNumber));
            table.addCell(createDataCell(String.format("%.2fs", item.averageResponseTimeSec()), Element.ALIGN_RIGHT, rowBg, fontTableNumber));
            table.addCell(createDataCell(String.format("%.1f%%", item.resolutionRatePercentage()), Element.ALIGN_RIGHT, rowBg, fontTableNumber));
            table.addCell(createStatusCell(item.status(), rowBg));
        }

        document.add(table);
    }

    private PdfPCell createDataCell(String text, int alignment, Color bgColor, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(alignment);
        cell.setPaddingTop(5f);
        cell.setPaddingBottom(5f);
        cell.setPaddingLeft(6f);
        cell.setPaddingRight(6f);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(COLOR_BORDER);
        cell.setBorderWidth(0.5f);
        return cell;
    }

    private PdfPCell createStatusCell(String status, Color bgColor) {
        Font statusFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8,
                "EXCELENTE".equalsIgnoreCase(status) ? new Color(16, 185, 129) :
                "ALERTA".equalsIgnoreCase(status) ? new Color(245, 158, 11) :
                COLOR_ACCENT);

        PdfPCell cell = new PdfPCell(new Phrase(status, statusFont));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPaddingTop(5f);
        cell.setPaddingBottom(5f);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(COLOR_BORDER);
        cell.setBorderWidth(0.5f);
        return cell;
    }

    private PdfPTable createDividerLine() {
        PdfPTable lineTable = new PdfPTable(1);
        lineTable.setWidthPercentage(100);
        PdfPCell lineCell = new PdfPCell();
        lineCell.setBorder(Rectangle.BOTTOM);
        lineCell.setBorderColor(COLOR_BORDER);
        lineCell.setBorderWidth(0.8f);
        lineCell.setPadding(0);
        lineTable.addCell(lineCell);
        lineTable.setSpacingAfter(8f);
        return lineTable;
    }

    /**
     * Auxiliar de paginação e cabeçalho dinâmico do PDF
     */
    private static class HeaderFooterPageEvent extends PdfPageEventHelper {

        private final ExecutiveReportData reportData;
        private PdfTemplate totalPagesTemplate;
        private BaseFont baseFont;

        public HeaderFooterPageEvent(ExecutiveReportData reportData) {
            this.reportData = reportData;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            totalPagesTemplate = writer.getDirectContent().createTemplate(30, 16);
            try {
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                throw new ReportGenerationException("Erro ao carregar fonte do rodapé", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();

            // Rodapé: Linha + Texto à esquerda + Paginação à direita
            float footerY = document.bottom() - 15;

            // Linha divisória do rodapé
            cb.setColorStroke(COLOR_BORDER);
            cb.setLineWidth(0.5f);
            cb.moveTo(document.left(), footerY + 12);
            cb.lineTo(document.right(), footerY + 12);
            cb.stroke();

            // Texto informativo à esquerda
            cb.beginText();
            cb.setFontAndSize(baseFont, 8);
            cb.setColorFill(COLOR_TEXT_MUTED);
            cb.setTextMatrix(document.left(), footerY);
            cb.showText("Omnichannel Enterprise Analytics — Documento Confidencial");
            cb.endText();

            // Paginação à direita ("Página X de ")
            String pageText = "Página " + writer.getPageNumber() + " de ";
            float textSize = baseFont.getWidthPoint(pageText, 8);
            cb.beginText();
            cb.setFontAndSize(baseFont, 8);
            cb.setColorFill(COLOR_TEXT_MUTED);
            cb.setTextMatrix(document.right() - textSize - 15, footerY);
            cb.showText(pageText);
            cb.endText();

            // Adiciona o template onde o total de páginas será gravado no encerramento
            cb.addTemplate(totalPagesTemplate, document.right() - 15, footerY);
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            totalPagesTemplate.beginText();
            totalPagesTemplate.setFontAndSize(baseFont, 8);
            totalPagesTemplate.setColorFill(COLOR_TEXT_MUTED);
            totalPagesTemplate.showText(String.valueOf(writer.getPageNumber() - 1));
            totalPagesTemplate.endText();
        }
    }
}
