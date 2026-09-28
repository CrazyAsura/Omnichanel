package com.omnichannel.backend.chat.application.port.input;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.chat.application.dto.SendChatMessageCommand;

public interface SendChatMessageInputPort {

    ChatMessageOutput execute(SendChatMessageCommand command);
}
