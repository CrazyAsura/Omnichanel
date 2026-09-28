package com.omnichannel.backend.chat.presentation.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ChatPromptRequest(
    @Size(max = 128)
    String sessionId,
    @NotBlank(message = "Message prompt cannot be empty")
    @Size(max = 16000)
    String message,
    @Size(max = 80)
    String agentMode,
    @Size(max = 20)
    List<@Size(max = 256) String> selectedDocs,
    @Size(max = 20)
    List<@Size(max = 128) String> enabledSources
) {}
