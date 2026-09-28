package com.omnichannel.backend.chat.presentation.response;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.GeneratedFileOutput;

import java.util.List;

public record ChatPromptResponse(
    String sessionId,
    String reply,
    String agentUsed,
    GeneratedFileResponse file,
    List<String> sources,
    long executionTimeMs,
    boolean success
) {
    public record GeneratedFileResponse(String name, String content, String mimeType) {}

    public static ChatPromptResponse from(ChatMessageOutput output) {
        GeneratedFileResponse fileResp = null;
        if (output.generatedFile() != null) {
            GeneratedFileOutput f = output.generatedFile();
            fileResp = new GeneratedFileResponse(f.name(), f.content(), f.mimeType());
        }

        return new ChatPromptResponse(
                output.sessionId(),
                output.reply(),
                output.agentUsed(),
                fileResp,
                output.sourcesConsulted() != null ? output.sourcesConsulted() : List.of(),
                output.executionTimeMs(),
                output.success()
        );
    }
}
