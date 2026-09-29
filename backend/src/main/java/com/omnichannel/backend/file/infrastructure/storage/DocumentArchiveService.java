package com.omnichannel.backend.file.infrastructure.storage;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Service
public class DocumentArchiveService {
    public static final int MAX_FILES = 100;
    public static final long MAX_ENTRY_BYTES = 100L * 1024 * 1024;
    public static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024;
    private static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "docx", "xlsx", "csv", "txt", "md");
    private final DocumentContentStorage storage;

    public DocumentArchiveService(DocumentContentStorage storage) {
        this.storage = storage;
    }

    public List<String> validateZipSources(List<String> names) throws IOException {
        if (names == null || names.isEmpty() || names.size() > MAX_FILES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione de 1 a 100 arquivos para compactar.");
        }
        Set<String> unique = new HashSet<>();
        List<String> safeNames = new ArrayList<>(names.size());
        long total = 0;
        for (String name : names) {
            String safeName = safeName(name);
            if (!unique.add(safeName.toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A lista contém nomes de arquivo repetidos.");
            }
            if (!storage.exists(safeName)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Não foi encontrado conteúdo armazenado para " + safeName + ".");
            }
            total += storage.size(safeName);
            if (total > MAX_TOTAL_BYTES) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "O ZIP não pode ultrapassar 500 MB descompactado.");
            }
            safeNames.add(safeName);
        }
        return List.copyOf(safeNames);
    }

    public void writeZip(List<String> names, OutputStream response) throws IOException {
        ZipOutputStream zip = new ZipOutputStream(response);
        zip.setLevel(Deflater.DEFAULT_COMPRESSION);
        byte[] buffer = new byte[32 * 1024];
        for (String name : names) {
            zip.putNextEntry(new ZipEntry(name));
            try (InputStream input = storage.open(name)) {
                int count;
                while ((count = input.read(buffer)) != -1) zip.write(buffer, 0, count);
            }
            zip.closeEntry();
        }
        zip.finish();
        zip.flush();
    }

    public List<ExtractedFile> extract(InputStream source, Set<String> existingNames) throws IOException {
        Set<String> names = new HashSet<>();
        existingNames.forEach(name -> names.add(name.toLowerCase(Locale.ROOT)));
        List<ExtractedFile> extracted = new ArrayList<>();
        long totalBytes = 0;
        try (ZipInputStream zip = new ZipInputStream(source)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                if (extracted.size() >= MAX_FILES) {
                    throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "O ZIP pode conter no máximo 100 arquivos.");
                }
                String name = entryName(entry.getName());
                String extension = extension(name);
                if (!ALLOWED_EXTENSIONS.contains(extension)) {
                    throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "O ZIP contém um formato não permitido: " + name + ".");
                }
                if (!names.add(name.toLowerCase(Locale.ROOT))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um arquivo com o nome " + name + ".");
                }
                if (entry.getSize() > MAX_ENTRY_BYTES || (entry.getSize() >= 0 && totalBytes + entry.getSize() > MAX_TOTAL_BYTES)) {
                    throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "O conteúdo descompactado excede os limites permitidos.");
                }
                long size = storage.storeNew(name, zip, MAX_ENTRY_BYTES, totalBytes, MAX_TOTAL_BYTES);
                totalBytes += size;
                extracted.add(new ExtractedFile(name, size, extension.toUpperCase(Locale.ROOT)));
                zip.closeEntry();
            }
        } catch (IOException | RuntimeException exception) {
            for (ExtractedFile file : extracted) {
                try { storage.delete(file.name()); } catch (IOException ignored) { }
            }
            throw exception;
        }
        if (extracted.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ZIP está vazio ou não contém arquivos compatíveis.");
        }
        return List.copyOf(extracted);
    }

    public static String safeName(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de arquivo inválido.");
        }
        String name = rawName.replace('\\', '/');
        if (name.startsWith("/")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de arquivo inválido.");
        String basename = name.substring(name.lastIndexOf('/') + 1);
        if (basename.isBlank() || basename.equals(".") || basename.equals("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de arquivo inválido.");
        }
        return basename;
    }

    private static String entryName(String rawName) {
        if (rawName == null || rawName.isBlank() || rawName.indexOf('\0') >= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ZIP contém um caminho inválido.");
        }
        String portableName = rawName.replace('\\', '/');
        Path path = Path.of(portableName).normalize();
        if (path.isAbsolute() || path.startsWith("..") || portableName.startsWith("/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ZIP contém um caminho fora da pasta de destino.");
        }
        String name = path.getFileName() == null ? "" : path.getFileName().toString();
        if (name.isBlank() || name.equals(".") || name.equals("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ZIP contém um caminho inválido.");
        }
        return name;
    }

    private static String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public record ExtractedFile(String name, long size, String type) { }
}
