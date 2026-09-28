package com.omnichannel.backend.chat.application.port.output;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.SendChatMessageCommand;

public interface AiAgentRpcPort {

    ChatMessageOutput callAgent(SendChatMessageCommand command);

    boolean isHealthy();
}
