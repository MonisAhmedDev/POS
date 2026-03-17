package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.CouponStatus;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
import com.ferozkhandev.pos.DomainEnums.OrderStatus;
import com.ferozkhandev.pos.DomainEnums.PaymentMethod;
import com.ferozkhandev.pos.DomainEnums.Role;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class BackupService {

    private final UserAccountRepository userAccountRepository;
    private final MenuItemRepository menuItemRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final FeedbackEntryRepository feedbackEntryRepository;
    private final CouponRepository couponRepository;
    private final CartRepository cartRepository;
    private final AppSettingRepository appSettingRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ApiMapper apiMapper;
    private final SettingsService settingsService;
    private final StorageService storageService;
    private final SeederService seederService;

    public BackupSnapshotResponse exportSnapshot() {
        List<BackupUserRecord> users = userAccountRepository.findAll().stream()
            .map(user -> new BackupUserRecord(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole().name().toLowerCase(),
                user.isSuperAdmin(),
                user.getCreatedAt()
            ))
            .toList();
        List<BackupMenuItemRecord> items = menuItemRepository.findAllByOrderByCreatedAtAsc().stream()
            .map(item -> new BackupMenuItemRecord(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getPrice(),
                item.getDescription(),
                item.getIcon(),
                item.isAvailable(),
                item.getCreatedAt(),
                storageService.readBase64(item.getImagePath())
            ))
            .toList();
        List<BackupOrderRecord> orders = shopOrderRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(order -> new BackupOrderRecord(
                order.getId(),
                order.getCustomer() != null ? order.getCustomer().getId() : null,
                order.getCustomerName(),
                order.getCashier() != null ? order.getCashier().getId() : null,
                order.getCashierName(),
                order.getItems().stream().map(apiMapper::toOrderItem).toList(),
                order.getSubtotal(),
                order.getDiscount(),
                order.getDelivery(),
                order.getTax(),
                order.getTotal(),
                order.getCouponCode(),
                order.getPaymentMethod().name(),
                order.getDeliveryName(),
                order.getPhone(),
                order.getAddress(),
                order.getStatus().name(),
                order.getCreatedAt()
            ))
            .toList();
        CartBackupRecord carts = new CartBackupRecord(cartRepository.findAll().stream()
            .map(cart -> new CartUserRecord(
                cart.getUser().getId(),
                cart.getCoupon() != null ? cart.getCoupon().getCode() : null,
                cart.getItems().stream()
                    .map(item -> new CartItemResponse(
                        item.getMenuItem().getId(),
                        item.getMenuItem().getName(),
                        item.getMenuItem().getPrice(),
                        item.getMenuItem().getCategory(),
                        item.getMenuItem().getIcon(),
                        item.getQuantity()
                    ))
                    .toList()
            ))
            .toList());
        return new BackupSnapshotResponse(
            "2.0",
            Instant.now(),
            users,
            items,
            orders,
            feedbackEntryRepository.findAllByOrderByCreatedAtDesc().stream().map(apiMapper::toFeedback).toList(),
            couponRepository.findAllByOrderByCreatedAtDesc().stream().map(apiMapper::toCoupon).toList(),
            carts,
            settingsService.getCurrency()
        );
    }

    public ErrorResponse clearAll() {
        clearAllData();
        seederService.seedDefaults();
        return new ErrorResponse("All data cleared");
    }

    public ErrorResponse importSnapshot(BackupSnapshotResponse snapshot) {
        clearAllData();
        Map<String, UserAccount> usersById = new HashMap<>();
        snapshot.users().forEach(record -> {
            UserAccount user = new UserAccount();
            user.setId(record.id());
            user.setName(record.name());
            user.setEmail(record.email().toLowerCase());
            user.setPasswordHash(record.passwordHash());
            user.setRole(Role.valueOf(record.role().toUpperCase()));
            user.setSuperAdmin(record.isSuperAdmin());
            usersById.put(user.getId(), userAccountRepository.save(user));
        });

        Map<String, MenuItem> itemsById = new HashMap<>();
        snapshot.items().forEach(record -> {
            MenuItem item = new MenuItem();
            item.setId(record.id());
            item.setName(record.name());
            item.setCategory(record.category());
            item.setPrice(record.price());
            item.setDescription(record.description());
            item.setIcon(record.icon());
            item.setAvailable(record.available());
            item.setImagePath(storageService.writeBase64(record.imageBase64(), null));
            itemsById.put(item.getId(), menuItemRepository.save(item));
        });

        Map<String, Coupon> couponsByCode = new HashMap<>();
        snapshot.coupons().forEach(record -> {
            Coupon coupon = new Coupon();
            coupon.setId(record.id());
            coupon.setCode(record.code());
            coupon.setDiscountType(DiscountType.valueOf(record.discountType().toUpperCase()));
            coupon.setDiscountValue(record.discountValue());
            coupon.setMinOrderAmount(record.minOrderAttr());
            coupon.setApplicableCategory(record.applicableCategory());
            coupon.setStatus(CouponStatus.valueOf(record.status().toUpperCase()));
            couponsByCode.put(coupon.getCode(), couponRepository.save(coupon));
        });

        Map<String, ShopOrder> ordersById = new HashMap<>();
        snapshot.orders().forEach(record -> {
            ShopOrder order = new ShopOrder();
            order.setId(record.id());
            order.setCustomer(usersById.get(record.customerId()));
            order.setCustomerName(record.customerName());
            order.setCashier(usersById.get(record.cashierId()));
            order.setCashierName(record.cashierName());
            order.setSubtotal(record.subtotal());
            order.setDiscount(record.discount());
            order.setDelivery(record.delivery());
            order.setTax(record.tax());
            order.setTotal(record.total());
            order.setCouponCode(record.couponCode());
            order.setPaymentMethod(PaymentMethod.valueOf(record.paymentMethod().toUpperCase()));
            order.setDeliveryName(record.deliveryName());
            order.setPhone(record.phone());
            order.setAddress(record.address());
            order.setStatus(OrderStatus.valueOf(record.status().toUpperCase()));
            order.setItems(new ArrayList<>(record.items().stream().map(itemRecord -> {
                OrderItem item = new OrderItem();
                item.setOrder(order);
                item.setMenuItemId(itemRecord.id());
                item.setName(itemRecord.name());
                item.setCategory(itemRecord.category());
                item.setIcon(itemRecord.icon());
                item.setPrice(itemRecord.price());
                item.setQuantity(itemRecord.qty());
                return item;
            }).toList()));
            ordersById.put(order.getId(), shopOrderRepository.save(order));
        });

        snapshot.feedback().forEach(record -> {
            FeedbackEntry entry = new FeedbackEntry();
            entry.setId(record.id());
            entry.setCustomer(usersById.get(record.customerId()));
            entry.setCustomerName(record.customerName());
            entry.setOrder(ordersById.get(record.orderId()));
            entry.setOrderRef(record.orderRef());
            entry.setRating(record.rating());
            entry.setComment(record.comment());
            feedbackEntryRepository.save(entry);
        });

        if (snapshot.carts() != null && snapshot.carts().carts() != null) {
            snapshot.carts().carts().forEach(record -> {
                UserAccount user = usersById.get(record.userId());
                if (user == null) {
                    return;
                }
                Cart cart = new Cart();
                cart.setUser(user);
                cart.setCoupon(record.couponCode() != null ? couponsByCode.get(record.couponCode()) : null);
                cart.setItems(new ArrayList<>(record.items().stream().map(itemRecord -> {
                    CartItem item = new CartItem();
                    item.setCart(cart);
                    item.setMenuItem(itemsById.get(itemRecord.id()));
                    item.setQuantity(itemRecord.qty());
                    return item;
                }).toList()));
                cartRepository.save(cart);
            });
        }

        settingsService.setCurrency(snapshot.currency() != null ? snapshot.currency() : SettingsService.DEFAULT_CURRENCY);
        if (userAccountRepository.findByRoleOrderByCreatedAtDesc(Role.ADMIN).stream().noneMatch(UserAccount::isSuperAdmin)) {
            seederService.seedDefaults();
        }
        return new ErrorResponse("Data imported");
    }

    private void clearAllData() {
        refreshTokenRepository.deleteAll();
        feedbackEntryRepository.deleteAll();
        shopOrderRepository.deleteAll();
        cartRepository.deleteAll();
        couponRepository.deleteAll();
        menuItemRepository.deleteAll();
        appSettingRepository.deleteAll();
        userAccountRepository.deleteAll();
        storageService.clearAll();
    }
}
