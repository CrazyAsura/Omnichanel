package com.omnichannel.backend.search;

import java.time.Instant;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!local")
public class SearchSampleData implements CommandLineRunner {
    private final SearchDocumentRepository repository;

    public SearchSampleData(SearchDocumentRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        repository.deleteAllById(List.of(
                "user-marina", "user-rafael", "file-contract", "file-api-spec",
                "api-production", "mcp-files", "activity-permissions", "error-gateway"));
        if (repository.count() != 0) return;

        var now = Instant.now();
        repository.saveAll(List.of(
                new SearchDocument("user-001", "Demo account 001", "test account; administrator role; active status", "user", now),
                new SearchDocument("user-002", "Demo account 002", "test account; editor role; active status", "user", now),
                new SearchDocument("file-contract", "Integration contract.pdf", "demonstration PDF file", "file", now),
                new SearchDocument("file-api-spec", "API specification v2.pdf", "REST API integration documentation", "file", now),
                new SearchDocument("api-production", "Demonstration API", "api.invalid/v1 REST simulated integration", "integration", now),
                new SearchDocument("mcp-files", "File server", "files.internal/mcp MCP server simulated", "integration", now),
                new SearchDocument("activity-permissions", "Permissions updated", "demonstration administrator updated test team roles", "activity", now),
                new SearchDocument("error-gateway", "Request processing failure", "ERR-2048 api-gateway simulated HTTP 502", "error", now)
        ));
    }
}
