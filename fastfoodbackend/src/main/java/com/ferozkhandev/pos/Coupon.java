package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.CouponStatus;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
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
@Table(name = "coupon")
public class Coupon extends BaseEntity {

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 32)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_order_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "applicable_category", length = 64)
    private String applicableCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CouponStatus status;
}
