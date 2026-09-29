package com.omnichannel.backend.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final PasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    private final JwtEncoder jwtEncoder;
    private final String issuer;
    private final String audience;
    private final Map<String, SeedUser> usersByEmail;

    public AuthController(
            JwtEncoder jwtEncoder,
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer,
            @Value("${app.security.jwt.audience}") String audience,
            @Value("${app.security.seed-users}") String seedUsers) {
        this.jwtEncoder = jwtEncoder;
        this.issuer = issuer;
        this.audience = audience;
        this.usersByEmail = List.of(seedUsers.split(";")).stream()
                .map(SeedUser::parse)
                .collect(Collectors.toUnmodifiableMap(SeedUser::email, Function.identity()));
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record LoginResponse(String accessToken, String email, String name, List<String> roles) {}
    private record SeedUser(String email, String name, String passwordHash, List<String> roles) {
        static SeedUser parse(String raw) {
            String[] fields = raw.split("\\|", -1);
            if (fields.length != 4 || fields[0].isBlank() || fields[2].isBlank() || fields[3].isBlank()) {
                throw new IllegalStateException("Invalid seed user configuration");
            }
            String hash = new String(java.util.Base64.getDecoder().decode(fields[2]), java.nio.charset.StandardCharsets.UTF_8);
            return new SeedUser(fields[0].toLowerCase(Locale.ROOT), fields[1], hash, List.of(fields[3].split(",")));
        }
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        String email = request.email().toLowerCase(Locale.ROOT);
        SeedUser user = usersByEmail.get(email);
        if (user == null) throw invalidCredentials();
        if (!PASSWORD_ENCODER.matches(request.password(), user.passwordHash())) throw invalidCredentials();

        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer).subject(user.email()).audience(List.of(audience))
                .issuedAt(now).expiresAt(now.plusSeconds(12 * 60 * 60))
                .claim("email", user.email()).claim("name", user.name()).claim("roles", user.roles())
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                org.springframework.security.oauth2.jwt.JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, user.email(), user.name(), user.roles());
    }

    private static ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou senha inválidos");
    }

    public record UserProfileDto(String name, String email, String role, String status, String lastSeen, String initials) {}

    @org.springframework.web.bind.annotation.GetMapping("/users")
    public List<UserProfileDto> getUsers() {
        return usersByEmail.values().stream().map(u -> {
            String role = u.roles().contains("SUPER_ADMIN") ? "Super-admin"
                        : (u.roles().contains("ADMIN") ? "Admin" : "Funcionário");
            String[] parts = u.name().split("\\s+");
            String initials = parts.length > 1
                ? ("" + parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase(Locale.ROOT)
                : u.name().substring(0, Math.min(2, u.name().length())).toUpperCase(Locale.ROOT);
            return new UserProfileDto(u.name(), u.email(), role, "Ativo", "Agora", initials);
        }).toList();
    }

    public static String hashSeedPassword(String password) {
        return PASSWORD_ENCODER.encode(password);
    }
}
