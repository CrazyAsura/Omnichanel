package com.omnichannel.backend.file.domain.exception;

public class DocumentNotFoundException extends RuntimeException {
    public DocumentNotFoundException(String message) {
        super(message);
    }

    public static DocumentNotFoundException withName(String name) {
        return new DocumentNotFoundException("Documento não encontrado: " + name);
    }
}
