package com.omnichannel.backend.chat.domain.exception;

public class InvalidPromptException extends RuntimeException {
    public InvalidPromptException(String message) {
        super(message);
    }
}
