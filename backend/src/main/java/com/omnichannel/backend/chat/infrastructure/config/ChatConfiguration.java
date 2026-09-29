package com.omnichannel.backend.chat.infrastructure.config;

import com.omnichannel.backend.chat.application.port.input.SendChatMessageInputPort;
import com.omnichannel.backend.chat.application.port.output.AiAgentRpcPort;
import com.omnichannel.backend.chat.application.usecase.SendChatMessageUseCase;
import com.omnichannel.backend.chat.infrastructure.grpc.adapter.GrpcAiAgentAdapter;
import com.omnichannel.backend.grpc.AgentServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.ClientInterceptors;
import io.grpc.Channel;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class ChatConfiguration {

    private ManagedChannel channel;

    @Bean
    public Channel agentGrpcChannel(
            @Value("${ai.grpc.host:localhost}") String host,
            @Value("${ai.grpc.port:50051}") int port,
            @Value("${ai.grpc.token:}") String serviceToken) {
        if (serviceToken.length() < 32) {
            throw new IllegalStateException("AI gRPC service token must contain at least 32 characters");
        }
        Metadata headers = new Metadata();
        headers.put(Metadata.Key.of("x-service-token", Metadata.ASCII_STRING_MARSHALLER), serviceToken);
        this.channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        return ClientInterceptors.intercept(this.channel, MetadataUtils.newAttachHeadersInterceptor(headers));
    }

    @Bean
    public AgentServiceGrpc.AgentServiceBlockingStub agentServiceBlockingStub(Channel agentGrpcChannel) {
        return AgentServiceGrpc.newBlockingStub(agentGrpcChannel);
    }

    @Bean
    public AiAgentRpcPort aiAgentRpcPort(AgentServiceGrpc.AgentServiceBlockingStub agentServiceBlockingStub) {
        return new GrpcAiAgentAdapter(agentServiceBlockingStub);
    }

    @Bean
    public SendChatMessageInputPort sendChatMessageInputPort(AiAgentRpcPort aiAgentRpcPort) {
        return new SendChatMessageUseCase(aiAgentRpcPort);
    }

    @PreDestroy
    public void cleanup() {
        if (channel != null && !channel.isShutdown()) {
            try {
                channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
