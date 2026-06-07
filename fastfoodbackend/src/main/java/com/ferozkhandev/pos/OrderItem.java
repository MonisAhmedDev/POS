package com.ferozkhandev.pos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "order_item")
public class OrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private ShopOrder order;

    @Column(name = "menu_item_id", length = 64)
    private String menuItemId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(nullable = false, length = 16)
    private String icon;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "manual_discount_type", length = 32)
    private DiscountType manualDiscountType;

    @Column(name = "manual_discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal manualDiscountValue = BigDecimal.ZERO;

    @Column(nullable = false)
    private int quantity;
}
