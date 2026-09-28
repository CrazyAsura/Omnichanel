package com.omnichannel.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

public class SecurityAuditFilter extends OncePerRequestFilter {
    private final SecurityAuditService auditService;

    public SecurityAuditFilter(SecurityAuditService auditService) {
        this.auditService = auditService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.startsWith("/api/") || path.equals("/api/health") || path.equals("/api/v1/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        UUID requestId = UUID.randomUUID();
        request.setAttribute("requestId", requestId.toString());
        response.setHeader("X-Request-ID", requestId.toString());
        try {
            chain.doFilter(request, response);
        } finally {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String actor = authentication instanceof JwtAuthenticationToken jwt
                    ? jwt.getToken().getSubject()
                    : "anonymous";
            String outcome = response.getStatus() == 401 ? "AUTHENTICATION_FAILURE"
                    : response.getStatus() == 403 ? "AUTHORIZATION_DENIED"
                    : response.getStatus() < 400 ? "SUCCESS" : "ERROR";
            auditService.record(new SecurityAuditEvent(
                    pseudonymize(actor == null || actor.isBlank() ? "unknown" : actor),
                    request.getMethod(),
                    routeCategory(request.getServletPath()),
                    outcome,
                    requestId));
        }
    }

    private String routeCategory(String path) {
        String[] segments = path.split("/");
        int count = Math.min(segments.length, 4);
        var safe = new java.util.ArrayList<String>(count);
        for (int i = 0; i < count; i++) {
            String segment = segments[i];
            safe.add(segment.matches("[A-Za-z0-9_-]{1,64}") ? segment : "resource");
        }
        return String.join("/", safe);
    }

    private String pseudonymize(String actor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(actor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
