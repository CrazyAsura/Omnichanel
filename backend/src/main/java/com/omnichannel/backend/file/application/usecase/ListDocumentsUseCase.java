package com.omnichannel.backend.file.application.usecase;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.port.input.ListDocumentsInputPort;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;

import java.util.List;
import java.util.Objects;

public class ListDocumentsUseCase implements ListDocumentsInputPort {
    private final DocumentRepositoryPort repository;

    public ListDocumentsUseCase(DocumentRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "O repositório de documentos não pode ser nulo.");
    }

    @Override
    public List<DocumentOutput> execute() {
        return repository.findAllActive().stream()
                .map(DocumentOutput::fromDomain)
                .toList();
    }
}
