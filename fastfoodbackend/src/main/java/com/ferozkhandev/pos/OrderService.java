package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.OrderStatus;
import com.ferozkhandev.pos.DomainEnums.PaymentMethod;
import com.ferozkhandev.pos.DomainEnums.Role;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
@RequiredArgsConstructor
public class OrderService {

    private final ShopOrderRepository shopOrderRepository;
    private final UserAccountRepository userAccountRepository;
    private final CatalogService catalogService;
    private final CartService cartService;
    private final PricingService pricingService;
    private final ApiMapper apiMapper;

    public List<OrderResponse> listAllOrders() {
        return shopOrderRepository.findAllByOrderByCreatedAtDesc().stream().map(apiMapper::toOrder).toList();
    }

    public List<OrderResponse> listCustomerOrders(UserAccount customer) {
        return shopOrderRepository.findByCustomer_IdOrderByCreatedAtDesc(customer.getId()).stream().map(apiMapper::toOrder).toList();
    }

    public OrderResponse checkout(UserAccount customer, CheckoutRequest request) {
        validateCheckoutRequest(request);
        Cart cart = cartService.getOrCreateCart(customer);
        if (cart.getItems().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your cart is empty");
        }
        CartTotals totals = cartService.totals(cart);
        ShopOrder order = new ShopOrder();
        order.setCustomer(customer);
        order.setCustomerName(customer.getName());
        order.setCashier(null);
        order.setCashierName(null);
        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setDelivery(totals.delivery());
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        order.setCouponCode(cart.getCoupon() != null ? cart.getCoupon().getCode() : null);
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.setDeliveryName(request.deliveryName().trim());
        order.setPhone(request.phone().trim());
        order.setAddress(request.address().trim());
        order.setStatus(OrderStatus.PREPARING);
        order.setItems(new ArrayList<>());
        cart.getItems().forEach(item -> order.getItems().add(toOrderItem(order, item.getMenuItem(), item.getQuantity())));
        ShopOrder saved = shopOrderRepository.save(order);
        cartService.clear(customer);
        return apiMapper.toOrder(saved);
    }

    public OrderResponse createPosOrder(UserAccount cashier, PosOrderRequest request) {
        List<MenuItemQuantity> items = resolveItems(request.items());
        if (items.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }
        Coupon coupon = StringUtils.hasText(request.couponCode()) ? catalogService.findActiveCoupon(request.couponCode()) : null;
        UserAccount customer = findCustomerByName(request.customerName());
        List<PricingLineItem> pricingItems = items.stream()
            .map(item -> new PricingLineItem(item.menuItem().getCategory(), effectivePrice(item.menuItem()), item.quantity()))
            .toList();
        if (coupon != null) {
            pricingService.validateCoupon(pricingItems, coupon);
        }
        CartTotals totals = pricingService.calculate(pricingItems, coupon, customer, false);
        String customerName = StringUtils.hasText(request.customerName()) ? request.customerName().trim() : "Walk-in Customer";

        ShopOrder order = new ShopOrder();
        order.setCustomer(customer);
        order.setCustomerName(customer != null ? customer.getName() : customerName);
        order.setCashier(cashier);
        order.setCashierName(cashier.getName());
        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setDelivery(MoneyUtils.ZERO);
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        order.setCouponCode(coupon != null ? coupon.getCode() : null);
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.setDeliveryName(customerName);
        order.setPhone(null);
        order.setAddress("In-store");
        order.setStatus(OrderStatus.PREPARING);
        order.setItems(new ArrayList<>());
        items.forEach(item -> order.getItems().add(toOrderItem(order, item.menuItem(), item.quantity())));
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    public OrderResponse updateAdminOrder(String orderId, PosOrderRequest request) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only active orders can be edited.");
        }
        List<MenuItemQuantity> newItems = resolveItems(request.items());
        if (newItems.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty.");
        }
        Coupon coupon = StringUtils.hasText(request.couponCode()) ? catalogService.findActiveCoupon(request.couponCode()) : null;
        UserAccount customer = order.getCustomer() != null ? order.getCustomer() : findCustomerByName(request.customerName());
        List<PricingLineItem> pricingItems = newItems.stream()
            .map(item -> new PricingLineItem(item.menuItem().getCategory(), effectivePrice(item.menuItem()), item.quantity()))
            .toList();
        if (coupon != null) {
            pricingService.validateCoupon(pricingItems, coupon);
        }
        CartTotals totals = pricingService.calculate(pricingItems, coupon, customer, includesDelivery(order));
        order.setCustomer(customer);
        if (customer != null) {
            order.setCustomerName(customer.getName());
            if (!StringUtils.hasText(order.getDeliveryName()) || !includesDelivery(order)) {
                order.setDeliveryName(customer.getName());
            }
        } else if (StringUtils.hasText(request.customerName())) {
            String customerName = request.customerName().trim();
            order.setCustomerName(customerName);
            if (!includesDelivery(order)) {
                order.setDeliveryName(customerName);
            }
        }
        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setDelivery(totals.delivery());
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        order.setCouponCode(coupon != null ? coupon.getCode() : null);
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.getItems().clear();
        newItems.forEach(item -> order.getItems().add(toOrderItem(order, item.menuItem(), item.quantity())));
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    public OrderResponse updateStatus(String orderId, String status) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cancelled orders cannot be updated.");
        }
        order.setStatus(parseOrderStatus(status));
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    public OrderResponse updatePaidStatus(String orderId, boolean paid) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        order.setPaid(paid);
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    public OrderResponse cancelCustomerOrder(UserAccount customer, String orderId) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot cancel this order.");
        }
        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only preparing orders can be cancelled.");
        }
        order.setStatus(OrderStatus.CANCELLED);
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    public OrderResponse updatePosOrder(UserAccount cashier, String orderId, PosOrderRequest request) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only orders in Preparing status can be edited.");
        }
        List<MenuItemQuantity> newItems = resolveItems(request.items());
        if (newItems.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty.");
        Coupon coupon = StringUtils.hasText(request.couponCode()) ? catalogService.findActiveCoupon(request.couponCode()) : null;
        UserAccount customer = findCustomerByName(request.customerName());
        List<PricingLineItem> pricingItems = newItems.stream()
            .map(item -> new PricingLineItem(item.menuItem().getCategory(), effectivePrice(item.menuItem()), item.quantity()))
            .toList();
        if (coupon != null) {
            pricingService.validateCoupon(pricingItems, coupon);
        }
        CartTotals totals = pricingService.calculate(pricingItems, coupon, customer, false);
        order.setCustomer(customer);
        order.setCustomerName(customer != null ? customer.getName() : (StringUtils.hasText(request.customerName()) ? request.customerName().trim() : "Walk-in Customer"));
        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setDelivery(totals.delivery());
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        order.setCouponCode(coupon != null ? coupon.getCode() : null);
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.setCashier(cashier);
        order.setCashierName(cashier.getName());
        order.setDeliveryName(order.getCustomerName());
        order.getItems().clear();
        newItems.forEach(item -> order.getItems().add(toOrderItem(order, item.menuItem(), item.quantity())));
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    public OrderResponse cancelCashierOrder(String orderId) {
        ShopOrder order = shopOrderRepository.findById(orderId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found."));
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order can no longer be cancelled.");
        }
        order.setStatus(OrderStatus.CANCELLED);
        return apiMapper.toOrder(shopOrderRepository.save(order));
    }

    private void validateCheckoutRequest(CheckoutRequest request) {
        if (!StringUtils.hasText(request.deliveryName()) || !StringUtils.hasText(request.phone()) || !StringUtils.hasText(request.address())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please fill in all delivery details");
        }
        if ("Card".equalsIgnoreCase(request.paymentMethod())) {
            String cardNumber = request.cardNumber() != null ? request.cardNumber().replace(" ", "") : "";
            if (cardNumber.length() < 16 || !StringUtils.hasText(request.expiry()) || request.cvv() == null || request.cvv().length() < 3) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter valid card details");
            }
        }
    }

    private OrderItem toOrderItem(ShopOrder order, MenuItem menuItem, int quantity) {
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setMenuItemId(menuItem.getId());
        item.setName(menuItem.getName());
        item.setCategory(menuItem.getCategory());
        item.setIcon(menuItem.getIcon());
        item.setPrice(effectivePrice(menuItem));
        item.setQuantity(quantity);
        return item;
    }

    private List<MenuItemQuantity> resolveItems(List<PosOrderItemRequest> requestItems) {
        return requestItems.stream()
            .map(item -> {
                ValidationRules.requireQuantity(item.qty());
                return new MenuItemQuantity(catalogService.getMenuItem(item.id()), item.qty());
            })
            .toList();
    }

    private UserAccount findCustomerByName(String customerName) {
        if (!StringUtils.hasText(customerName)) {
            return null;
        }
        return userAccountRepository.findByNameIgnoreCaseAndRole(customerName.trim(), Role.CUSTOMER).orElse(null);
    }

    private BigDecimal effectivePrice(MenuItem menuItem) {
        return MoneyUtils.subtractDiscount(menuItem.getPrice(), menuItem.getDiscount());
    }

    private boolean includesDelivery(ShopOrder order) {
        return order.getDelivery() != null && order.getDelivery().compareTo(MoneyUtils.ZERO) > 0;
    }

    private PaymentMethod parsePaymentMethod(String value) {
        return switch (value.toLowerCase()) {
            case "cash" -> PaymentMethod.CASH;
            case "card" -> PaymentMethod.CARD;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported payment method");
        };
    }

    private OrderStatus parseOrderStatus(String value) {
        return switch (value.toLowerCase()) {
            case "preparing" -> OrderStatus.PREPARING;
            case "ready" -> OrderStatus.READY;
            case "delivered" -> OrderStatus.DELIVERED;
            case "cancelled" -> OrderStatus.CANCELLED;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported order status");
        };
    }
}

record MenuItemQuantity(MenuItem menuItem, int quantity) {
}
