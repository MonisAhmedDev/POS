package com.ferozkhandev.pos;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ApiMapper {

    public SessionUserResponse toSession(UserAccount user) {
        return new SessionUserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name().toLowerCase(),
            user.isSuperAdmin()
        );
    }

    public MenuItemResponse toMenuItem(MenuItem item) {
        return new MenuItemResponse(
            item.getId(),
            item.getName(),
            item.getCategory(),
            MoneyUtils.money(item.getPrice()),
            MoneyUtils.money(item.getDiscount()),
            item.getDescription(),
            item.getIcon(),
            StringUtils.hasText(item.getImagePath()) ? "/uploads/" + item.getImagePath() : null,
            item.isAvailable(),
            item.getCreatedAt()
        );
    }

    public CouponResponse toCoupon(Coupon coupon) {
        return new CouponResponse(
            coupon.getId(),
            coupon.getCode(),
            coupon.getDiscountType().name().toLowerCase(),
            MoneyUtils.money(coupon.getDiscountValue()),
            MoneyUtils.money(coupon.getMinOrderAmount()),
            StringUtils.hasText(coupon.getApplicableCategory()) ? coupon.getApplicableCategory() : "",
            titleCase(coupon.getStatus().name()),
            coupon.getCreatedAt()
        );
    }

    public OrderResponse toOrder(ShopOrder order) {
        return new OrderResponse(
            order.getId(),
            order.getCustomer() != null ? order.getCustomer().getId() : null,
            order.getCustomerName(),
            order.getCashier() != null ? order.getCashier().getId() : null,
            order.getCashierName(),
            order.getItems().stream().map(this::toOrderItem).toList(),
            MoneyUtils.money(order.getSubtotal()),
            MoneyUtils.money(order.getDiscount()),
            MoneyUtils.money(order.getDelivery()),
            MoneyUtils.money(order.getTax()),
            MoneyUtils.money(order.getTotal()),
            order.getCouponCode(),
            titleCase(order.getPaymentMethod().name()),
            order.getDeliveryName(),
            order.getPhone(),
            order.getAddress(),
            titleCase(order.getStatus().name()),
            order.isPaid(),
            order.getCreatedAt()
        );
    }

    public OrderItemResponse toOrderItem(OrderItem item) {
        return new OrderItemResponse(
            item.getMenuItemId(),
            item.getName(),
            item.getCategory(),
            item.getIcon(),
            MoneyUtils.money(item.getPrice()),
            item.getQuantity()
        );
    }

    public FeedbackResponse toFeedback(FeedbackEntry entry) {
        return new FeedbackResponse(
            entry.getId(),
            entry.getCustomer().getId(),
            entry.getCustomerName(),
            entry.getOrder().getId(),
            entry.getOrderRef(),
            entry.getRating(),
            entry.getComment(),
            entry.getCreatedAt()
        );
    }

    public CartResponse toCart(Cart cart, CartTotals totals) {
        List<CartItemResponse> items = cart.getItems().stream()
            .map(item -> new CartItemResponse(
                item.getMenuItem().getId(),
                item.getMenuItem().getName(),
                MoneyUtils.money(item.getMenuItem().getPrice()),
                item.getMenuItem().getCategory(),
                item.getMenuItem().getIcon(),
                item.getQuantity()
            ))
            .toList();
        return new CartResponse(
            items,
            totals.subtotal(),
            totals.discount(),
            totals.delivery(),
            totals.tax(),
            totals.total(),
            cart.getCoupon() != null ? cart.getCoupon().getCode() : null
        );
    }

    public AdminAccountResponse toAccount(UserAccount user) {
        return new AdminAccountResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name().toLowerCase(),
            user.isSuperAdmin(),
            user.getCreatedAt()
        );
    }

    public CustomerSummaryResponse toCustomerSummary(
        UserAccount customer,
        List<OrderResponse> orders,
        BigDecimal totalSpent,
        BigDecimal averageRating,
        int reviewCount
    ) {
        return new CustomerSummaryResponse(
            customer.getId(),
            customer.getName(),
            customer.getEmail(),
            customer.getCreatedAt(),
            orders.size(),
            MoneyUtils.money(totalSpent),
            averageRating.setScale(1, RoundingMode.HALF_UP),
            reviewCount,
            orders
        );
    }

    private String titleCase(String value) {
        String lower = value.toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}

record CartTotals(
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal delivery,
    BigDecimal tax,
    BigDecimal total
) {
}
