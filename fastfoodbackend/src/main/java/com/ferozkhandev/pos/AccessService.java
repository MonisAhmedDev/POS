package com.ferozkhandev.pos;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AccessService {

    private final CurrentUserService currentUserService;

    public AccessService(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    public void requireSuperAdmin() {
        if (!currentUserService.principal().superAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the Chief Admin can perform this action.");
        }
    }
}
