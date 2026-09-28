package com.omnichannel.backend.file.presentation.controller;

import com.omnichannel.backend.file.application.dto.CreateDocumentCommand;
import com.omnichannel.backend.file.application.dto.DeleteDocumentCommand;
import com.omnichannel.backend.file.application.dto.DocumentOutput;
import com.omnichannel.backend.file.application.dto.UpdateDocumentAccessCommand;
import com.omnichannel.backend.file.application.port.input.*;
import com.omnichannel.backend.file.presentation.request.CreateDocumentRequest;
import com.omnichannel.backend.file.presentation.request.DeleteDocumentRequest;
import com.omnichannel.backend.file.presentation.request.UpdateAccessRequest;
import com.omnichannel.backend.file.presentation.response.DocumentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping({"/api/v1/documents", "/api/documents"})
@Tag(name = "Documentos", description = "Gerenciamento e controle de acesso a documentos corporativos no SQL Server")
public class DocumentController {

    private final ListDocumentsInputPort listDocumentsInputPort;
    private final GetDocumentByNameInputPort getDocumentByNameInputPort;
    private final CreateDocumentInputPort createDocumentInputPort;
    private final UpdateDocumentAccessInputPort updateDocumentAccessInputPort;
    private final DeleteDocumentInputPort deleteDocumentInputPort;

    public DocumentController(
            ListDocumentsInputPort listDocumentsInputPort,
            GetDocumentByNameInputPort getDocumentByNameInputPort,
            CreateDocumentInputPort createDocumentInputPort,
            UpdateDocumentAccessInputPort updateDocumentAccessInputPort,
            DeleteDocumentInputPort deleteDocumentInputPort) {
        this.listDocumentsInputPort = Objects.requireNonNull(listDocumentsInputPort);
        this.getDocumentByNameInputPort = Objects.requireNonNull(getDocumentByNameInputPort);
        this.createDocumentInputPort = Objects.requireNonNull(createDocumentInputPort);
        this.updateDocumentAccessInputPort = Objects.requireNonNull(updateDocumentAccessInputPort);
        this.deleteDocumentInputPort = Objects.requireNonNull(deleteDocumentInputPort);
    }

    @GetMapping
    @Operation(summary = "Listar documentos", description = "Retorna todos os documentos corporativos ativos armazenados no SQL Server")
    @ApiResponse(responseCode = "200", description = "Documentos listados com sucesso")
    public ResponseEntity<List<DocumentResponse>> listDocuments() {
        List<DocumentOutput> outputs = listDocumentsInputPort.execute();
        List<DocumentResponse> response = outputs.stream().map(DocumentResponse::fromOutput).toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{name}")
    @Operation(summary = "Obter documento por nome", description = "Retorna os detalhes e permissão de um documento específico")
    @ApiResponse(responseCode = "200", description = "Documento encontrado")
    @ApiResponse(responseCode = "404", description = "Documento não encontrado")
    public ResponseEntity<DocumentResponse> getDocumentByName(@PathVariable("name") String name) {
        String decodedName = decode(name);
        DocumentOutput output = getDocumentByNameInputPort.execute(decodedName);
        return ResponseEntity.ok(DocumentResponse.fromOutput(output));
    }

    @PostMapping
    @Operation(summary = "Criar/Registrar documento", description = "Salva os metadados de um novo documento no SQL Server")
    @ApiResponse(responseCode = "201", description = "Documento registrado com sucesso")
    public ResponseEntity<DocumentResponse> createDocument(@Valid @RequestBody CreateDocumentRequest request) {
        CreateDocumentCommand command = new CreateDocumentCommand(
                request.name(),
                request.owner(),
                request.size(),
                request.type()
        );
        DocumentOutput output = createDocumentInputPort.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentResponse.fromOutput(output));
    }

    @PatchMapping("/{name}/access")
    @Operation(summary = "Atualizar nível de acesso", description = "Altera as permissões de acesso do documento corporativo")
    @ApiResponse(responseCode = "200", description = "Permissões salvas no SQL Server")
    @ApiResponse(responseCode = "404", description = "Documento não encontrado")
    public ResponseEntity<DocumentResponse> updateAccess(
            @PathVariable("name") String name,
            @Valid @RequestBody UpdateAccessRequest request) {
        String decodedName = decode(name);
        UpdateDocumentAccessCommand command = new UpdateDocumentAccessCommand(decodedName, request.accessLevel());
        DocumentOutput output = updateDocumentAccessInputPort.execute(command);
        return ResponseEntity.ok(DocumentResponse.fromOutput(output));
    }

    @DeleteMapping("/{name}")
    @Operation(summary = "Excluir documento", description = "Marca o documento como excluído no SQL Server registrando a justificativa")
    @ApiResponse(responseCode = "204", description = "Documento excluído com sucesso")
    @ApiResponse(responseCode = "404", description = "Documento não encontrado")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable("name") String name,
            @Valid @RequestBody DeleteDocumentRequest request) {
        String decodedName = decode(name);
        DeleteDocumentCommand command = new DeleteDocumentCommand(decodedName, request.reason());
        deleteDocumentInputPort.execute(command);
        return ResponseEntity.noContent().build();
    }

    private static String decode(String raw) {
        if (raw == null) return "";
        try {
            return URLDecoder.decode(raw, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return raw;
        }
    }
}
