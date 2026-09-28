package com.omnichannel.backend.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class SecurityConfigurationTest {
    @Test
    void mapsIdentityProviderRolesToServerAuthorities() {
        var jwt = Jwt.withTokenValue("opaque-test-token")
                .header("alg", "none")
                .subject("employee-123")
                .claim("roles", List.of("EMPLOYEE", "ADMIN"))
                .build();

        var authentication = new SecurityConfiguration().jwtAuthenticationConverter().convert(jwt);

        assertTrue(authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        assertTrue(authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertFalse(authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
    }
}
