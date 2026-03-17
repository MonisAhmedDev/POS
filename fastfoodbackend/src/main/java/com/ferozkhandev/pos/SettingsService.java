package com.ferozkhandev.pos;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SettingsService {

    public static final String CURRENCY_KEY = "currency";
    public static final String DEFAULT_CURRENCY = "PKR|₨|Pakistani Rupee";

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
}
