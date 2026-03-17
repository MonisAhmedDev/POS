package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.CouponStatus;
import com.ferozkhandev.pos.DomainEnums.Role;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserAccountRepository extends JpaRepository<UserAccount, String> {
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<UserAccount> findByRoleOrderByCreatedAtDesc(Role role);

    Optional<UserAccount> findByNameIgnoreCaseAndRole(String name, Role role);
}

interface MenuItemRepository extends JpaRepository<MenuItem, String> {
    List<MenuItem> findAllByOrderByCreatedAtAsc();
}

interface CouponRepository extends JpaRepository<Coupon, String> {
    Optional<Coupon> findByCodeIgnoreCase(String code);

    List<Coupon> findAllByOrderByCreatedAtDesc();

    List<Coupon> findByStatus(CouponStatus status);
}

interface CartRepository extends JpaRepository<Cart, String> {
    @EntityGraph(attributePaths = {"items", "items.menuItem", "coupon"})
    Optional<Cart> findByUser_Id(String userId);
}

interface ShopOrderRepository extends JpaRepository<ShopOrder, String> {
    @EntityGraph(attributePaths = {"items"})
    List<ShopOrder> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"items"})
    List<ShopOrder> findByCustomer_IdOrderByCreatedAtDesc(String customerId);

    void deleteByCustomer_Id(String customerId);
}

interface FeedbackEntryRepository extends JpaRepository<FeedbackEntry, String> {
    List<FeedbackEntry> findAllByOrderByCreatedAtDesc();

    List<FeedbackEntry> findByCustomer_IdOrderByCreatedAtDesc(String customerId);

    boolean existsByOrder_Id(String orderId);

    void deleteByCustomer_Id(String customerId);
}

interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}

interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenId(String tokenId);

    void deleteByExpiresAtBefore(Instant instant);
}
