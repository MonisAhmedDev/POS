package com.ferozkhandev.pos;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerController {

    private final CurrentUserService currentUserService;
    private final CartService cartService;
    private final OrderService orderService;
    private final FeedbackService feedbackService;
    private final UserManagementService userManagementService;
    private final BootstrapService bootstrapService;

    @GetMapping("/bootstrap")
    CustomerBootstrapResponse bootstrap() {
        return bootstrapService.customer(currentUserService.user());
    }

    @GetMapping("/cart")
    CartResponse getCart() {
        return cartService.getCart(currentUserService.user());
    }

    @PostMapping("/cart/items")
    CartResponse addCartItem(@Valid @RequestBody CartItemRequest request) {
        return cartService.addItem(currentUserService.user(), request);
    }

    @PatchMapping("/cart/items/{menuItemId}")
    CartResponse updateCartItem(@PathVariable String menuItemId, @Valid @RequestBody QuantityUpdateRequest request) {
        return cartService.updateItem(currentUserService.user(), menuItemId, request);
    }

    @DeleteMapping("/cart/items/{menuItemId}")
    CartResponse removeCartItem(@PathVariable String menuItemId) {
        return cartService.removeItem(currentUserService.user(), menuItemId);
    }

    @PostMapping("/cart/coupon")
    CartResponse applyCoupon(@Valid @RequestBody CouponApplyRequest request) {
        return cartService.applyCoupon(currentUserService.user(), request);
    }

    @DeleteMapping("/cart/coupon")
    CartResponse removeCoupon() {
        return cartService.removeCoupon(currentUserService.user());
    }

    @GetMapping("/orders")
    List<OrderResponse> listOrders() {
        return orderService.listCustomerOrders(currentUserService.user());
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    OrderResponse placeOrder(@Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(currentUserService.user(), request);
    }

    @PostMapping("/orders/{orderId}/cancel")
    OrderResponse cancelOrder(@PathVariable String orderId) {
        return orderService.cancelCustomerOrder(currentUserService.user(), orderId);
    }

    @GetMapping("/feedback")
    List<FeedbackResponse> myFeedback() {
        return feedbackService.myFeedback(currentUserService.user());
    }

    @PostMapping("/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    FeedbackResponse submitFeedback(@Valid @RequestBody FeedbackSubmitRequest request) {
        return feedbackService.submit(currentUserService.user(), request);
    }

    @PutMapping("/profile")
    AdminAccountResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return userManagementService.updateCurrentProfile(currentUserService.user(), request);
    }
}
