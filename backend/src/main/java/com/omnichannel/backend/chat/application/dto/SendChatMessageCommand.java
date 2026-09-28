package com.omnichannel.backend.chat.application.dto;

import java.util.List;

public record SendChatMessageCommand(
    String sessionId,
    String message,
    String agentMode,
    List<String> selectedDocs,
    List<String> enabledSources,
    String requestId,
    String requesterRole
) {
    public SendChatMessageCommand(String sessionId, String message, String agentMode,
            List<String> selectedDocs, List<String> enabledSources) {
        this(sessionId, message, agentMode, selectedDocs, enabledSources, null, "EMPLOYEE");
    }

    public SendChatMessageCommand {
        if (selectedDocs == null) {
            selectedDocs = List.of();
        }
        if (enabledSources == null) {
            enabledSources = List.of();
        }
        if (requesterRole == null || requesterRole.isBlank()) {
            requesterRole = "EMPLOYEE";
        }
    }
}
