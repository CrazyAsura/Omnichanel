package com.omnichannel.backend.file.domain.port.output;

import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.valueobject.DocumentId;

import java.util.List;
import java.util.Optional;

public interface DocumentRepositoryPort {
    List<ManagedDocument> findAllActive();
    Optional<ManagedDocument> findByName(String name);
    Optional<ManagedDocument> findById(DocumentId id);
    ManagedDocument save(ManagedDocument document);
    List<ManagedDocument> saveAll(List<ManagedDocument> documents);
    long count();
}
