package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.CouponStatus;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
import com.ferozkhandev.pos.DomainEnums.Role;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeederService {

    private final UserAccountRepository userAccountRepository;
    private final MenuItemRepository menuItemRepository;
    private final CouponRepository couponRepository;
    private final SettingsService settingsService;
    private final AppProperties appProperties;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaults() {
        seedAdmin();
        seedMenu();
        seedCoupons();
        if (settingsService.getCurrency() == null || settingsService.getCurrency().isBlank()) {
            settingsService.setCurrency(SettingsService.DEFAULT_CURRENCY);
        } else if (!settingsService.getCurrency().equals(SettingsService.DEFAULT_CURRENCY) && settingsService.getCurrency().isBlank()) {
            settingsService.setCurrency(SettingsService.DEFAULT_CURRENCY);
        }

        BigDecimal taxRate = settingsService.getTaxRate();
        if (taxRate.compareTo(new BigDecimal("0.08")) == 0 || taxRate.compareTo(new BigDecimal("8.00")) == 0) {
            settingsService.setTaxRate(new BigDecimal(SettingsService.DEFAULT_TAX_RATE));
        }
    }

    private void seedAdmin() {
        String email = appProperties.getBootstrapAdmin().getEmail().trim().toLowerCase();
        UserAccount admin = userAccountRepository.findByEmailIgnoreCase(email).orElseGet(UserAccount::new);
        admin.setName(appProperties.getBootstrapAdmin().getName());
        admin.setEmail(email);
        if (admin.getPasswordHash() == null || admin.getPasswordHash().isBlank()) {
            admin.setPasswordHash(passwordEncoder.encode(appProperties.getBootstrapAdmin().getPassword()));
        }
        admin.setRole(Role.ADMIN);
        admin.setSuperAdmin(true);
        userAccountRepository.save(admin);
    }

    private void seedMenu() {
        if (menuItemRepository.count() > 0) {
            return;
        }
        defaultMenuItems().forEach(menuItemRepository::save);
    }

    private void seedCoupons() {
        if (couponRepository.findByCodeIgnoreCase("WELCOME10").isPresent()) {
            return;
        }
        Coupon coupon = new Coupon();
        coupon.setCode("WELCOME10");
        coupon.setDiscountType(DiscountType.PERCENTAGE);
        coupon.setDiscountValue(new BigDecimal("10.00"));
        coupon.setMinOrderAmount(BigDecimal.ZERO.setScale(2));
        coupon.setApplicableCategory(null);
        coupon.setStatus(CouponStatus.ACTIVE);
        couponRepository.save(coupon);
    }

    private List<MenuItem> defaultMenuItems() {
        return List.of(
            menu("Classic Burger", "Burgers", "8.99", "Juicy beef patty with lettuce, tomato & special sauce", "🍔"),
            menu("Double Smash Burger", "Burgers", "12.99", "Double smashed patties, melted cheese & caramelized onions", "🍔"),
            menu("Crispy Chicken Burger", "Burgers", "9.99", "Crispy fried chicken fillet with coleslaw and mayo", "🍗"),
            menu("Zinger Burger", "Burgers", "10.99", "Spicy fried chicken with jalapeños and sriracha mayo", "🔥"),
            menu("Pepperoni Pizza", "Pizzas", "14.99", "Classic pepperoni on mozzarella & tomato base", "🍕"),
            menu("BBQ Chicken Pizza", "Pizzas", "16.99", "Smoky BBQ sauce, grilled chicken, red onion & peppers", "🍕"),
            menu("Margherita Pizza", "Pizzas", "12.99", "Fresh tomato, mozzarella & basil leaves", "🍕"),
            menu("Fried Chicken (3 pcs)", "Sides", "7.99", "3 pieces of golden crispy fried chicken", "🍗"),
            menu("French Fries (Large)", "Sides", "3.99", "Crispy golden fries with your choice of dip", "🍟"),
            menu("Onion Rings", "Sides", "4.99", "Crispy beer-battered onion rings", "🧅"),
            menu("Chocolate Lava Cake", "Desserts", "5.99", "Warm chocolate cake with molten center & vanilla ice cream", "🎂"),
            menu("Ice Cream Sundae", "Desserts", "4.49", "Creamy vanilla soft serve with hot fudge & whipped cream", "🍨"),
            menu("Soda (Large)", "Drinks", "2.99", "Chilled fizzy drink — Coke, Pepsi, Sprite, or Fanta", "🥤"),
            menu("Chocolate Milkshake", "Drinks", "4.99", "Thick and creamy chocolate milkshake", "🥛"),
            menu("Fresh Juice", "Drinks", "3.49", "Freshly squeezed orange or mango juice", "🍊")
        );
    }

    private MenuItem menu(String name, String category, String price, String description, String icon) {
        MenuItem item = new MenuItem();
        item.setName(name);
        item.setCategory(category);
        item.setPrice(new BigDecimal(price));
        item.setDescription(description);
        item.setIcon(icon);
        item.setAvailable(true);
        return item;
    }
}
