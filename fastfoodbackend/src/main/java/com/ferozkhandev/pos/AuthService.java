package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.Role;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties appProperties;
    private final ApiMapper apiMapper;
    private final CurrentUserService currentUserService;

    public SessionUserResponse signup(SignupRequest request, HttpServletResponse response) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        if (userAccountRepository.existsByEmailIgnoreCase(request.email().trim())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered");
        }
        UserAccount user = new UserAccount();
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.CUSTOMER);
        user.setSuperAdmin(false);
        userAccountRepository.save(user);
        return issueTokens(user, response, HttpStatus.CREATED);
    }

    public SessionUserResponse login(LoginRequest request, HttpServletResponse response) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(request.email().trim())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return issueTokens(user, response, HttpStatus.OK);
    }

    public SessionUserResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = readCookie(request, JwtAuthenticationFilter.REFRESH_COOKIE)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is required."));
        TokenClaims claims = jwtService.parse(refreshToken);
        if (!"refresh".equals(claims.type()) || claims.tokenId() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token.");
        }
        RefreshToken stored = refreshTokenRepository.findByTokenId(claims.tokenId())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is no longer valid."));
        if (stored.getRevokedAt() != null || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is no longer valid.");
        }
        stored.setRevokedAt(Instant.now());
        UserAccount user = stored.getUser();
        return issueTokens(user, response, HttpStatus.OK);
    }

    public SessionUserResponse me() {
        return apiMapper.toSession(currentUserService.user());
    }

    public ErrorResponse logout(HttpServletRequest request, HttpServletResponse response) {
        readCookie(request, JwtAuthenticationFilter.REFRESH_COOKIE)
            .ifPresent(token -> {
                try {
                    TokenClaims claims = jwtService.parse(token);
                    if (claims.tokenId() != null) {
                        refreshTokenRepository.findByTokenId(claims.tokenId()).ifPresent(stored -> {
                            stored.setRevokedAt(Instant.now());
                            refreshTokenRepository.save(stored);
                        });
                    }
                } catch (ApiException ignored) {
                }
            });
        clearCookie(response, JwtAuthenticationFilter.ACCESS_COOKIE);
        clearCookie(response, JwtAuthenticationFilter.REFRESH_COOKIE);
        return new ErrorResponse("Logged out");
    }

    private SessionUserResponse issueTokens(UserAccount user, HttpServletResponse response, HttpStatus status) {
        refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
        String tokenId = UUID.randomUUID().toString();
        String accessToken = jwtService.createAccessToken(user);
        String refreshToken = jwtService.createRefreshToken(user, tokenId);

        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        stored.setTokenId(tokenId);
        stored.setExpiresAt(Instant.now().plusSeconds(appProperties.getSecurity().getRefreshTokenDays() * 24L * 3600L));
        refreshTokenRepository.save(stored);

        addCookie(response, JwtAuthenticationFilter.ACCESS_COOKIE, accessToken, Duration.ofMinutes(appProperties.getSecurity().getAccessTokenMinutes()));
        addCookie(response, JwtAuthenticationFilter.REFRESH_COOKIE, refreshToken, Duration.ofDays(appProperties.getSecurity().getRefreshTokenDays()));
        return apiMapper.toSession(user);
    }

    private Optional<String> readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(request.getCookies()).filter(cookie -> name.equals(cookie.getName())).map(Cookie::getValue).findFirst();
    }

    private void addCookie(HttpServletResponse response, String name, String value, Duration duration) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(appProperties.getSecurity().isSecureCookies())
            .sameSite("Lax")
            .path("/")
            .maxAge(duration)
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearCookie(HttpServletResponse response, String name) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
            .httpOnly(true)
            .secure(appProperties.getSecurity().isSecureCookies())
            .sameSite("Lax")
            .path("/")
            .maxAge(Duration.ZERO)
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
