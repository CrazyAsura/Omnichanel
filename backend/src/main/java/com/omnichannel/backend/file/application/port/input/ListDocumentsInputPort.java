package com.omnichannel.backend.file.application.port.input;

import com.omnichannel.backend.file.application.dto.DocumentOutput;

import java.util.List;

public interface ListDocumentsInputPort {
    List<DocumentOutput> execute();
}
