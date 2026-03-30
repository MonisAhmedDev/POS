package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.DiscountType;
import com.ferozkhandev.pos.DomainEnums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "app_user")
public class UserAccount extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Role role;

    @Column(name = "super_admin", nullable = false)
    private boolean superAdmin;

    @Enumerated(EnumType.STRING)
    @Column(name = "restaurant_discount_type", length = 32)
    private DiscountType restaurantDiscountType;

    @Column(name = "restaurant_discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal restaurantDiscountValue = BigDecimal.ZERO;
}
