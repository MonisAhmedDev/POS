package com.ferozkhandev.pos;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CompanyConfigServiceTest {

    @TempDir
    Path configDir;

    @Test
    void readsCompanyNameAndResolvesRelativeLogoInsideConfigDirectory() throws Exception {
        Files.writeString(configDir.resolve("config.json"), """
            {
              "company_name": "Panjabi Cafe",
              "logo": "POS.jpeg"
            }
            """);

        CompanyConfigService service = new CompanyConfigService(configDir.toString());

        assertThat(service.getCompanyName()).isEqualTo("Panjabi Cafe");
        assertThat(service.getLogoPath()).isEqualTo(configDir.resolve("POS.jpeg").toAbsolutePath().normalize());
    }

    @Test
    void rejectsLogoPathsOutsideTheConfigDirectory() throws Exception {
        Path outsideLogo = configDir.getParent().resolve("other-logo.jpeg");
        Files.writeString(configDir.resolve("config.json"), """
            {
              "company_name": "Other Cafe",
              "logo": "%s"
            }
            """.formatted(outsideLogo.toString().replace("\\", "\\\\")));

        CompanyConfigService service = new CompanyConfigService(configDir.toString());

        assertThat(service.getLogoPath()).isEqualTo(configDir.resolve("POS.jpeg").toAbsolutePath().normalize());
    }
}
