package com.omnichannel.backend.file.application.usecase;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.port.input.GetDocumentByNameInputPort;
import com.omnichannel.backend.file.domain.exception.DocumentNotFoundException;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;

import java.util.Objects;

public class GetDocumentByNameUseCase implements GetDocumentByNameInputPort {
    private final DocumentRepositoryPort repository;

    public GetDocumentByNameUseCase(DocumentRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "O repositório de documentos não pode ser nulo.");
    }

    @Override
    public DocumentOutput execute(String name) {
        if (name == null || name.isBlank()) {
            throw DocumentNotFoundException.withName(name);
        }
        return repository.findByName(name)
                .map(DocumentOutput::fromDomain)
                .orElseThrow(() -> DocumentNotFoundException.withName(name));
    }
}
