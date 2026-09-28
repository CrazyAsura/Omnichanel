package com.omnichannel.backend.chat.domain.exception;

public class AgentExecutionException extends RuntimeException {
    public AgentExecutionException(String message) {
        super(message);
    }

    public AgentExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
