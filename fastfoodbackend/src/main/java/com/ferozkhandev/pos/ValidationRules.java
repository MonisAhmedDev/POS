package com.ferozkhandev.pos;

import org.springframework.http.HttpStatus;

public final class ValidationRules {

    public static final int MAX_ITEM_QUANTITY = 2000;

    private ValidationRules() {
    }

    public static void requireQuantity(int quantity) {
        if (quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quantity must be between 1 and 2000.");
        }
    }
}
