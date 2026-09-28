package com.omnichannel.backend.file.application.port.input;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.dto.UpdateDocumentAccessCommand;

public interface UpdateDocumentAccessInputPort {
    DocumentOutput execute(UpdateDocumentAccessCommand command);
}
