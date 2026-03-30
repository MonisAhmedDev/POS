package com.ferozkhandev.pos;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final CatalogService catalogService;
    private final AccessService accessService;
    private final UserManagementService userManagementService;
    private final BackupService backupService;
    private final OrderService orderService;
    private final FeedbackService feedbackService;
    private final SettingsService settingsService;
    private final CurrentUserService currentUserService;
    private final BootstrapService bootstrapService;

    @GetMapping("/bootstrap")
    AdminBootstrapResponse bootstrap() {
        return bootstrapService.admin(currentUserService.user());
    }

    @GetMapping("/orders")
    List<OrderResponse> orders() {
        return orderService.listAllOrders();
    }

    @PutMapping("/orders/{orderId}/status")
    OrderResponse updateOrderStatus(@PathVariable String orderId, @Valid @RequestBody OrderStatusUpdateRequest request) {
        return orderService.updateStatus(orderId, request.status());
    }

    @PutMapping("/orders/{orderId}/paid")
    OrderResponse updateOrderPaidStatus(@PathVariable String orderId, @Valid @RequestBody OrderPaidUpdateRequest request) {
        return orderService.updatePaidStatus(orderId, request.paid());
    }

    @GetMapping("/customers")
    List<CustomerSummaryResponse> customers() {
        return userManagementService.listCustomers();
    }

    @DeleteMapping("/customers/{customerId}")
    void deleteCustomer(@PathVariable String customerId) {
        userManagementService.deleteCustomer(customerId);
    }

    @GetMapping("/feedback")
    List<FeedbackResponse> feedback() {
        return feedbackService.allFeedback();
    }

    @GetMapping("/settings/currency")
    CurrencyResponse currency() {
        return settingsService.getCurrencyResponse();
    }

    @PutMapping("/settings/currency")
    CurrencyResponse updateCurrency(@Valid @RequestBody CurrencyUpdateRequest request) {
        return settingsService.setCurrency(request.currency());
    }

    @GetMapping("/settings/tax")
    java.math.BigDecimal getTaxSettings() {
        return settingsService.getTaxRate();
    }

    @PutMapping("/settings/tax")
    java.math.BigDecimal updateTaxSettings(@Valid @RequestBody TaxUpdateRequest request) {
        return settingsService.setTaxRate(request.rate());
    }

    @GetMapping("/staff/admins")
    List<AdminAccountResponse> admins() {
        accessService.requireSuperAdmin();
        return userManagementService.listAdmins();
    }

    @GetMapping("/staff/cashiers")
    List<AdminAccountResponse> cashiers() {
        accessService.requireSuperAdmin();
        return userManagementService.listCashiers();
    }

    @PostMapping("/staff/admins")
    org.springframework.http.ResponseEntity<AdminAccountResponse> createAdmin(@Valid @RequestBody StaffCreateRequest request) {
        accessService.requireSuperAdmin();
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
            .body(userManagementService.createAdmin(request));
    }

    @PostMapping("/staff/cashiers")
    org.springframework.http.ResponseEntity<AdminAccountResponse> createCashier(@Valid @RequestBody StaffCreateRequest request) {
        accessService.requireSuperAdmin();
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
            .body(userManagementService.createCashier(request));
    }

    @PutMapping("/staff/{userId}")
    AdminAccountResponse updateStaff(@PathVariable String userId, @Valid @RequestBody StaffUpdateRequest request) {
        accessService.requireSuperAdmin();
        return userManagementService.updateStaff(userId, request);
    }

    @DeleteMapping("/staff/{userId}")
    void deleteStaff(@PathVariable String userId) {
        accessService.requireSuperAdmin();
        userManagementService.deleteStaff(userId);
    }

    @GetMapping("/coupons")
    List<CouponResponse> coupons() {
        accessService.requireSuperAdmin();
        return catalogService.listCoupons();
    }

    @PostMapping("/coupons")
    CouponResponse createCoupon(@Valid @RequestBody CouponRequest request) {
        accessService.requireSuperAdmin();
        return catalogService.saveCoupon(null, request);
    }

    @PutMapping("/coupons/{couponId}")
    CouponResponse updateCoupon(@PathVariable String couponId, @Valid @RequestBody CouponRequest request) {
        accessService.requireSuperAdmin();
        return catalogService.saveCoupon(couponId, request);
    }

    @DeleteMapping("/coupons/{couponId}")
    void deleteCoupon(@PathVariable String couponId) {
        accessService.requireSuperAdmin();
        catalogService.deleteCoupon(couponId);
    }

    @GetMapping("/backup/export")
    BackupSnapshotResponse exportData() {
        return backupService.exportSnapshot();
    }

    @PostMapping("/backup/import")
    ErrorResponse importData(@RequestBody BackupSnapshotResponse snapshot) {
        return backupService.importSnapshot(snapshot);
    }

    @DeleteMapping("/backup/all")
    ErrorResponse clearAll() {
        return backupService.clearAll();
    }
}
