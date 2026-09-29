package com.omnichannel.backend.file.infrastructure.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.StandardCopyOption;

@Component
public class DocumentContentStorage {
    private final Path root;

    public DocumentContentStorage(@Value("${app.documents.storage-dir:./data/documents}") String storageDir) {
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
    }

    public void store(String name, MultipartFile file) throws IOException {
        Path destination = resolve(name);
        Files.createDirectories(root);
        try (InputStream input = file.getInputStream()) {
            Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public long storeNew(String name, InputStream input, long maxBytes, long totalBytesBefore, long maxTotalBytes) throws IOException {
        Path destination = resolve(name);
        Files.createDirectories(root);
        long written = 0;
        byte[] buffer = new byte[32 * 1024];
        OutputStream destinationStream = Files.newOutputStream(destination, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        try (OutputStream output = destinationStream) {
            int count;
            while ((count = input.read(buffer)) != -1) {
                written += count;
                if (written > maxBytes || totalBytesBefore + written > maxTotalBytes) {
                    throw new IOException("O conteúdo extraído excede o limite permitido.");
                }
                output.write(buffer, 0, count);
            }
            return written;
        } catch (IOException exception) {
            Files.deleteIfExists(destination);
            throw exception;
        }
    }

    public boolean exists(String name) throws IOException {
        return Files.isRegularFile(resolve(name));
    }

    public InputStream open(String name) throws IOException {
        return Files.newInputStream(resolve(name));
    }

    public long size(String name) throws IOException {
        return Files.size(resolve(name));
    }

    public void copyTo(String name, OutputStream output) throws IOException {
        try (InputStream input = Files.newInputStream(resolve(name))) {
            input.transferTo(output);
        }
    }

    public Resource load(String name) throws IOException {
        Path path = resolve(name);
        if (!Files.isRegularFile(path)) return null;
        Resource resource = new UrlResource(path.toUri());
        return resource.exists() && resource.isReadable() ? resource : null;
    }

    public void delete(String name) throws IOException {
        Files.deleteIfExists(resolve(name));
    }

    private Path resolve(String name) {
        String safeName = Path.of(name).getFileName().toString();
        if (safeName.isBlank() || safeName.equals(".") || safeName.equals("..")) {
            throw new IllegalArgumentException("Nome de arquivo inválido.");
        }
        Path resolved = root.resolve(safeName).normalize();
        if (!resolved.getParent().equals(root)) throw new IllegalArgumentException("Nome de arquivo inválido.");
        return resolved;
    }
}
