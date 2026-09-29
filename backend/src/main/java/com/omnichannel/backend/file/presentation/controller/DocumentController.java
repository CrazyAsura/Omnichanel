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
import com.omnichannel.backend.file.infrastructure.storage.DocumentContentStorage;
import com.omnichannel.backend.file.infrastructure.storage.DocumentArchiveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.io.IOException;
import java.io.InputStream;
import java.io.PushbackInputStream;

@RestController
@RequestMapping({"/api/v1/documents", "/api/documents"})
@Tag(name = "Documentos", description = "Gerenciamento e controle de acesso a documentos corporativos no SQL Server")
public class DocumentController {
    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
    private static final List<String> ALLOWED_EXTENSIONS = List.of("PDF", "DOCX", "CSV", "TXT", "MD", "XLSX");
    private static final long MAX_ARCHIVE_SIZE_BYTES = 200L * 1024 * 1024;

    private final ListDocumentsInputPort listDocumentsInputPort;
    private final GetDocumentByNameInputPort getDocumentByNameInputPort;
    private final CreateDocumentInputPort createDocumentInputPort;
    private final UpdateDocumentAccessInputPort updateDocumentAccessInputPort;
    private final DeleteDocumentInputPort deleteDocumentInputPort;
    private final DocumentContentStorage contentStorage;
    private final DocumentArchiveService archiveService;

    public DocumentController(
            ListDocumentsInputPort listDocumentsInputPort,
            GetDocumentByNameInputPort getDocumentByNameInputPort,
            CreateDocumentInputPort createDocumentInputPort,
            UpdateDocumentAccessInputPort updateDocumentAccessInputPort,
            DeleteDocumentInputPort deleteDocumentInputPort,
            DocumentContentStorage contentStorage,
            DocumentArchiveService archiveService) {
        this.listDocumentsInputPort = Objects.requireNonNull(listDocumentsInputPort);
        this.getDocumentByNameInputPort = Objects.requireNonNull(getDocumentByNameInputPort);
        this.createDocumentInputPort = Objects.requireNonNull(createDocumentInputPort);
        this.updateDocumentAccessInputPort = Objects.requireNonNull(updateDocumentAccessInputPort);
        this.deleteDocumentInputPort = Objects.requireNonNull(deleteDocumentInputPort);
        this.contentStorage = Objects.requireNonNull(contentStorage);
        this.archiveService = Objects.requireNonNull(archiveService);
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
    public ResponseEntity<DocumentResponse> createDocument(
            @Valid @RequestBody CreateDocumentRequest request,
            org.springframework.security.core.Authentication authentication) {
        String resolvedOwner = resolveOwner(request.owner(), authentication);
        CreateDocumentCommand command = new CreateDocumentCommand(
                request.name(),
                resolvedOwner,
                request.size(),
                request.type()
        );
        DocumentOutput output = createDocumentInputPort.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentResponse.fromOutput(output));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Enviar documento", description = "Armazena o conteúdo do arquivo e registra seus metadados")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String owner,
            org.springframework.security.core.Authentication authentication) throws IOException {
        if (file.isEmpty() || file.getOriginalFilename() == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione um arquivo válido.");
        }
        String name = java.nio.file.Path.of(file.getOriginalFilename()).getFileName().toString();
        String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toUpperCase(Locale.ROOT) : "FILE";
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato de arquivo não permitido.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "O arquivo excede o limite de 50 MB.");
        }
        validateFileSignature(extension, file);
        String type = extension;
        String size = file.getSize() < 1024 * 1024
                ? Math.max(1, Math.round(file.getSize() / 1024.0)) + " KB"
                : String.format(Locale.ROOT, "%.1f MB", file.getSize() / (1024.0 * 1024.0));
        contentStorage.store(name, file);
        try {
            String resolvedOwner = resolveOwner(owner, authentication);
            DocumentOutput output = createDocumentInputPort.execute(new CreateDocumentCommand(name, resolvedOwner, size, type));
            return ResponseEntity.status(HttpStatus.CREATED).body(DocumentResponse.fromOutput(output));
        } catch (RuntimeException exception) {
            contentStorage.delete(name);
            throw exception;
        }
    }

    private String resolveOwner(String owner, org.springframework.security.core.Authentication authentication) {
        if (owner != null && !owner.isBlank() && !"Marina Costa".equalsIgnoreCase(owner)) {
            return owner;
        }
        if (authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            return authentication.getName();
        }
        return (owner != null && !owner.isBlank()) ? owner : "Meu Usuário";
    }

    @PostMapping(value = "/zip", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Compactar documentos", description = "Transmite um ZIP lossless dos documentos selecionados sem armazená-los em memória")
    public ResponseEntity<StreamingResponseBody> zipDocuments(@RequestBody ZipRequest request) throws IOException {
        List<String> names = archiveService.validateZipSources(request == null ? null : request.names());
        StreamingResponseBody body = output -> archiveService.writeZip(names, output);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, org.springframework.http.ContentDisposition.attachment()
                        .filename("documentos.zip", StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body);
    }

    @PostMapping(value = "/unzip", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Extrair ZIP", description = "Extrai arquivos compatíveis para o armazenamento persistente usando fluxo e limites contra ZIP bombs")
    public ResponseEntity<List<DocumentResponse>> unzipDocuments(
            @RequestPart("file") MultipartFile archive,
            @RequestParam(defaultValue = "Marina Costa") String owner) throws IOException {
        if (archive.isEmpty() || archive.getOriginalFilename() == null
                || !archive.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".zip")) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie um arquivo ZIP válido.");
        }
        if (archive.getSize() > MAX_ARCHIVE_SIZE_BYTES) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "O ZIP excede o limite de 200 MB.");
        }
        Set<String> existingNames = listDocumentsInputPort.execute().stream()
                .map(DocumentOutput::name).collect(Collectors.toSet());
        List<DocumentArchiveService.ExtractedFile> extracted;
        try (PushbackInputStream input = new PushbackInputStream(archive.getInputStream(), 4)) {
            byte[] signature = input.readNBytes(4);
            boolean zipSignature = startsWith(signature, new byte[] {'P', 'K', 3, 4})
                    || startsWith(signature, new byte[] {'P', 'K', 5, 6})
                    || startsWith(signature, new byte[] {'P', 'K', 7, 8});
            if (!zipSignature) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "O conteúdo enviado não é um ZIP válido.");
            input.unread(signature);
            try {
                extracted = archiveService.extract(input, existingNames);
            } catch (java.util.zip.ZipException exception) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo ZIP está inválido ou corrompido.");
            }
        }

        List<DocumentResponse> response = new java.util.ArrayList<>();
        try {
            for (DocumentArchiveService.ExtractedFile file : extracted) {
                String size = file.size() < 1024 * 1024
                        ? Math.max(1, Math.round(file.size() / 1024.0)) + " KB"
                        : String.format(Locale.ROOT, "%.1f MB", file.size() / (1024.0 * 1024.0));
                DocumentOutput output = createDocumentInputPort.execute(
                        new CreateDocumentCommand(file.name(), owner, size, file.type()));
                response.add(DocumentResponse.fromOutput(output));
            }
        } catch (RuntimeException exception) {
            for (DocumentArchiveService.ExtractedFile file : extracted) {
                try { contentStorage.delete(file.name()); } catch (IOException ignored) { }
            }
            throw exception;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(List.copyOf(response));
    }

    public record ZipRequest(List<String> names) { }

    private static void validateFileSignature(String extension, MultipartFile file) throws IOException {
        byte[] header;
        try (var input = file.getInputStream()) {
            header = input.readNBytes(8);
        }
        boolean valid = switch (extension) {
            case "PDF" -> startsWith(header, new byte[] {'%', 'P', 'D', 'F', '-'});
            case "DOCX", "XLSX" -> startsWith(header, new byte[] {'P', 'K', 3, 4});
            case "CSV", "TXT", "MD" -> !startsWith(header, new byte[] {'M', 'Z'})
                    && !startsWith(header, new byte[] {0x7f, 'E', 'L', 'F'})
                    && !startsWith(header, new byte[] {'P', 'K', 3, 4});
            default -> false;
        };
        if (!valid) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "O conteúdo não corresponde a um documento corporativo permitido.");
    }

    private static boolean startsWith(byte[] value, byte[] prefix) {
        if (value.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) if (value[i] != prefix[i]) return false;
        return true;
    }

    @GetMapping("/{name}/content")
    @Operation(summary = "Ler conteúdo do documento", description = "Retorna o arquivo original para pré-visualização")
    public ResponseEntity<Resource> getDocumentContent(@PathVariable("name") String name) throws IOException {
        String decodedName = decode(name);
        Resource resource = contentStorage.load(decodedName);
        if (resource == null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Conteúdo do documento não encontrado.");
        MediaType contentType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            String guessed = java.nio.file.Files.probeContentType(resource.getFile().toPath());
            if (guessed != null) contentType = MediaType.parseMediaType(guessed);
        } catch (IOException ignored) { }
        return ResponseEntity.ok()
                .contentType(contentType)
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, org.springframework.http.ContentDisposition.inline().filename(decodedName, StandardCharsets.UTF_8).build().toString())
                .body(resource);
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
        try { contentStorage.delete(decodedName); } catch (IOException exception) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível remover o arquivo armazenado.");
        }
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
