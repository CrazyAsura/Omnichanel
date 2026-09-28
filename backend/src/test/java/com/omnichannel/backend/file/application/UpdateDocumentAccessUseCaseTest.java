package com.omnichannel.backend.file.application;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.dto.UpdateDocumentAccessCommand;
import com.omnichannel.backend.file.application.usecase.UpdateDocumentAccessUseCase;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import com.omnichannel.backend.file.domain.valueobject.DocumentAccessLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UpdateDocumentAccessUseCaseTest {

    private DocumentRepositoryPort repository;
    private UpdateDocumentAccessUseCase useCase;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(DocumentRepositoryPort.class);
        useCase = new UpdateDocumentAccessUseCase(repository);
    }

    @Test
    @DisplayName("Deve atualizar nível de acesso com sucesso")
    void shouldUpdateAccessLevelSuccessfully() {
        ManagedDocument doc = ManagedDocument.create("Contrato.pdf", "Marina", "2 MB", "PDF");
        when(repository.findByName("Contrato.pdf")).thenReturn(Optional.of(doc));
        when(repository.save(any(ManagedDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateDocumentAccessCommand command = new UpdateDocumentAccessCommand("Contrato.pdf", "super-admin");
        DocumentOutput result = useCase.execute(command);

        assertNotNull(result);
        assertEquals("super-admin", result.accessLevel());
        assertEquals(DocumentAccessLevel.SUPER_ADMIN, doc.getAccessLevel());
        verify(repository).save(doc);
    }
}
