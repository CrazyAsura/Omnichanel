package com.omnichannel.backend.file.application.usecase;

import com.omnichannel.backend.file.application.dto.DeleteDocumentCommand;
import com.omnichannel.backend.file.application.port.input.DeleteDocumentInputPort;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.exception.DocumentNotFoundException;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;

import java.util.Objects;

public class DeleteDocumentUseCase implements DeleteDocumentInputPort {
    private final DocumentRepositoryPort repository;

    public DeleteDocumentUseCase(DocumentRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "O repositório de documentos não pode ser nulo.");
    }

    @Override
    public void execute(DeleteDocumentCommand command) {
        Objects.requireNonNull(command, "O comando de exclusão não pode ser nulo.");
        
        ManagedDocument document = repository.findByName(command.name())
                .orElseThrow(() -> DocumentNotFoundException.withName(command.name()));

        document.markAsDeleted(command.reason());
        repository.save(document);
    }
}
