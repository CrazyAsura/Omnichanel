package com.omnichannel.backend.report.application.dto;

public record ReportDocumentOutput(
    String fileName,
    String contentType,
    byte[] content,
    long sizeInBytes
) {
    public ReportDocumentOutput {
        if (fileName == null || fileName.isBlank()) {
            fileName = "relatorio-omnichannel.pdf";
        }
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/pdf";
        }
        if (content == null) {
            content = new byte[0];
        }
        sizeInBytes = content.length;
    }

    public ReportDocumentOutput(String fileName, String contentType, byte[] content) {
        this(fileName, contentType, content, content != null ? content.length : 0);
    }
}
