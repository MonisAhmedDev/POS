package com.ferozkhandev.pos;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CouponRepository couponRepository;
    private final CatalogService catalogService;
    private final PricingService pricingService;
    private final ApiMapper apiMapper;

    public CartResponse getCart(UserAccount user) {
        Cart cart = getOrCreateCart(user);
        normalizeCoupon(cart);
        cartRepository.save(cart);
        return apiMapper.toCart(cart, totals(cart));
    }

    public CartResponse addItem(UserAccount user, CartItemRequest request) {
        Cart cart = getOrCreateCart(user);
        ValidationRules.requireQuantity(request.quantity());
        MenuItem menuItem = catalogService.getMenuItem(request.menuItemId());
        CartItem existing = cart.getItems().stream()
            .filter(item -> item.getMenuItem().getId().equals(menuItem.getId()))
            .findFirst()
            .orElse(null);
        if (existing == null) {
            CartItem item = new CartItem();
            item.setCart(cart);
            item.setMenuItem(menuItem);
            item.setQuantity(request.quantity());
            cart.getItems().add(item);
        } else {
            int quantity = existing.getQuantity() + request.quantity();
            ValidationRules.requireQuantity(quantity);
            existing.setQuantity(quantity);
        }
        normalizeCoupon(cart);
        cartRepository.save(cart);
        return apiMapper.toCart(cart, totals(cart));
    }

    public CartResponse updateItem(UserAccount user, String menuItemId, QuantityUpdateRequest request) {
        Cart cart = getOrCreateCart(user);
        ValidationRules.requireQuantity(request.quantity());
        CartItem item = cart.getItems().stream()
            .filter(entry -> entry.getMenuItem().getId().equals(menuItemId))
            .findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart item not found."));
        item.setQuantity(request.quantity());
        normalizeCoupon(cart);
        cartRepository.save(cart);
        return apiMapper.toCart(cart, totals(cart));
    }

    public CartResponse removeItem(UserAccount user, String menuItemId) {
        Cart cart = getOrCreateCart(user);
        cart.getItems().removeIf(item -> item.getMenuItem().getId().equals(menuItemId));
        normalizeCoupon(cart);
        cartRepository.save(cart);
        return apiMapper.toCart(cart, totals(cart));
    }

    public CartResponse applyCoupon(UserAccount user, CouponApplyRequest request) {
        Cart cart = getOrCreateCart(user);
        Coupon coupon = catalogService.findActiveCoupon(request.code());
        pricingService.validateCoupon(lines(cart), coupon);
        cart.setCoupon(coupon);
        cartRepository.save(cart);
        return apiMapper.toCart(cart, totals(cart));
    }

    public CartResponse removeCoupon(UserAccount user) {
        Cart cart = getOrCreateCart(user);
        cart.setCoupon(null);
        cartRepository.save(cart);
        return apiMapper.toCart(cart, totals(cart));
    }

    public void clear(UserAccount user) {
        Cart cart = getOrCreateCart(user);
        cart.getItems().clear();
        cart.setCoupon(null);
        cartRepository.save(cart);
    }

    public Cart getOrCreateCart(UserAccount user) {
        return cartRepository.findByUser_Id(user.getId()).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        });
    }

    public CartTotals totals(Cart cart) {
        return pricingService.calculate(lines(cart), cart.getCoupon(), cart.getUser(), true);
    }

    private List<PricingLineItem> lines(Cart cart) {
        return cart.getItems().stream()
            .map(item -> new PricingLineItem(
                item.getMenuItem().getCategory(),
                MoneyUtils.subtractDiscount(item.getMenuItem().getPrice(), item.getMenuItem().getDiscount()),
                item.getQuantity()
            ))
            .toList();
    }

    private void normalizeCoupon(Cart cart) {
        if (cart.getCoupon() == null) {
            return;
        }
        try {
            pricingService.validateCoupon(lines(cart), cart.getCoupon());
        } catch (ApiException ex) {
            cart.setCoupon(null);
        }
    }
}
