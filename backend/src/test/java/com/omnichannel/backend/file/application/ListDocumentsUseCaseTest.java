package com.omnichannel.backend.file.application;

import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.usecase.ListDocumentsUseCase;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

class ListDocumentsUseCaseTest {

    private DocumentRepositoryPort repository;
    private ListDocumentsUseCase useCase;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(DocumentRepositoryPort.class);
        useCase = new ListDocumentsUseCase(repository);
    }

    @Test
    @DisplayName("Deve retornar todos os documentos ativos mapeados para DocumentOutput")
    void shouldReturnAllActiveDocuments() {
        ManagedDocument doc1 = ManagedDocument.create("Contrato.pdf", "Marina", "2 MB", "PDF");
        ManagedDocument doc2 = ManagedDocument.create("Planilha.csv", "Lucas", "500 KB", "CSV");

        when(repository.findAllActive()).thenReturn(List.of(doc1, doc2));

        List<DocumentOutput> result = useCase.execute();

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("Contrato.pdf", result.get(0).name());
        assertEquals("Planilha.csv", result.get(1).name());
    }
}
