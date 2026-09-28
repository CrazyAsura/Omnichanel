package com.omnichannel.backend.file.application.port.input;

import com.omnichannel.backend.file.application.dto.DocumentOutput;

public interface GetDocumentByNameInputPort {
    DocumentOutput execute(String name);
}
