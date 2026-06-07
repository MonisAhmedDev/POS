package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.CouponStatus;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PricingService {

    private final SettingsService settingsService;

    public PricingService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    public CartTotals calculate(List<PricingLineItem> items, Coupon coupon, UserAccount customer, boolean includeDelivery) {
        return calculate(items, coupon, customer, null, MoneyUtils.ZERO, includeDelivery);
    }

    public CartTotals calculate(
        List<PricingLineItem> items,
        Coupon coupon,
        UserAccount customer,
        DiscountType manualDiscountType,
        BigDecimal manualDiscountValue,
        boolean includeDelivery
    ) {
        BigDecimal subtotal = items.stream()
            .map(item -> MoneyUtils.multiply(item.price(), item.quantity()))
            .reduce(MoneyUtils.ZERO, BigDecimal::add);
        BigDecimal itemDiscount = items.stream()
            .map(PricingLineItem::discount)
            .reduce(MoneyUtils.ZERO, BigDecimal::add);
        BigDecimal discountableSubtotal = subtotal.subtract(itemDiscount).max(MoneyUtils.ZERO);
        BigDecimal customerDiscount = calculateCustomerDiscount(discountableSubtotal, customer);
        BigDecimal couponDiscount = calculateDiscount(items, coupon, false);
        BigDecimal manualDiscount = calculateDirectDiscount(discountableSubtotal, manualDiscountType, manualDiscountValue);
        BigDecimal discount = MoneyUtils.money(itemDiscount.add(customerDiscount).add(couponDiscount).add(manualDiscount).min(subtotal));
        BigDecimal delivery = includeDelivery && subtotal.compareTo(MoneyUtils.ZERO) > 0 ? MoneyUtils.DELIVERY_FEE : MoneyUtils.ZERO;
        BigDecimal taxable = subtotal.subtract(discount).max(MoneyUtils.ZERO);
        BigDecimal tax = MoneyUtils.money(taxable.multiply(settingsService.getTaxRate()));
        BigDecimal total = MoneyUtils.money(taxable.add(delivery).add(tax));
        return new CartTotals(MoneyUtils.money(subtotal), discount, delivery, tax, total);
    }

    public void validateCoupon(List<PricingLineItem> items, Coupon coupon) {
        calculateDiscount(items, coupon, true);
    }

    private BigDecimal calculateCustomerDiscount(BigDecimal subtotal, UserAccount customer) {
        if (customer == null || customer.getRestaurantDiscountType() == null) {
            return MoneyUtils.ZERO;
        }
        BigDecimal value = customer.getRestaurantDiscountValue() != null ? customer.getRestaurantDiscountValue() : MoneyUtils.ZERO;
        if (value.compareTo(MoneyUtils.ZERO) <= 0 || subtotal.compareTo(MoneyUtils.ZERO) <= 0) {
            return MoneyUtils.ZERO;
        }
        BigDecimal discount = customer.getRestaurantDiscountType() == DiscountType.PERCENTAGE
            ? subtotal.multiply(value).divide(new BigDecimal("100"))
            : subtotal.min(value);
        return MoneyUtils.money(discount);
    }

    private BigDecimal calculateDirectDiscount(BigDecimal subtotal, DiscountType type, BigDecimal value) {
        if (type == null || value == null || value.compareTo(MoneyUtils.ZERO) <= 0 || subtotal.compareTo(MoneyUtils.ZERO) <= 0) {
            return MoneyUtils.ZERO;
        }
        BigDecimal discount = type == DiscountType.PERCENTAGE
            ? subtotal.multiply(value).divide(new BigDecimal("100"))
            : subtotal.min(value);
        return MoneyUtils.money(discount);
    }

    private BigDecimal calculateDiscount(List<PricingLineItem> items, Coupon coupon, boolean strict) {
        if (coupon == null) {
            return MoneyUtils.ZERO;
        }
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            if (strict) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or inactive coupon");
            }
            return MoneyUtils.ZERO;
        }
        BigDecimal eligibleSubtotal = items.stream()
            .filter(item -> !StringUtils.hasText(coupon.getApplicableCategory()) || coupon.getApplicableCategory().equals(item.category()))
            .map(PricingLineItem::lineTotal)
            .reduce(MoneyUtils.ZERO, BigDecimal::add);
        if (eligibleSubtotal.compareTo(coupon.getMinOrderAmount()) < 0 || eligibleSubtotal.compareTo(MoneyUtils.ZERO) <= 0) {
            if (strict) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon minimum order requirement not met");
            }
            return MoneyUtils.ZERO;
        }
        BigDecimal discount = coupon.getDiscountType() == DiscountType.PERCENTAGE
            ? eligibleSubtotal.multiply(coupon.getDiscountValue()).divide(new BigDecimal("100"))
            : eligibleSubtotal.min(coupon.getDiscountValue());
        return MoneyUtils.money(discount);
    }
}

record PricingLineItem(
    String category,
    BigDecimal price,
    int quantity,
    BigDecimal discount
) {
    PricingLineItem(String category, BigDecimal price, int quantity) {
        this(category, price, quantity, MoneyUtils.ZERO);
    }

    BigDecimal lineTotal() {
        return MoneyUtils.multiply(price, quantity).subtract(discount != null ? discount : MoneyUtils.ZERO).max(MoneyUtils.ZERO);
    }
}
