package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.DiscountType;
import com.ferozkhandev.pos.DomainEnums.Role;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
@RequiredArgsConstructor
public class UserManagementService {

    private final UserAccountRepository userAccountRepository;
    private final ShopOrderRepository shopOrderRepository;
    private final FeedbackEntryRepository feedbackEntryRepository;
    private final CartRepository cartRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiMapper apiMapper;

    public AdminAccountResponse createCashier(StaffCreateRequest request) {
        return apiMapper.toAccount(createUser(request, Role.CASHIER, false));
    }

    public AdminAccountResponse createAdmin(StaffCreateRequest request) {
        return apiMapper.toAccount(createUser(request, Role.ADMIN, false));
    }

    public AdminAccountResponse createCustomer(StaffCreateRequest request) {
        return apiMapper.toAccount(createUser(request, Role.CUSTOMER, false));
    }

    public AdminAccountResponse updateCustomer(String userId, StaffUpdateRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found."));
        if (user.getRole() != Role.CUSTOMER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only customer accounts can be updated here.");
        }
        if (userAccountRepository.findByEmailIgnoreCase(request.email().trim())
            .filter(existing -> !existing.getId().equals(user.getId()))
            .isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        if (StringUtils.hasText(request.password())) {
            if (request.password().length() < 6) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        return apiMapper.toAccount(userAccountRepository.save(user));
    }

    public AdminAccountResponse updateCustomerDiscount(String userId, CustomerDiscountUpdateRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found."));
        if (user.getRole() != Role.CUSTOMER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only customers can receive restaurant discounts.");
        }
        applyRestaurantDiscount(user, request.discountType(), request.discountValue());
        return apiMapper.toAccount(userAccountRepository.save(user));
    }

    public AdminAccountResponse updateCurrentProfile(UserAccount user, ProfileUpdateRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (userAccountRepository.findByEmailIgnoreCase(request.email().trim())
            .filter(existing -> !existing.getId().equals(user.getId()))
            .isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        if (StringUtils.hasText(request.newPassword())) {
            if (request.newPassword().length() < 6) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");
            }
            if (!request.newPassword().equals(request.confirmPassword())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Passwords do not match");
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }
        return apiMapper.toAccount(userAccountRepository.save(user));
    }

    public AdminAccountResponse updateStaff(String userId, StaffUpdateRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found."));
        if (user.isSuperAdmin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The Chief Admin account cannot be edited here.");
        }
        if (userAccountRepository.findByEmailIgnoreCase(request.email().trim())
            .filter(existing -> !existing.getId().equals(user.getId()))
            .isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        if (StringUtils.hasText(request.password())) {
            if (request.password().length() < 6) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        return apiMapper.toAccount(userAccountRepository.save(user));
    }

    public void deleteStaff(String userId) {
        UserAccount user = userAccountRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found."));
        if (user.isSuperAdmin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The Chief Admin account cannot be deleted.");
        }
        userAccountRepository.delete(user);
    }

    public void deleteCustomer(String userId) {
        UserAccount user = userAccountRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found."));
        if (user.getRole() != Role.CUSTOMER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only customers can be deleted here.");
        }
        feedbackEntryRepository.deleteByCustomer_Id(userId);
        shopOrderRepository.deleteByCustomer_Id(userId);
        cartRepository.findByUser_Id(userId).ifPresent(cartRepository::delete);
        userAccountRepository.delete(user);
    }

    public List<AdminAccountResponse> listAdmins() {
        return userAccountRepository.findByRoleOrderByCreatedAtDesc(Role.ADMIN).stream().map(apiMapper::toAccount).toList();
    }

    public List<AdminAccountResponse> listCashiers() {
        return userAccountRepository.findByRoleOrderByCreatedAtDesc(Role.CASHIER).stream().map(apiMapper::toAccount).toList();
    }

    public List<AdminAccountResponse> listCashierCustomers() {
        return userAccountRepository.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).stream().map(apiMapper::toAccount).toList();
    }

    public List<CustomerSummaryResponse> listCustomers() {
        List<UserAccount> customers = userAccountRepository.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER);
        List<ShopOrder> orders = shopOrderRepository.findAllByOrderByCreatedAtDesc();
        List<FeedbackEntry> feedback = feedbackEntryRepository.findAllByOrderByCreatedAtDesc();
        return customers.stream().map(customer -> {
            List<OrderResponse> customerOrders = orders.stream()
                .filter(order -> order.getCustomer() != null && order.getCustomer().getId().equals(customer.getId()))
                .map(apiMapper::toOrder)
                .toList();
            List<FeedbackEntry> customerFeedback = feedback.stream()
                .filter(entry -> entry.getCustomer().getId().equals(customer.getId()))
                .toList();
            BigDecimal totalSpent = customerOrders.stream()
                .map(OrderResponse::total)
                .reduce(MoneyUtils.ZERO, BigDecimal::add);
            BigDecimal averageRating = customerFeedback.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(customerFeedback.stream().mapToInt(FeedbackEntry::getRating).average().orElse(0.0));
            return apiMapper.toCustomerSummary(customer, customerOrders, totalSpent, averageRating, customerFeedback.size());
        }).toList();
    }

    private UserAccount createUser(StaffCreateRequest request, Role role, boolean superAdmin) {
        if (userAccountRepository.existsByEmailIgnoreCase(request.email().trim())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered");
        }
        UserAccount user = new UserAccount();
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(role);
        user.setSuperAdmin(superAdmin);
        user.setRestaurantDiscountValue(MoneyUtils.ZERO);
        return userAccountRepository.save(user);
    }

    private void applyRestaurantDiscount(UserAccount user, String discountType, BigDecimal discountValue) {
        BigDecimal value = discountValue != null ? MoneyUtils.money(discountValue.max(BigDecimal.ZERO)) : MoneyUtils.ZERO;
        if (!StringUtils.hasText(discountType) || "none".equalsIgnoreCase(discountType) || value.compareTo(MoneyUtils.ZERO) <= 0) {
            user.setRestaurantDiscountType(null);
            user.setRestaurantDiscountValue(MoneyUtils.ZERO);
            return;
        }
        user.setRestaurantDiscountType(parseDiscountType(discountType));
        user.setRestaurantDiscountValue(value);
    }

    private DiscountType parseDiscountType(String value) {
        return switch (value.toLowerCase()) {
            case "percentage" -> DiscountType.PERCENTAGE;
            case "fixed" -> DiscountType.FIXED;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported discount type");
        };
    }
}
