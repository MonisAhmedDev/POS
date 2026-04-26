package com.ferozkhandev.pos;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class SettingsService {

    public static final String CURRENCY_KEY = "currency";
    public static final String DEFAULT_CURRENCY = "PKR|₨|Pakistani Rupee";

    public static final String TAX_KEY = "tax_rate";
    public static final String DEFAULT_TAX_RATE = "0.00";
    public static final String BRAND_LOGO_KEY = "brand_logo";
    public static final String DEFAULT_BRAND_LOGO_URL = "/logo.jpeg";

    private final AppSettingRepository appSettingRepository;
    private final StorageService storageService;

    public SettingsService(AppSettingRepository appSettingRepository, StorageService storageService) {
        this.appSettingRepository = appSettingRepository;
        this.storageService = storageService;
    }

    public String getCurrency() {
        return appSettingRepository.findById(CURRENCY_KEY)
            .map(AppSetting::getSettingValue)
            .orElse(DEFAULT_CURRENCY);
    }

    public CurrencyResponse getCurrencyResponse() {
        return new CurrencyResponse(getCurrency());
    }

    public CurrencyResponse setCurrency(String currency) {
        AppSetting setting = appSettingRepository.findById(CURRENCY_KEY).orElseGet(AppSetting::new);
        setting.setSettingKey(CURRENCY_KEY);
        setting.setSettingValue(currency);
        appSettingRepository.save(setting);
        return new CurrencyResponse(currency);
    }

    public BigDecimal getTaxRate() {
        return new BigDecimal(appSettingRepository.findById(TAX_KEY)
            .map(AppSetting::getSettingValue)
            .orElse(DEFAULT_TAX_RATE));
    }

    public BigDecimal setTaxRate(BigDecimal rate) {
        AppSetting setting = appSettingRepository.findById(TAX_KEY).orElseGet(AppSetting::new);
        setting.setSettingKey(TAX_KEY);
        setting.setSettingValue(rate.toString());
        appSettingRepository.save(setting);
        return rate;
    }

    public String getBrandLogoPath() {
        return appSettingRepository.findById(BRAND_LOGO_KEY)
            .map(AppSetting::getSettingValue)
            .filter(StringUtils::hasText)
            .orElse(null);
    }

    public String getBrandLogoUrl() {
        String storedPath = getBrandLogoPath();
        return StringUtils.hasText(storedPath) ? "/uploads/" + storedPath : DEFAULT_BRAND_LOGO_URL;
    }

    public LogoResponse getBrandLogoResponse() {
        return new LogoResponse(getBrandLogoUrl());
    }

    public LogoResponse setBrandLogo(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Please choose a logo image.");
        }
        String currentPath = getBrandLogoPath();
        String storedPath = storageService.store(image);

        AppSetting setting = appSettingRepository.findById(BRAND_LOGO_KEY).orElseGet(AppSetting::new);
        setting.setSettingKey(BRAND_LOGO_KEY);
        setting.setSettingValue(storedPath);
        appSettingRepository.save(setting);

        storageService.delete(currentPath);
        return new LogoResponse("/uploads/" + storedPath);
    }

    public LogoResponse clearBrandLogo() {
        String currentPath = getBrandLogoPath();
        if (StringUtils.hasText(currentPath)) {
            storageService.delete(currentPath);
            appSettingRepository.deleteById(BRAND_LOGO_KEY);
        }
        return new LogoResponse(DEFAULT_BRAND_LOGO_URL);
    }
}
