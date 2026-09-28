package com.omnichannel.backend.file.infrastructure.persistence.adapter;

import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import com.omnichannel.backend.file.domain.valueobject.DocumentAccessLevel;
import com.omnichannel.backend.file.domain.valueobject.DocumentId;
import com.omnichannel.backend.file.infrastructure.persistence.entity.DocumentJpaEntity;
import com.omnichannel.backend.file.infrastructure.persistence.repository.SpringDataDocumentRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class DocumentRepositoryAdapter implements DocumentRepositoryPort {

    private final SpringDataDocumentRepository jpaRepository;

    public DocumentRepositoryAdapter(SpringDataDocumentRepository jpaRepository) {
        this.jpaRepository = Objects.requireNonNull(jpaRepository, "JPA repository não pode ser nulo.");
    }

    @Override
    public List<ManagedDocument> findAllActive() {
        return jpaRepository.findByDeletedFalseOrderByUpdatedAtDesc().stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<ManagedDocument> findByName(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        return jpaRepository.findByNameIgnoreCaseAndDeletedFalse(name.trim())
                .map(this::toDomain);
    }

    @Override
    public Optional<ManagedDocument> findById(DocumentId id) {
        if (id == null) return Optional.empty();
        return jpaRepository.findById(id.value())
                .map(this::toDomain);
    }

    @Override
    public ManagedDocument save(ManagedDocument document) {
        DocumentJpaEntity entity = toJpaEntity(document);
        DocumentJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public List<ManagedDocument> saveAll(List<ManagedDocument> documents) {
        List<DocumentJpaEntity> entities = documents.stream().map(this::toJpaEntity).toList();
        return jpaRepository.saveAll(entities).stream().map(this::toDomain).toList();
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    private ManagedDocument toDomain(DocumentJpaEntity entity) {
        return new ManagedDocument(
                new DocumentId(entity.getId()),
                entity.getName(),
                entity.getOwner(),
                entity.getSize(),
                entity.getType(),
                DocumentAccessLevel.fromCode(entity.getAccessLevel()),
                entity.isDeleted(),
                entity.getDeletionReason(),
                entity.getDeletedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private DocumentJpaEntity toJpaEntity(ManagedDocument doc) {
        return new DocumentJpaEntity(
                doc.getId().value(),
                doc.getName(),
                doc.getOwner(),
                doc.getSize(),
                doc.getType(),
                doc.getAccessLevel().getCode(),
                doc.isDeleted(),
                doc.getDeletionReason(),
                doc.getDeletedAt(),
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
