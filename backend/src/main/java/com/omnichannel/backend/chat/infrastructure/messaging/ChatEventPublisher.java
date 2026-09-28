package com.omnichannel.backend.chat.infrastructure.messaging;

import com.omnichannel.backend.chat.application.dto.ChatMessageOutput;
import com.omnichannel.backend.config.RabbitMqConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class ChatEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ChatEventPublisher.class);
    private static final String KAFKA_CHAT_TOPIC = "omnichannel.chat.events";

    private final RabbitTemplate rabbitTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ChatEventPublisher(
            @Autowired(required = false) RabbitTemplate rabbitTemplate,
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate) {
        this.rabbitTemplate = rabbitTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishChatEvent(ChatMessageOutput output) {
        Map<String, Object> payload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "agentUsed", output.agentUsed(),
                "executionTimeMs", output.executionTimeMs(),
                "timestamp", System.currentTimeMillis()
        );

        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMqConfiguration.CHAT_EVENTS_EXCHANGE,
                        RabbitMqConfiguration.CHAT_EVENTS_ROUTING_KEY,
                        payload
                );
                log.debug("Evento de chat publicado no RabbitMQ");
            } catch (Exception e) {
                log.warn("Não foi possível publicar no RabbitMQ: {}", e.getMessage());
            }
        }

        if (kafkaTemplate != null) {
            try {
                kafkaTemplate.send(KAFKA_CHAT_TOPIC, null, payload);
                log.debug("Evento de chat publicado no Kafka");
            } catch (Exception e) {
                log.warn("Não foi possível publicar no Kafka: {}", e.getMessage());
            }
        }
    }
}
