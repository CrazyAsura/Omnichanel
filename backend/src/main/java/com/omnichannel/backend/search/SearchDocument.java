package com.omnichannel.backend.search;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Document(indexName = "admin-search")
public class SearchDocument {
    @Id
    private String id;

    @Field(type = FieldType.Text)
    private String title;

    @Field(type = FieldType.Text)
    private String content;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Date)
    private Instant updatedAt;

    protected SearchDocument() {}

    public SearchDocument(String id, String title, String content, String category, Instant updatedAt) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.category = category;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getCategory() { return category; }
    public Instant getUpdatedAt() { return updatedAt; }
}
