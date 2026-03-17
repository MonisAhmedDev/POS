package com.ferozkhandev.pos;

import com.ferozkhandev.pos.DomainEnums.CouponStatus;
import com.ferozkhandev.pos.DomainEnums.DiscountType;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
@RequiredArgsConstructor
public class CatalogService {

    private final MenuItemRepository menuItemRepository;
    private final CouponRepository couponRepository;
    private final StorageService storageService;
    private final ApiMapper apiMapper;

    public List<MenuItemResponse> listMenuItems() {
        return menuItemRepository.findAllByOrderByCreatedAtAsc().stream().map(apiMapper::toMenuItem).toList();
    }

    public MenuItem getMenuItem(String id) {
        return menuItemRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Menu item not found."));
    }

    public MenuItemResponse saveMenuItem(
        String id,
        String name,
        String category,
        BigDecimal price,
        String description,
        String icon,
        boolean available,
        MultipartFile image,
        boolean removeImage
    ) {
        if (!StringUtils.hasText(name) || !StringUtils.hasText(category) || price == null || price.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please fill all fields correctly");
        }
        MenuItem item = StringUtils.hasText(id)
            ? getMenuItem(id)
            : new MenuItem();
        item.setName(name.trim());
        item.setCategory(category);
        item.setPrice(MoneyUtils.money(price));
        item.setDescription(StringUtils.hasText(description) ? description.trim() : "");
        item.setIcon(StringUtils.hasText(icon) ? icon.trim() : "🍽️");
        item.setAvailable(available);
        if (removeImage && StringUtils.hasText(item.getImagePath())) {
            storageService.delete(item.getImagePath());
            item.setImagePath(null);
        }
        if (image != null && !image.isEmpty()) {
            storageService.delete(item.getImagePath());
            item.setImagePath(storageService.store(image));
        }
        return apiMapper.toMenuItem(menuItemRepository.save(item));
    }

    public void deleteMenuItem(String id) {
        MenuItem item = getMenuItem(id);
        storageService.delete(item.getImagePath());
        menuItemRepository.delete(item);
    }

    public List<CouponResponse> listCoupons() {
        return couponRepository.findAllByOrderByCreatedAtDesc().stream().map(apiMapper::toCoupon).toList();
    }

    public Coupon findActiveCoupon(String code) {
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or inactive coupon"));
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or inactive coupon");
        }
        return coupon;
    }

    public CouponResponse saveCoupon(String id, CouponRequest request) {
        Coupon existing = StringUtils.hasText(id)
            ? couponRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found."))
            : new Coupon();
        couponRepository.findByCodeIgnoreCase(request.code().trim())
            .filter(found -> !found.getId().equals(existing.getId()))
            .ifPresent(found -> {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon code already exists");
            });
        existing.setCode(request.code().trim().toUpperCase());
        existing.setDiscountType(parseDiscountType(request.discountType()));
        existing.setDiscountValue(MoneyUtils.money(request.discountValue()));
        existing.setMinOrderAmount(MoneyUtils.money(request.minOrderAttr()));
        existing.setApplicableCategory(StringUtils.hasText(request.applicableCategory()) ? request.applicableCategory().trim() : null);
        existing.setStatus(parseCouponStatus(request.status()));
        return apiMapper.toCoupon(couponRepository.save(existing));
    }

    public void deleteCoupon(String id) {
        couponRepository.delete(couponRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found.")));
    }

    private DiscountType parseDiscountType(String value) {
        return switch (value.toLowerCase()) {
            case "percentage" -> DiscountType.PERCENTAGE;
            case "fixed" -> DiscountType.FIXED;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported discount type");
        };
    }

    private CouponStatus parseCouponStatus(String value) {
        return switch (value.toLowerCase()) {
            case "active" -> CouponStatus.ACTIVE;
            case "inactive" -> CouponStatus.INACTIVE;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported coupon status");
        };
    }
}
