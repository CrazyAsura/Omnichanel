package com.omnichannel.backend.chat.presentation.controller;

import java.time.Duration;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.Optional;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnichannel.backend.chat.infrastructure.cache.ConcurrentLruCache;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.fasterxml.jackson.databind.JsonNode;

@RestController
@RequestMapping({"/api/chat/speech", "/api/v1/chat/speech"})
public class SpeechController {
    private final RestClient client;
    private final ObjectMapper objectMapper;

    // Estrutura de dados: LRU Cache thread-safe em memória (Hash Table + Doubly Linked List)
    // Otimização O(1): elimina latência de rede e chamadas I/O redundantes para áudios recorrentes
    private final ConcurrentLruCache<String, byte[]> audioCache;

    public SpeechController(@Value("${ai.http.url}") String url,
                            @Value("${ai.grpc.token}") String token,
                            ObjectMapper objectMapper) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(180));
        this.client = RestClient.builder().baseUrl(url).requestFactory(factory)
            .defaultHeader("x-service-token", token).build();
        this.objectMapper = objectMapper;
        this.audioCache = new ConcurrentLruCache<>(256);
    }

    public record SpeechRequest(@NotBlank @Size(max = 4000) String text) {}

    @PostMapping(produces = "audio/wav")
    public ResponseEntity<byte[]> speak(@Valid @RequestBody SpeechRequest request) {
        String cacheKey = computeCacheKey(request.text());

        // 1. Consulta em tempo O(1) na estrutura de dados do cache LRU
        Optional<byte[]> cachedAudio = audioCache.get(cacheKey);
        if (cachedAudio.isPresent()) {
            return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .header("X-Cache", "HIT")
                .contentType(MediaType.parseMediaType("audio/wav"))
                .body(cachedAudio.get());
        }

        // 2. Se Cache Miss, delega a geração para o serviço de IA
        try {
            byte[] payload = objectMapper.writeValueAsBytes(Map.of("text", request.text()));
            byte[] audio = client.post().uri("/api/speech").contentType(MediaType.APPLICATION_JSON)
                .body(payload).retrieve().body(byte[].class);

            if (audio != null && audio.length > 0) {
                // Inserção em O(1) com auto-evicção LRU do nó mais antigo quando a capacidade for atingida
                audioCache.put(cacheKey, audio);
            }

            return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .header("X-Cache", "MISS")
                .contentType(MediaType.parseMediaType("audio/wav"))
                .body(audio);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao preparar o áudio");
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 429) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Voz ocupada");
            }
            if (ex.getStatusCode().value() == 422) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Texto sem conteudo para leitura");
            }
            String detail = "Voz indisponível";
            try {
                JsonNode error = objectMapper.readTree(ex.getResponseBodyAsByteArray());
                if (error.hasNonNull("detail")) detail = error.get("detail").asText();
            } catch (Exception ignored) { }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, detail);
        } catch (org.springframework.web.client.RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Voz indisponível");
        }
    }

    /**
     * Gera chave hash SHA-256 de tamanho fixo em O(1), evitando alocar e comparar
     * strings extensas na tabela hash e mantendo a pegada de memória constante.
     */
    private static String computeCacheKey(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(text.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                hexString.append(Character.forDigit((b >> 4) & 0xF, 16));
                hexString.append(Character.forDigit(b & 0xF, 16));
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(text.trim().hashCode());
        }
    }
}
