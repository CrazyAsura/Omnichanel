package com.omnichannel.backend.search;

import java.util.List;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/search", "/api/v1/search"})
public class SearchController {

    private final ElasticsearchOperations operations;

    public SearchController(ElasticsearchOperations operations) {
        this.operations = operations;
    }

    @GetMapping
    public List<SearchDocument> search(@RequestParam("q") String query) {
        var normalized = query == null ? "" : query.trim();
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O parâmetro q é obrigatório.");
        }

        var nativeQuery = NativeQuery.builder()
                .withQuery(builder -> builder.multiMatch(match -> match
                        .query(normalized)
                        .fields("title^2", "content", "category")))
                .build();

        return operations.search(nativeQuery, SearchDocument.class).stream()
                .map(SearchHit::getContent)
                .toList();
    }
}
