package com.omnichannel.backend.search;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface SearchDocumentRepository extends ElasticsearchRepository<SearchDocument, String> {}
