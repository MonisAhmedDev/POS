package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.OrderStatus;
import com.ferozkhandev.pos.DomainEnums.PaymentMethod;
import com.ferozkhandev.pos.DomainEnums.Role;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
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
        List<PricingLineItem> pricingItems = pricingItems(items);
        if (coupon != null) {
            pricingService.validateCoupon(pricingItems, coupon);
        }
        CartTotals totals = pricingService.calculate(
            pricingItems,
            coupon,
            customer,
            null,
            MoneyUtils.ZERO,
            false
        );
        ManualDiscount manualDiscount = summarizeItemDiscounts(items);
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
        order.setManualDiscountType(manualDiscount.type());
        order.setManualDiscountValue(manualDiscount.value());
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.setDeliveryName(customerName);
        order.setPhone(null);
        order.setAddress("In-store");
        order.setStatus(OrderStatus.PREPARING);
        order.setItems(new ArrayList<>());
        items.forEach(item -> order.getItems().add(toOrderItem(order, item)));
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
        List<PricingLineItem> pricingItems = pricingItems(newItems);
        if (coupon != null) {
            pricingService.validateCoupon(pricingItems, coupon);
        }
        CartTotals totals = pricingService.calculate(
            pricingItems,
            coupon,
            customer,
            null,
            MoneyUtils.ZERO,
            includesDelivery(order)
        );
        ManualDiscount manualDiscount = summarizeItemDiscounts(newItems);
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
        order.setManualDiscountType(manualDiscount.type());
        order.setManualDiscountValue(manualDiscount.value());
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.getItems().clear();
        newItems.forEach(item -> order.getItems().add(toOrderItem(order, item)));
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
        List<PricingLineItem> pricingItems = pricingItems(newItems);
        if (coupon != null) {
            pricingService.validateCoupon(pricingItems, coupon);
        }
        CartTotals totals = pricingService.calculate(
            pricingItems,
            coupon,
            customer,
            null,
            MoneyUtils.ZERO,
            false
        );
        ManualDiscount manualDiscount = summarizeItemDiscounts(newItems);
        order.setCustomer(customer);
        order.setCustomerName(customer != null ? customer.getName() : (StringUtils.hasText(request.customerName()) ? request.customerName().trim() : "Walk-in Customer"));
        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setDelivery(totals.delivery());
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        order.setCouponCode(coupon != null ? coupon.getCode() : null);
        order.setManualDiscountType(manualDiscount.type());
        order.setManualDiscountValue(manualDiscount.value());
        order.setPaymentMethod(parsePaymentMethod(request.paymentMethod()));
        order.setCashier(cashier);
        order.setCashierName(cashier.getName());
        order.setDeliveryName(order.getCustomerName());
        order.getItems().clear();
        newItems.forEach(item -> order.getItems().add(toOrderItem(order, item)));
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
        return toOrderItem(order, new MenuItemQuantity(menuItem, quantity, new ManualDiscount(null, MoneyUtils.ZERO)));
    }

    private OrderItem toOrderItem(ShopOrder order, MenuItemQuantity menuItemQuantity) {
        MenuItem menuItem = menuItemQuantity.menuItem();
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setMenuItemId(menuItem.getId());
        item.setName(menuItem.getName());
        item.setCategory(menuItem.getCategory());
        item.setIcon(menuItem.getIcon());
        item.setPrice(effectivePrice(menuItem));
        item.setQuantity(menuItemQuantity.quantity());
        item.setManualDiscountType(menuItemQuantity.discount().type());
        item.setManualDiscountValue(menuItemQuantity.discount().value());
        item.setDiscount(calculateItemDiscount(item.getPrice(), menuItemQuantity.quantity(), menuItemQuantity.discount()));
        return item;
    }

    private List<MenuItemQuantity> resolveItems(List<PosOrderItemRequest> requestItems) {
        return requestItems.stream()
            .map(item -> {
                ValidationRules.requireQuantity(item.qty());
                return new MenuItemQuantity(
                    catalogService.getMenuItem(item.id()),
                    item.qty(),
                    resolveManualDiscount(item.discountType(), item.discountValue(), null, MoneyUtils.ZERO)
                );
            })
            .toList();
    }

    private List<PricingLineItem> pricingItems(List<MenuItemQuantity> items) {
        return items.stream()
            .map(item -> {
                BigDecimal price = effectivePrice(item.menuItem());
                return new PricingLineItem(
                    item.menuItem().getCategory(),
                    price,
                    item.quantity(),
                    calculateItemDiscount(price, item.quantity(), item.discount())
                );
            })
            .toList();
    }

    private BigDecimal calculateItemDiscount(BigDecimal unitPrice, int quantity, ManualDiscount discount) {
        if (discount.type() == null || discount.value() == null || discount.value().compareTo(MoneyUtils.ZERO) <= 0) {
            return MoneyUtils.ZERO;
        }
        BigDecimal lineSubtotal = MoneyUtils.multiply(unitPrice, quantity);
        BigDecimal amount = discount.type() == DiscountType.PERCENTAGE
            ? lineSubtotal.multiply(discount.value()).divide(new BigDecimal("100"))
            : unitPrice.min(discount.value()).multiply(BigDecimal.valueOf(quantity));
        return MoneyUtils.money(amount.min(lineSubtotal));
    }

    private ManualDiscount summarizeItemDiscounts(List<MenuItemQuantity> items) {
        DiscountType firstType = null;
        BigDecimal total = MoneyUtils.ZERO;
        for (MenuItemQuantity item : items) {
            BigDecimal discount = calculateItemDiscount(effectivePrice(item.menuItem()), item.quantity(), item.discount());
            if (discount.compareTo(MoneyUtils.ZERO) > 0 && firstType == null) {
                firstType = item.discount().type();
            }
            total = total.add(discount);
        }
        return new ManualDiscount(firstType, MoneyUtils.money(total));
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

    private ManualDiscount resolveManualDiscount(
        String requestedType,
        BigDecimal requestedValue,
        DiscountType fallbackType,
        BigDecimal fallbackValue
    ) {
        if (requestedType == null && requestedValue == null && fallbackType != null) {
            return new ManualDiscount(fallbackType, MoneyUtils.money(fallbackValue != null ? fallbackValue : MoneyUtils.ZERO));
        }
        if (!StringUtils.hasText(requestedType) || "none".equalsIgnoreCase(requestedType)) {
            return new ManualDiscount(null, MoneyUtils.ZERO);
        }
        DiscountType type = parseDiscountType(requestedType);
        BigDecimal value = requestedValue != null ? MoneyUtils.money(requestedValue) : MoneyUtils.ZERO;
        if (value.compareTo(MoneyUtils.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Discount value cannot be negative.");
        }
        if (type == DiscountType.PERCENTAGE && value.compareTo(new BigDecimal("100")) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Percentage discount cannot exceed 100.");
        }
        if (value.compareTo(MoneyUtils.ZERO) == 0) {
            return new ManualDiscount(null, MoneyUtils.ZERO);
        }
        return new ManualDiscount(type, value);
    }

    private DiscountType parseDiscountType(String value) {
        return switch (value.toLowerCase()) {
            case "percentage" -> DiscountType.PERCENTAGE;
            case "fixed" -> DiscountType.FIXED;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported discount type");
        };
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

record MenuItemQuantity(MenuItem menuItem, int quantity, ManualDiscount discount) {
}

record ManualDiscount(DiscountType type, BigDecimal value) {
}
