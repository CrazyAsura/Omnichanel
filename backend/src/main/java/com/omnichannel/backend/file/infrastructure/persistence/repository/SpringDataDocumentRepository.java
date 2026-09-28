package com.omnichannel.backend.file.infrastructure.persistence.repository;

import com.omnichannel.backend.file.infrastructure.persistence.entity.DocumentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpringDataDocumentRepository extends JpaRepository<DocumentJpaEntity, UUID> {
    List<DocumentJpaEntity> findByDeletedFalseOrderByUpdatedAtDesc();
    Optional<DocumentJpaEntity> findByNameIgnoreCaseAndDeletedFalse(String name);
    Optional<DocumentJpaEntity> findByNameIgnoreCase(String name);
}
