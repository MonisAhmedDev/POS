package com.ferozkhandev.pos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

record SignupRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    @Size(min = 6) String password,
    @Size(min = 6) String confirmPassword
) {
}

record LoginRequest(
    @Email @NotBlank String email,
    @NotBlank String password
) {
}

record SessionUserResponse(
    String id,
    String name,
    String email,
    String role,
    boolean isSuperAdmin
) {
}

record MenuItemResponse(
    String id,
    String name,
    String category,
    BigDecimal price,
    BigDecimal discount,
    String description,
    String icon,
    String imageUrl,
    boolean available,
    Instant createdAt
) {
}

record OrderItemResponse(
    String id,
    String name,
    String category,
    String icon,
    BigDecimal price,
    int qty
) {
}

record OrderResponse(
    String id,
    String customerId,
    String customerName,
    String cashierId,
    String cashierName,
    List<OrderItemResponse> items,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal delivery,
    BigDecimal tax,
    BigDecimal total,
    String couponCode,
    String paymentMethod,
    String deliveryName,
    String phone,
    String address,
    String status,
    boolean paid,
    Instant createdAt
) {
}

record FeedbackResponse(
    String id,
    String customerId,
    String customerName,
    String orderId,
    String orderRef,
    int rating,
    String comment,
    Instant createdAt
) {
}

record CouponRequest(
    @NotBlank String code,
    @NotBlank String discountType,
    @NotNull BigDecimal discountValue,
    @NotNull BigDecimal minOrderAttr,
    String applicableCategory,
    @NotBlank String status
) {
}

record CouponResponse(
    String id,
    String code,
    String discountType,
    BigDecimal discountValue,
    BigDecimal minOrderAttr,
    String applicableCategory,
    String status,
    Instant createdAt
) {
}

record CartItemRequest(
    @NotBlank String menuItemId,
    @Min(1) @Max(ValidationRules.MAX_ITEM_QUANTITY) int quantity
) {
}

record QuantityUpdateRequest(
    @Min(1) @Max(ValidationRules.MAX_ITEM_QUANTITY) int quantity
) {
}

record CouponApplyRequest(
    @NotBlank String code
) {
}

record CartItemResponse(
    String id,
    String name,
    BigDecimal price,
    String category,
    String icon,
    int qty
) {
}

record CartResponse(
    List<CartItemResponse> items,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal delivery,
    BigDecimal tax,
    BigDecimal total,
    String couponCode
) {
}

record CheckoutRequest(
    @NotBlank String deliveryName,
    @NotBlank String phone,
    @NotBlank String address,
    @NotBlank String paymentMethod,
    String cardNumber,
    String expiry,
    String cvv
) {
}

record PosOrderItemRequest(
    @NotBlank String id,
    @Min(1) @Max(ValidationRules.MAX_ITEM_QUANTITY) int qty
) {
}

record PosOrderRequest(
    String customerName,
    String couponCode,
    @NotBlank String paymentMethod,
    @NotEmpty List<PosOrderItemRequest> items
) {
}

record OrderStatusUpdateRequest(@NotBlank String status) {
}

record OrderPaidUpdateRequest(@NotNull Boolean paid) {
}

record FeedbackSubmitRequest(
    @NotBlank String orderId,
    @Min(1) @Max(5) int rating,
    String comment
) {
}

record ProfileUpdateRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    @NotBlank String currentPassword,
    String newPassword,
    String confirmPassword
) {
}

record AdminAccountResponse(
    String id,
    String name,
    String email,
    String role,
    boolean isSuperAdmin,
    String restaurantDiscountType,
    BigDecimal restaurantDiscountValue,
    Instant createdAt
) {
}

record StaffCreateRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    @Size(min = 6) String password
) {
}

record StaffUpdateRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    String password
) {
}

record CustomerDiscountUpdateRequest(
    @NotBlank String discountType,
    @NotNull BigDecimal discountValue
) {
}

record CustomerSummaryResponse(
    String id,
    String name,
    String email,
    Instant createdAt,
    String restaurantDiscountType,
    BigDecimal restaurantDiscountValue,
    int orderCount,
    BigDecimal totalSpent,
    BigDecimal averageRating,
    int reviewCount,
    List<OrderResponse> orders
) {
}

record CurrencyResponse(String currency) {
}

record CurrencyUpdateRequest(@NotBlank String currency) {
}

record TaxUpdateRequest(@NotNull BigDecimal rate) {
}

record CustomerFeedbackBootstrap(
    List<OrderResponse> eligibleOrders,
    List<FeedbackResponse> feedback
) {
}

record AdminBootstrapResponse(
    SessionUserResponse session,
    List<MenuItemResponse> items,
    List<OrderResponse> orders,
    List<FeedbackResponse> feedback,
    List<CustomerSummaryResponse> customers,
    List<AdminAccountResponse> admins,
    List<AdminAccountResponse> cashiers,
    List<CouponResponse> coupons,
    String currency,
    BigDecimal taxRate,
    OrderHistoryReportResponse orderHistory
) {
}

record CustomerBootstrapResponse(
    SessionUserResponse session,
    List<MenuItemResponse> items,
    List<OrderResponse> orders,
    List<FeedbackResponse> feedback,
    CartResponse cart,
    List<CouponResponse> coupons,
    String currency,
    BigDecimal taxRate
) {
}

record CashierBootstrapResponse(
    SessionUserResponse session,
    List<MenuItemResponse> items,
    List<OrderResponse> orders,
    List<AdminAccountResponse> customers,
    List<CouponResponse> coupons,
    String currency,
    BigDecimal taxRate
) {
}

record OrderHistoryBucketResponse(
    String periodType,
    String label,
    Instant periodStart,
    Instant periodEnd,
    int orderCount,
    int paidOrderCount,
    int deliveredOrderCount,
    int cancelledOrderCount,
    BigDecimal salesTotal,
    List<OrderResponse> orders
) {
}

record OrderHistoryReportResponse(
    Instant generatedAt,
    String timezone,
    int businessDayCutoffHour,
    OrderHistoryBucketResponse currentBusinessDay,
    List<OrderHistoryBucketResponse> daily,
    List<OrderHistoryBucketResponse> weekly,
    List<OrderHistoryBucketResponse> monthly
) {
}

record BackupSnapshotResponse(
    String version,
    Instant exportedAt,
    List<BackupUserRecord> users,
    List<BackupMenuItemRecord> items,
    List<BackupOrderRecord> orders,
    List<FeedbackResponse> feedback,
    List<CouponResponse> coupons,
    CartBackupRecord carts,
    String currency
) {
}

record BackupUserRecord(
    String id,
    String name,
    String email,
    String passwordHash,
    String role,
    boolean isSuperAdmin,
    String restaurantDiscountType,
    BigDecimal restaurantDiscountValue,
    Instant createdAt
) {
}

record BackupMenuItemRecord(
    String id,
    String name,
    String category,
    BigDecimal price,
    BigDecimal discount,
    String description,
    String icon,
    boolean available,
    Instant createdAt,
    String imageBase64
) {
}

record BackupOrderRecord(
    String id,
    String customerId,
    String customerName,
    String cashierId,
    String cashierName,
    List<OrderItemResponse> items,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal delivery,
    BigDecimal tax,
    BigDecimal total,
    String couponCode,
    String paymentMethod,
    String deliveryName,
    String phone,
    String address,
    String status,
    boolean paid,
    Instant createdAt
) {
}

record CartBackupRecord(
    List<CartUserRecord> carts
) {
}

record CartUserRecord(
    String userId,
    String couponCode,
    List<CartItemResponse> items
) {
}

record ErrorResponse(String message) {
}
