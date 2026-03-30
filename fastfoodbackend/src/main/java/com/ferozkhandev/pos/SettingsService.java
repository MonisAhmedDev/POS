package com.ferozkhandev.pos;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SettingsService {

    public static final String CURRENCY_KEY = "currency";
    public static final String DEFAULT_CURRENCY = "PKR|₨|Pakistani Rupee";

    public static final String TAX_KEY = "tax_rate";
    public static final String DEFAULT_TAX_RATE = "0.00";

    private final AppSettingRepository appSettingRepository;

    public SettingsService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
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
}
