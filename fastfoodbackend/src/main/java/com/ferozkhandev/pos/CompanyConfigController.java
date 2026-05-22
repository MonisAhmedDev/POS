package com.ferozkhandev.pos;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CompanyConfigController {

    private final CompanyConfigService companyConfigService;

    /**
     * Public endpoint that returns the company name and logo URL.
     * No authentication required — used by the frontend on every page.
     */
    @GetMapping("/api/company-config")
    Map<String, String> getCompanyConfig() {
        return Map.of(
            "companyName", companyConfigService.getCompanyName(),
            "companyLogoUrl", "/api/company-logo"
        );
    }

    /**
     * Serves the company logo image from ~/POS/ directory.
     * No authentication required.
     */
    @GetMapping("/api/company-logo")
    ResponseEntity<Resource> getCompanyLogo() {
        Path logoPath = companyConfigService.getLogoPath();
        if (!companyConfigService.logoExists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Resource resource = new FileSystemResource(logoPath);
        String fileName = logoPath.getFileName().toString().toLowerCase();
        MediaType mediaType = fileName.endsWith(".png") ? MediaType.IMAGE_PNG
            : fileName.endsWith(".gif") ? MediaType.IMAGE_GIF
            : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
            .contentType(mediaType)
            .body(resource);
    }
}
