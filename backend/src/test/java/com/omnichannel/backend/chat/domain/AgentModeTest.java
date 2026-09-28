package com.omnichannel.backend.chat.domain;

import com.omnichannel.backend.chat.domain.valueobject.AgentMode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AgentModeTest {

    @Test
    @DisplayName("Deve mapear corretamente modo de leitor de documentos")
    void shouldMapDocReaderMode() {
        AgentMode mode = AgentMode.fromString("Leitor de documentos internos");
        assertEquals(AgentMode.DOC_READER, mode);
    }

    @Test
    @DisplayName("Deve mapear corretamente modo de analista de dados")
    void shouldMapDataAnalystMode() {
        AgentMode mode = AgentMode.fromString("Analista de dados");
        assertEquals(AgentMode.DATA_ANALYST, mode);
    }

    @Test
    @DisplayName("Deve mapear corretamente modo de gerador de arquivos")
    void shouldMapFileGeneratorMode() {
        AgentMode mode = AgentMode.fromString("Gerador de arquivos");
        assertEquals(AgentMode.FILE_GENERATOR, mode);
    }

    @Test
    @DisplayName("Deve usar DOC_READER como fallback para valores nulos ou vazios")
    void shouldUseDocReaderAsFallback() {
        assertEquals(AgentMode.DOC_READER, AgentMode.fromString(null));
        assertEquals(AgentMode.DOC_READER, AgentMode.fromString(""));
        assertEquals(AgentMode.DOC_READER, AgentMode.fromString("desconhecido"));
    }
}
