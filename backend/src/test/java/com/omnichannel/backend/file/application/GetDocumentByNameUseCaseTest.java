package com.omnichannel.backend.file.application;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.usecase.GetDocumentByNameUseCase;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.exception.DocumentNotFoundException;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class GetDocumentByNameUseCaseTest {

    private DocumentRepositoryPort repository;
    private GetDocumentByNameUseCase useCase;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(DocumentRepositoryPort.class);
        useCase = new GetDocumentByNameUseCase(repository);
    }

    @Test
    @DisplayName("Deve retornar detalhes do documento existente")
    void shouldReturnDocumentWhenFound() {
        ManagedDocument doc = ManagedDocument.create("Manual.pdf", "Camila", "1 MB", "PDF");
        when(repository.findByName("Manual.pdf")).thenReturn(Optional.of(doc));

        DocumentOutput result = useCase.execute("Manual.pdf");

        assertNotNull(result);
        assertEquals("Manual.pdf", result.name());
        assertEquals("Camila", result.owner());
    }

    @Test
    @DisplayName("Deve lançar DocumentNotFoundException quando o documento não for encontrado")
    void shouldThrowExceptionWhenNotFound() {
        when(repository.findByName("Inexistente.pdf")).thenReturn(Optional.empty());

        assertThrows(DocumentNotFoundException.class, () -> useCase.execute("Inexistente.pdf"));
    }
}
