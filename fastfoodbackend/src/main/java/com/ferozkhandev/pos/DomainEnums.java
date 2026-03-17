package com.ferozkhandev.pos;

public final class DomainEnums {

    private DomainEnums() {
    }

    public enum Role {
        ADMIN,
        CUSTOMER,
        CASHIER
    }

    public enum OrderStatus {
        PREPARING,
        READY,
        DELIVERED,
        CANCELLED
    }

    public enum PaymentMethod {
        CASH,
        CARD
    }

    public enum DiscountType {
        PERCENTAGE,
        FIXED
    }

    public enum CouponStatus {
        ACTIVE,
        INACTIVE
    }
}
