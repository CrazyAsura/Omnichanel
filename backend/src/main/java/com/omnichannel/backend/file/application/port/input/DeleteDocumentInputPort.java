package com.omnichannel.backend.file.application.port.input;

import com.omnichannel.backend.file.application.dto.DeleteDocumentCommand;

public interface DeleteDocumentInputPort {
    void execute(DeleteDocumentCommand command);
}
