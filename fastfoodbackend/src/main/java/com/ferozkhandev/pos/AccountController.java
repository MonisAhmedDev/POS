package com.ferozkhandev.pos;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;

    @PutMapping("/profile")
    AdminAccountResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return userManagementService.updateCurrentProfile(currentUserService.user(), request);
    }
}
