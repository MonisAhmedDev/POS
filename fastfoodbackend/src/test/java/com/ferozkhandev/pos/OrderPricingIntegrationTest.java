package com.ferozkhandev.pos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ferozkhandev.pos.DomainEnums.DiscountType;
import com.ferozkhandev.pos.DomainEnums.Role;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrderPricingIntegrationTest {

    @Autowired
    private CartService cartService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Test
    void cartTotalsApplyMenuAndCustomerDiscountsWithZeroTaxByDefault() {
        UserAccount customer = saveUser("Sara Customer", "sara@example.com", Role.CUSTOMER);
        customer.setRestaurantDiscountType(DiscountType.FIXED);
        customer.setRestaurantDiscountValue(new BigDecimal("5.00"));
        customer = userAccountRepository.save(customer);

        MenuItem burger = saveMenuItem("Smash Burger", "Burgers", "20.00", "2.00");

        CartResponse cart = cartService.addItem(customer, new CartItemRequest(burger.getId(), 2));

        assertThat(cart.items()).hasSize(1);
        assertThat(cart.items().getFirst().price()).isEqualByComparingTo("18.00");
        assertThat(cart.subtotal()).isEqualByComparingTo("36.00");
        assertThat(cart.discount()).isEqualByComparingTo("5.00");
        assertThat(cart.tax()).isEqualByComparingTo("0.00");
        assertThat(cart.total()).isEqualByComparingTo("32.99");
    }

    @Test
    void quantitiesCannotExceedTwoThousandPerItem() {
        UserAccount customer = saveUser("Limit Customer", "limit@example.com", Role.CUSTOMER);
        MenuItem fries = saveMenuItem("Loaded Fries", "Sides", "8.00", "0.00");

        cartService.addItem(customer, new CartItemRequest(fries.getId(), 2000));

        assertThatThrownBy(() -> cartService.addItem(customer, new CartItemRequest(fries.getId(), 1)))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("between 1 and 2000");
    }

    @Test
    void adminCanEditActiveCustomerOrdersAndDeliveryChargesStayIntact() {
        UserAccount customer = saveUser("Amna Buyer", "amna@example.com", Role.CUSTOMER);
        MenuItem pizza = saveMenuItem("Tikka Pizza", "Pizzas", "10.00", "0.00");
        MenuItem drink = saveMenuItem("Mint Lemon", "Drinks", "8.00", "2.00");

        cartService.addItem(customer, new CartItemRequest(pizza.getId(), 2));
        OrderResponse original = orderService.checkout(customer, new CheckoutRequest(
            "Amna Buyer",
            "03001234567",
            "Model Town",
            "Cash",
            null,
            null,
            null
        ));

        OrderResponse updated = orderService.updateAdminOrder(original.id(), new PosOrderRequest(
            customer.getName(),
            null,
            "Card",
            List.of(new PosOrderItemRequest(drink.getId(), 3))
        ));

        assertThat(updated.status()).isEqualTo("Preparing");
        assertThat(updated.paymentMethod()).isEqualTo("Card");
        assertThat(updated.address()).isEqualTo("Model Town");
        assertThat(updated.delivery()).isEqualByComparingTo("1.99");
        assertThat(updated.subtotal()).isEqualByComparingTo("18.00");
        assertThat(updated.total()).isEqualByComparingTo("19.99");
        assertThat(updated.items()).singleElement().satisfies(item -> {
            assertThat(item.name()).isEqualTo("Mint Lemon");
            assertThat(item.qty()).isEqualTo(3);
            assertThat(item.price()).isEqualByComparingTo("6.00");
        });
    }

    @Test
    void posOrdersAutomaticallyUseNamedCustomerDiscounts() {
        UserAccount customer = saveUser("Ali Loyal", "ali@example.com", Role.CUSTOMER);
        customer.setRestaurantDiscountType(DiscountType.PERCENTAGE);
        customer.setRestaurantDiscountValue(new BigDecimal("10.00"));
        customer = userAccountRepository.save(customer);
        UserAccount cashier = saveUser("Cashier One", "cashier@example.com", Role.CASHIER);
        MenuItem burger = saveMenuItem("Double Patty", "Burgers", "12.00", "2.00");

        OrderResponse order = orderService.createPosOrder(cashier, new PosOrderRequest(
            customer.getName(),
            null,
            "Cash",
            List.of(new PosOrderItemRequest(burger.getId(), 2))
        ));

        assertThat(order.customerName()).isEqualTo("Ali Loyal");
        assertThat(order.subtotal()).isEqualByComparingTo("20.00");
        assertThat(order.discount()).isEqualByComparingTo("2.00");
        assertThat(order.tax()).isEqualByComparingTo("0.00");
        assertThat(order.total()).isEqualByComparingTo("18.00");
    }

    private UserAccount saveUser(String name, String email, Role role) {
        UserAccount user = new UserAccount();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash("encoded-password");
        user.setRole(role);
        user.setSuperAdmin(false);
        user.setRestaurantDiscountValue(BigDecimal.ZERO);
        return userAccountRepository.save(user);
    }

    private MenuItem saveMenuItem(String name, String category, String price, String discount) {
        MenuItem item = new MenuItem();
        item.setName(name);
        item.setCategory(category);
        item.setPrice(new BigDecimal(price));
        item.setDiscount(new BigDecimal(discount));
        item.setDescription(name + " description");
        item.setIcon("🍔");
        item.setAvailable(true);
        return menuItemRepository.save(item);
    }
}
