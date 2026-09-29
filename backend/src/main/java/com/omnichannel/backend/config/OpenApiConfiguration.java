package com.omnichannel.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI omnichannelOpenAPI(@Value("${server.port:8080}") int serverPort) {
        return new OpenAPI()
                .info(new Info()
                        .title("Omnichannel Platform API")
                        .description("Backend corporativo Omnichannel integrado via gRPC ao AgentScope AI (FastAPI, Gemma 4, ChromaDB, RAG Multimodal, Kafka e Redis).")
                        .version("1.0.0")
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .servers(List.of(
                        new Server().url("http://localhost:" + serverPort).description("Ambiente Local"),
                        new Server().url("http://localhost:8080").description("Servidor Principal")
                ));
    }
}
