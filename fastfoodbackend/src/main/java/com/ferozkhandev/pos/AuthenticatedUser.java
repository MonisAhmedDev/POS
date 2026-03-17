package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.Role;
import java.security.Principal;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public record AuthenticatedUser(
    String id,
    String email,
    Role role,
    boolean superAdmin
) implements Principal {

    public List<? extends GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getName() {
        return email;
    }
}
