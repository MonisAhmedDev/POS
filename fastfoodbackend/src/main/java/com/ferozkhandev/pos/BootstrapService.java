package com.ferozkhandev.pos;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BootstrapService {

    private final ApiMapper apiMapper;
    private final CatalogService catalogService;
    private final OrderService orderService;
    private final FeedbackService feedbackService;
    private final UserManagementService userManagementService;
    private final SettingsService settingsService;
    private final CartService cartService;
    private final OrderHistoryService orderHistoryService;

    public AdminBootstrapResponse admin(UserAccount user) {
        return new AdminBootstrapResponse(
            apiMapper.toSession(user),
            catalogService.listMenuItems(),
            orderService.listAllOrders(),
            feedbackService.allFeedback(),
            userManagementService.listCustomers(),
            userManagementService.listAdmins(),
            userManagementService.listCashiers(),
            user.isSuperAdmin() ? catalogService.listCoupons() : java.util.List.of(),
            settingsService.getCurrency(),
            settingsService.getTaxRate(),
            orderHistoryService.buildReport()
        );
    }

    public CustomerBootstrapResponse customer(UserAccount user) {
        return new CustomerBootstrapResponse(
            apiMapper.toSession(user),
            catalogService.listMenuItems(),
            orderService.listCustomerOrders(user),
            feedbackService.myFeedback(user),
            cartService.getCart(user),
            catalogService.listCoupons(),
            settingsService.getCurrency(),
            settingsService.getTaxRate()
        );
    }

    public CashierBootstrapResponse cashier(UserAccount user) {
        return new CashierBootstrapResponse(
            apiMapper.toSession(user),
            catalogService.listMenuItems(),
            orderService.listAllOrders(),
            userManagementService.listCashierCustomers(),
            catalogService.listCoupons(),
            settingsService.getCurrency(),
            settingsService.getTaxRate()
        );
    }
}
