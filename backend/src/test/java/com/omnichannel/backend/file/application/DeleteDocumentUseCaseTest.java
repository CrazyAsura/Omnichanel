package com.omnichannel.backend.file.application;

import com.omnichannel.backend.file.application.dto.DeleteDocumentCommand;
import com.omnichannel.backend.file.application.usecase.DeleteDocumentUseCase;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.exception.InvalidDocumentException;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeleteDocumentUseCaseTest {

    private DocumentRepositoryPort repository;
    private DeleteDocumentUseCase useCase;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(DocumentRepositoryPort.class);
        useCase = new DeleteDocumentUseCase(repository);
    }

    @Test
    @DisplayName("Deve marcar documento como deletado e salvar motivo da exclusão")
    void shouldMarkDocumentAsDeletedWithReason() {
        ManagedDocument doc = ManagedDocument.create("Contrato.pdf", "Marina", "2 MB", "PDF");
        when(repository.findByName("Contrato.pdf")).thenReturn(Optional.of(doc));
        when(repository.save(any(ManagedDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DeleteDocumentCommand command = new DeleteDocumentCommand("Contrato.pdf", "Arquivo obsoleto e cancelado");
        useCase.execute(command);

        assertTrue(doc.isDeleted());
        assertEquals("Arquivo obsoleto e cancelado", doc.getDeletionReason());
        assertNotNull(doc.getDeletedAt());
        verify(repository).save(doc);
    }

    @Test
    @DisplayName("Deve rejeitar justificativa com menos de 8 caracteres")
    void shouldRejectShortDeletionReason() {
        ManagedDocument doc = ManagedDocument.create("Contrato.pdf", "Marina", "2 MB", "PDF");
        when(repository.findByName("Contrato.pdf")).thenReturn(Optional.of(doc));

        DeleteDocumentCommand command = new DeleteDocumentCommand("Contrato.pdf", "curto");

        assertThrows(InvalidDocumentException.class, () -> useCase.execute(command));
    }
}
