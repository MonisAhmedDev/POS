package com.ferozkhandev.pos;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Security security = new Security();
    private final Storage storage = new Storage();
    private final BootstrapAdmin bootstrapAdmin = new BootstrapAdmin();

    @Getter
    @Setter
    public static class Security {
        private String jwtSecret;
        private int accessTokenMinutes;
        private int refreshTokenDays;
        private boolean secureCookies;
    }

    @Getter
    @Setter
    public static class Storage {
        private String uploadDir;
    }

    @Getter
    @Setter
    public static class BootstrapAdmin {
        private String name;
        private String email;
        private String password;
    }
}
