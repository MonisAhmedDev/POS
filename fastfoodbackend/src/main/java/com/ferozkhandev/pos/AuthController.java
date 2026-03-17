package com.ferozkhandev.pos;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    ResponseEntity<SessionUserResponse> signup(@Valid @RequestBody SignupRequest request, HttpServletResponse response) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signup(request, response));
    }

    @PostMapping("/login")
    SessionUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return authService.login(request, response);
    }

    @PostMapping("/refresh")
    SessionUserResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        return authService.refresh(request, response);
    }

    @PostMapping("/logout")
    ErrorResponse logout(HttpServletRequest request, HttpServletResponse response) {
        return authService.logout(request, response);
    }

    @GetMapping("/me")
    SessionUserResponse me() {
        return authService.me();
    }
}
