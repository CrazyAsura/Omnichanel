package com.omnichannel.backend.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.omnichannel.backend.config.SecurityConfiguration;
import com.omnichannel.backend.security.SecurityAuditService;

@WebMvcTest(value = HealthController.class, properties = {
        "JWT_ISSUER_URI=https://issuer.example.test",
        "JWT_JWK_SET_URI=https://issuer.example.test/jwks",
        "JWT_AUDIENCE=omnichannel-api"
})
@Import(SecurityConfiguration.class)
class HealthControllerTest {
    @Autowired MockMvc mvc;
    @MockBean SecurityAuditService auditService;

    @Test
    void returnsServiceHealth() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("omnichannel-backend"));
    }
}
