package com.ferozkhandev.pos;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties properties;

    public JwtService(AppProperties properties) {
        this.properties = properties;
        String secret = properties.getSecurity().getJwtSecret();
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException ignored) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "JWT secret must be at least 32 bytes.");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String createAccessToken(UserAccount user) {
        Instant expiry = Instant.now().plusSeconds(properties.getSecurity().getAccessTokenMinutes() * 60L);
        return buildToken(user, expiry, Map.of("type", "access"));
    }

    public String createRefreshToken(UserAccount user, String tokenId) {
        Instant expiry = Instant.now().plusSeconds(properties.getSecurity().getRefreshTokenDays() * 24L * 3600L);
        return buildToken(user, expiry, Map.of("type", "refresh", "tokenId", tokenId));
    }

    public TokenClaims parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return new TokenClaims(
                claims.getSubject(),
                claims.get("email", String.class),
                claims.get("role", String.class),
                claims.get("superAdmin", Boolean.class),
                claims.get("type", String.class),
                claims.get("tokenId", String.class),
                claims.getExpiration().toInstant()
            );
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid authentication token.");
        }
    }

    private String buildToken(UserAccount user, Instant expiry, Map<String, Object> extraClaims) {
        return Jwts.builder()
            .subject(user.getId())
            .claims(Map.of(
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "superAdmin", user.isSuperAdmin()
            ))
            .claims(extraClaims)
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(expiry))
            .signWith(key)
            .compact();
    }
}

record TokenClaims(
    String userId,
    String email,
    String role,
    Boolean superAdmin,
    String type,
    String tokenId,
    Instant expiresAt
) {
}
