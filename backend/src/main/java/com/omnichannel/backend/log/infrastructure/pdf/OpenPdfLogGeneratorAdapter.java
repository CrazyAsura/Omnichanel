package com.omnichannel.backend.log.infrastructure.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
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
import com.omnichannel.backend.log.application.port.output.LogPdfGeneratorPort;
import com.omnichannel.backend.log.domain.dto.ActivityLogDto;
import com.omnichannel.backend.log.domain.dto.ErrorLogDto;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class OpenPdfLogGeneratorAdapter implements LogPdfGeneratorPort {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").withZone(ZoneId.systemDefault());

    private static final Color COLOR_PRIMARY = new Color(15, 23, 42);      // Slate 900
    private static final Color COLOR_TEXT_MUTED = new Color(100, 116, 139);// Slate 500
    private static final Color COLOR_HEADER_BG = new Color(30, 41, 59);    // Slate 800
    private static final Color COLOR_ROW_ALT = new Color(248, 250, 252);   // Slate 50
    private static final Color COLOR_BORDER = new Color(226, 232, 240);    // Slate 200
    private static final Color COLOR_SUCCESS = new Color(16, 185, 129);    // Emerald 500
    private static final Color COLOR_DANGER = new Color(239, 68, 68);      // Red 500
    private static final Color COLOR_WHITE = Color.WHITE;

    private final Font fontTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, COLOR_PRIMARY);
    private final Font fontMeta = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, COLOR_TEXT_MUTED);
    private final Font fontTableHeader = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, COLOR_WHITE);
    private final Font fontTableCell = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, COLOR_PRIMARY);
    private final Font fontTableMuted = FontFactory.getFont(FontFactory.HELVETICA, 8, COLOR_TEXT_MUTED);
    private final Font fontBadgeSuccess = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, COLOR_SUCCESS);
    private final Font fontBadgeDanger = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, COLOR_DANGER);

    @Override
    public byte[] generateActivityLogsPdf(List<ActivityLogDto> logs, String requestedBy) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024);
        Document document = new Document(PageSize.A4.rotate(), 30, 30, 36, 36);

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            writer.setPageEvent(new LogHeaderFooterEvent("LOGS DE ATIVIDADES E AUDITORIA", requestedBy));
            document.open();

            // Header Section
            addTitleSection(document, "Relatório de Auditoria e Atividades do Sistema", requestedBy, logs.size());

            // Table of activities
            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{18f, 22f, 25f, 23f, 12f});
            table.setHeaderRows(1);
            table.setSpacingBefore(10f);

            addHeaderCell(table, "Data / Hora");
            addHeaderCell(table, "Usuário / Ator");
            addHeaderCell(table, "Ação Realizada");
            addHeaderCell(table, "Recurso Afetado");
            addHeaderCell(table, "Resultado");

            boolean alt = false;
            for (ActivityLogDto log : logs) {
                Color bg = alt ? COLOR_ROW_ALT : COLOR_WHITE;
                String timeStr = log.occurredAt() != null ? DATE_TIME_FORMATTER.format(log.occurredAt()) : log.time();

                addBodyCell(table, timeStr, fontTableCell, bg, Element.ALIGN_LEFT);
                addBodyCell(table, log.user(), fontTableCell, bg, Element.ALIGN_LEFT);
                addBodyCell(table, log.action(), fontTableCell, bg, Element.ALIGN_LEFT);
                addBodyCell(table, log.target(), fontTableMuted, bg, Element.ALIGN_LEFT);

                boolean isSuccess = "SUCCESS".equalsIgnoreCase(log.outcome()) || "OK".equalsIgnoreCase(log.outcome());
                addBodyCell(table, log.outcome() != null ? log.outcome() : "OK",
                        isSuccess ? fontBadgeSuccess : fontBadgeDanger, bg, Element.ALIGN_CENTER);
                alt = !alt;
            }

            document.add(table);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Falha ao gerar PDF de logs de atividades: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] generateErrorLogsPdf(List<ErrorLogDto> errors, String requestedBy) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024);
        Document document = new Document(PageSize.A4.rotate(), 30, 30, 36, 36);

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            writer.setPageEvent(new LogHeaderFooterEvent("LOGS DE ERROS E EXCEÇÕES", requestedBy));
            document.open();

            // Header Section
            addTitleSection(document, "Relatório Consolidado de Erros e Falhas Operacionais", requestedBy, errors.size());

            // Table of errors
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{14f, 18f, 28f, 18f, 12f, 10f});
            table.setHeaderRows(1);
            table.setSpacingBefore(10f);

            addHeaderCell(table, "Identificador");
            addHeaderCell(table, "Data / Hora");
            addHeaderCell(table, "Descrição da Falha");
            addHeaderCell(table, "Serviço / Ator");
            addHeaderCell(table, "Severidade");
            addHeaderCell(table, "Status");

            boolean alt = false;
            for (ErrorLogDto err : errors) {
                Color bg = alt ? COLOR_ROW_ALT : COLOR_WHITE;
                String timeStr = err.occurredAt() != null ? DATE_TIME_FORMATTER.format(err.occurredAt()) : err.time();

                addBodyCell(table, err.id(), fontTableMuted, bg, Element.ALIGN_LEFT);
                addBodyCell(table, timeStr, fontTableCell, bg, Element.ALIGN_LEFT);
                addBodyCell(table, err.title(), fontTableCell, bg, Element.ALIGN_LEFT);
                addBodyCell(table, err.service() + (err.actor() != null ? " (" + err.actor() + ")" : ""), fontTableMuted, bg, Element.ALIGN_LEFT);

                Font sevFont = "Crítico".equalsIgnoreCase(err.severity()) || "CRITICAL".equalsIgnoreCase(err.severity())
                        ? fontBadgeDanger : fontTableCell;
                addBodyCell(table, err.severity(), sevFont, bg, Element.ALIGN_CENTER);
                addBodyCell(table, err.code() != null ? err.code() : "500", fontBadgeDanger, bg, Element.ALIGN_CENTER);
                alt = !alt;
            }

            document.add(table);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Falha ao gerar PDF de logs de erros: " + e.getMessage(), e);
        }
    }

    private void addTitleSection(Document document, String title, String requestedBy, int totalCount) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{70f, 30f});
        headerTable.setSpacingAfter(8f);

        PdfPCell left = new PdfPCell();
        left.setBorder(Rectangle.NO_BORDER);
        left.addElement(new Paragraph("OMNICHANNEL PLATFORM · SISTEMA DE OBSERVABILIDADE", fontMeta));
        left.addElement(new Paragraph(title, fontTitle));

        PdfPCell right = new PdfPCell();
        right.setBorder(Rectangle.NO_BORDER);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        right.addElement(new Paragraph("Emitido em: " + DATE_TIME_FORMATTER.format(Instant.now()), fontMeta));
        right.addElement(new Paragraph("Solicitante: " + (requestedBy != null ? requestedBy : "Sistema"), fontMeta));
        right.addElement(new Paragraph("Total de registros: " + totalCount, fontMeta));

        headerTable.addCell(left);
        headerTable.addCell(right);
        document.add(headerTable);
    }

    private void addHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, fontTableHeader));
        cell.setBackgroundColor(COLOR_HEADER_BG);
        cell.setPadding(6f);
        cell.setBorderColor(COLOR_HEADER_BG);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text, Font font, Color bg, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
        cell.setBackgroundColor(bg);
        cell.setPadding(5f);
        cell.setBorderColor(COLOR_BORDER);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private static class LogHeaderFooterEvent extends PdfPageEventHelper {
        private final String reportType;
        private final String requestedBy;
        private PdfTemplate totalPagesTemplate;
        private BaseFont baseFont;

        public LogHeaderFooterEvent(String reportType, String requestedBy) {
            this.reportType = reportType;
            this.requestedBy = requestedBy;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
                totalPagesTemplate = writer.getDirectContent().createTemplate(30, 16);
            } catch (Exception ignored) {}
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            float footerY = 16f;
            float leftX = document.left();
            float rightX = document.right();

            cb.beginText();
            cb.setFontAndSize(baseFont, 7.5f);
            cb.setColorFill(COLOR_TEXT_MUTED);

            // Rodapé à esquerda
            cb.showTextAligned(PdfContentByte.ALIGN_LEFT,
                    "OMNICHANNEL PLATFORM · " + reportType + " · Confidencial",
                    leftX, footerY, 0);

            // Paginação à direita
            String pageText = "Página " + writer.getPageNumber() + " de ";
            float textWidth = baseFont.getWidthPoint(pageText, 7.5f);
            cb.showTextAligned(PdfContentByte.ALIGN_RIGHT, pageText, rightX - 15, footerY, 0);
            cb.endText();

            cb.addTemplate(totalPagesTemplate, rightX - 15, footerY);
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            totalPagesTemplate.beginText();
            totalPagesTemplate.setFontAndSize(baseFont, 7.5f);
            totalPagesTemplate.setColorFill(COLOR_TEXT_MUTED);
            totalPagesTemplate.showText(String.valueOf(writer.getPageNumber() - 1));
            totalPagesTemplate.endText();
        }
    }
}
