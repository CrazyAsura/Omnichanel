package com.omnichannel.backend.file.application;

import com.omnichannel.backend.file.application.dto.CreateDocumentCommand;
import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.usecase.CreateDocumentUseCase;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CreateDocumentUseCaseTest {

    private DocumentRepositoryPort repository;
    private CreateDocumentUseCase useCase;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(DocumentRepositoryPort.class);
        useCase = new CreateDocumentUseCase(repository);
    }

    @Test
    @DisplayName("Deve criar e salvar novo documento no repositório")
    void shouldCreateAndSaveNewDocument() {
        CreateDocumentCommand command = new CreateDocumentCommand("NovoArquivo.pdf", "Marina", "3 MB", "PDF");

        when(repository.findByName("NovoArquivo.pdf")).thenReturn(Optional.empty());
        when(repository.save(any(ManagedDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DocumentOutput result = useCase.execute(command);

        assertNotNull(result);
        assertEquals("NovoArquivo.pdf", result.name());
        assertEquals("Marina", result.owner());

        ArgumentCaptor<ManagedDocument> captor = ArgumentCaptor.forClass(ManagedDocument.class);
        verify(repository).save(captor.capture());
        assertEquals("NovoArquivo.pdf", captor.getValue().getName());
    }
}
