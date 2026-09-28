package com.omnichannel.backend.file.application.usecase;

import com.omnichannel.backend.file.application.dto.CreateDocumentCommand;
import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.port.input.CreateDocumentInputPort;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;

import java.util.Objects;
import java.util.Optional;

public class CreateDocumentUseCase implements CreateDocumentInputPort {
    private final DocumentRepositoryPort repository;

    public CreateDocumentUseCase(DocumentRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "O repositório de documentos não pode ser nulo.");
    }

    @Override
    public DocumentOutput execute(CreateDocumentCommand command) {
        Objects.requireNonNull(command, "O comando de criação não pode ser nulo.");
        
        Optional<ManagedDocument> existing = repository.findByName(command.name());
        ManagedDocument document;
        if (existing.isPresent()) {
            document = existing.get();
        } else {
            document = ManagedDocument.create(command.name(), command.owner(), command.size(), command.type());
        }
        
        ManagedDocument saved = repository.save(document);
        return DocumentOutput.fromDomain(saved);
    }
}
