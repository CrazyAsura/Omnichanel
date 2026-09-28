package com.omnichannel.backend.file.application.usecase;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.dto.UpdateDocumentAccessCommand;
import com.omnichannel.backend.file.application.port.input.UpdateDocumentAccessInputPort;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.exception.DocumentNotFoundException;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import com.omnichannel.backend.file.domain.valueobject.DocumentAccessLevel;

import java.util.Objects;

public class UpdateDocumentAccessUseCase implements UpdateDocumentAccessInputPort {
    private final DocumentRepositoryPort repository;

    public UpdateDocumentAccessUseCase(DocumentRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "O repositório de documentos não pode ser nulo.");
    }

    @Override
    public DocumentOutput execute(UpdateDocumentAccessCommand command) {
        Objects.requireNonNull(command, "O comando de atualização de acesso não pode ser nulo.");
        
        ManagedDocument document = repository.findByName(command.name())
                .orElseThrow(() -> DocumentNotFoundException.withName(command.name()));

        DocumentAccessLevel newLevel = DocumentAccessLevel.fromCode(command.accessLevel());
        document.updateAccessLevel(newLevel);

        ManagedDocument saved = repository.save(document);
        return DocumentOutput.fromDomain(saved);
    }
}
