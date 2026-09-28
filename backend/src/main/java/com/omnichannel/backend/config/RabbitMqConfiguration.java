package com.omnichannel.backend.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfiguration {

    public static final String CHAT_EVENTS_QUEUE = "omnichannel.chat.events";
    public static final String CHAT_EVENTS_EXCHANGE = "omnichannel.chat.exchange";
    public static final String CHAT_EVENTS_ROUTING_KEY = "chat.events.key";

    @Bean
    public Queue chatEventsQueue() {
        return QueueBuilder.durable(CHAT_EVENTS_QUEUE).build();
    }

    @Bean
    public DirectExchange chatEventsExchange() {
        return new DirectExchange(CHAT_EVENTS_EXCHANGE);
    }

    @Bean
    public Binding chatEventsBinding(Queue chatEventsQueue, DirectExchange chatEventsExchange) {
        return BindingBuilder.bind(chatEventsQueue).to(chatEventsExchange).with(CHAT_EVENTS_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
