package com.omnichannel.backend.file.infrastructure.config;

import com.omnichannel.backend.file.application.port.input.*;
import com.omnichannel.backend.file.application.usecase.*;
import com.omnichannel.backend.file.domain.entity.ManagedDocument;
import com.omnichannel.backend.file.domain.port.output.DocumentRepositoryPort;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DocumentConfiguration {

    @Bean
    public ListDocumentsInputPort listDocumentsInputPort(DocumentRepositoryPort repository) {
        return new ListDocumentsUseCase(repository);
    }

    @Bean
    public GetDocumentByNameInputPort getDocumentByNameInputPort(DocumentRepositoryPort repository) {
        return new GetDocumentByNameUseCase(repository);
    }

    @Bean
    public CreateDocumentInputPort createDocumentInputPort(DocumentRepositoryPort repository) {
        return new CreateDocumentUseCase(repository);
    }

    @Bean
    public UpdateDocumentAccessInputPort updateDocumentAccessInputPort(DocumentRepositoryPort repository) {
        return new UpdateDocumentAccessUseCase(repository);
    }

    @Bean
    public DeleteDocumentInputPort deleteDocumentInputPort(DocumentRepositoryPort repository) {
        return new DeleteDocumentUseCase(repository);
    }

    @Bean
    public CommandLineRunner seedDemoDocuments(DocumentRepositoryPort repository) {
        return args -> {
            if (repository.count() == 0) {
                List<ManagedDocument> initialDocs = List.of(
                        ManagedDocument.create("Contrato de integração.pdf", "Marina Costa", "2,4 MB", "PDF"),
                        ManagedDocument.create("Especificação da API v2.pdf", "Rafael Mendes", "1,8 MB", "PDF"),
                        ManagedDocument.create("Base de conhecimento.docx", "Camila Oliveira", "840 KB", "DOC"),
                        ManagedDocument.create("Relatório de operações.csv", "Lucas Ferreira", "320 KB", "CSV")
                );
                repository.saveAll(initialDocs);
            }
        };
    }
}
