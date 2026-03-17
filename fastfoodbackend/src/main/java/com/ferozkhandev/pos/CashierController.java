package com.ferozkhandev.pos;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cashier")
@RequiredArgsConstructor
public class CashierController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;
    private final OrderService orderService;
    private final BootstrapService bootstrapService;

    @GetMapping("/bootstrap")
    CashierBootstrapResponse bootstrap() {
        return bootstrapService.cashier(currentUserService.user());
    }

    @GetMapping("/customers")
    List<AdminAccountResponse> customers() {
        return userManagementService.listCashierCustomers();
    }

    @PostMapping("/customers")
    ResponseEntity<AdminAccountResponse> createCustomer(@Valid @RequestBody StaffCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userManagementService.createCustomer(request));
    }

    @PutMapping("/customers/{customerId}")
    AdminAccountResponse updateCustomer(@PathVariable String customerId, @Valid @RequestBody StaffUpdateRequest request) {
        return userManagementService.updateCustomer(customerId, request);
    }

    @PostMapping("/orders")
    ResponseEntity<OrderResponse> createPosOrder(@Valid @RequestBody PosOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(orderService.createPosOrder(currentUserService.user(), request));
    }

    @GetMapping("/orders")
    List<OrderResponse> orders() {
        return orderService.listAllOrders();
    }

    @PutMapping("/orders/{orderId}/status")
    OrderResponse updateOrderStatus(@PathVariable String orderId, @Valid @RequestBody OrderStatusUpdateRequest request) {
        return orderService.updateStatus(orderId, request.status());
    }

    @PostMapping("/orders/{orderId}/cancel")
    OrderResponse cancelOrder(@PathVariable String orderId) {
        return orderService.cancelCashierOrder(orderId);
    }
}
