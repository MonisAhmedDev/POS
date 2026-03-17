package com.ferozkhandev.pos;

import java.math.BigDecimal;
import java.math.RoundingMode;

final class MoneyUtils {

    static final BigDecimal TAX_RATE = new BigDecimal("0.08");
    static final BigDecimal DELIVERY_FEE = new BigDecimal("1.99");
    static final BigDecimal ZERO = new BigDecimal("0.00");

    private MoneyUtils() {
    }

    static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal multiply(BigDecimal left, int quantity) {
        return money(left.multiply(BigDecimal.valueOf(quantity)));
    }
}
