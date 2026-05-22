package com.ferozkhandev.pos;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class CompanyConfigService {

    private static final Logger log = LoggerFactory.getLogger(CompanyConfigService.class);
    private static final String CONFIG_FILE = "config.json";
    private static final String DEFAULT_COMPANY_NAME = "Panjabi Cafe";
    private static final String DEFAULT_LOGO = "POS.jpeg";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String configDirOverride;

    /**
     * The config directory can be overridden via APP_COMPANY_CONFIG_DIR env variable.
     * If not set, defaults to ~/POS (user.home + /POS).
     * In Docker, set APP_COMPANY_CONFIG_DIR=/data/company-config and mount the host's ~/POS there.
     */
    public CompanyConfigService(@Value("${app.company-config-dir:${APP_COMPANY_CONFIG_DIR:}}") String configDirOverride) {
        this.configDirOverride = configDirOverride;
    }

    /**
     * Resolves the POS config directory.
     * Uses APP_COMPANY_CONFIG_DIR if set, otherwise falls back to ~/POS.
     */
    Path getConfigDir() {
        if (configDirOverride != null && !configDirOverride.isBlank()) {
            return expandHome(configDirOverride).toAbsolutePath().normalize();
        }
        return Path.of(System.getProperty("user.home"), "POS").toAbsolutePath().normalize();
    }

    private Path getConfigFile() {
        return getConfigDir().resolve(CONFIG_FILE);
    }

    private JsonNode readConfig() {
        Path configFile = getConfigFile();
        try {
            if (Files.exists(configFile)) {
                log.debug("Reading company config from {}", configFile);
                return objectMapper.readTree(configFile.toFile());
            } else {
                log.debug("Company config file not found at {}", configFile);
            }
        } catch (Exception e) {
            log.warn("Failed to read company config from {}: {}", configFile, e.getMessage());
        }
        return null;
    }

    public String getCompanyName() {
        JsonNode config = readConfig();
        if (config != null && config.has("company_name") && !config.get("company_name").asText().isBlank()) {
            return config.get("company_name").asText();
        }
        return DEFAULT_COMPANY_NAME;
    }

    public String getLogoFileName() {
        JsonNode config = readConfig();
        if (config != null && config.has("logo") && !config.get("logo").asText().isBlank()) {
            return config.get("logo").asText();
        }
        return DEFAULT_LOGO;
    }

    /**
     * Returns the absolute path to the logo file on disk.
     */
    public Path getLogoPath() {
        Path configDir = getConfigDir();
        Path configuredLogo = expandHome(getLogoFileName());
        Path logoPath = configuredLogo.isAbsolute()
            ? configuredLogo.toAbsolutePath().normalize()
            : configDir.resolve(configuredLogo).toAbsolutePath().normalize();
        if (!logoPath.startsWith(configDir)) {
            log.warn("Configured logo path {} is outside {}; using {}", logoPath, configDir, DEFAULT_LOGO);
            return configDir.resolve(DEFAULT_LOGO).toAbsolutePath().normalize();
        }
        return logoPath;
    }

    /**
     * Checks if the logo file actually exists on disk.
     */
    public boolean logoExists() {
        Path path = getLogoPath();
        boolean exists = Files.exists(path);
        log.debug("Logo file {} exists: {}", path, exists);
        return exists;
    }

    private Path expandHome(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.equals("~")) {
            return Path.of(System.getProperty("user.home"));
        }
        if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
            return Path.of(System.getProperty("user.home"), trimmed.substring(2));
        }
        return Path.of(trimmed);
    }
}
