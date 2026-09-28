package com.omnichannel.backend.file.application.port.input;

import com.omnichannel.backend.file.application.dto.CreateDocumentCommand;
import com.omnichannel.backend.file.application.dto.DocumentOutput;

public interface CreateDocumentInputPort {
    DocumentOutput execute(CreateDocumentCommand command);
}
