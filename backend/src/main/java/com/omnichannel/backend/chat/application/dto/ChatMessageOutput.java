package com.omnichannel.backend.chat.application.dto;

import java.util.List;

public record ChatMessageOutput(
    String sessionId,
    String reply,
    String agentUsed,
    GeneratedFileOutput generatedFile,
    List<String> sourcesConsulted,
    long executionTimeMs,
    boolean success,
    String errorMessage
) {}
