package com.omnichannel.backend.chat.presentation.controller;

import java.time.Duration;
import java.net.http.HttpClient;
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

@RestController
@RequestMapping({"/api/chat/speech", "/api/v1/chat/speech"})
public class SpeechController {
    private final RestClient client;

    public SpeechController(@Value("${ai.http.url}") String url,
                            @Value("${ai.grpc.token}") String token) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(180));
        client = RestClient.builder().baseUrl(url).requestFactory(factory)
            .defaultHeader("x-service-token", token).build();
    }

    public record SpeechRequest(@NotBlank @Size(max = 4000) String text) {}

    @PostMapping(produces = "audio/wav")
    public ResponseEntity<byte[]> speak(@Valid @RequestBody SpeechRequest request) {
        try {
            byte[] audio = client.post().uri("/api/speech").contentType(MediaType.APPLICATION_JSON)
                .body(request).retrieve().body(byte[].class);
            return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentType(MediaType.parseMediaType("audio/wav")).body(audio);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 429) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Voz ocupada");
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Voz indisponível");
        } catch (org.springframework.web.client.RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Voz indisponível");
        }
    }
}
