package com.ferozkhandev.pos;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StorageService {

    private final Path uploadDir;

    public StorageService(AppProperties properties) {
        this.uploadDir = Path.of(properties.getStorage().getUploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to initialize upload directory.");
        }
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + (StringUtils.hasText(extension) ? "." + extension : "");
        Path target = uploadDir.resolve(filename);
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image.");
        }
    }

    public void delete(String relativePath) {
        if (!StringUtils.hasText(relativePath)) {
            return;
        }
        try {
            Files.deleteIfExists(uploadDir.resolve(relativePath));
        } catch (IOException ignored) {
        }
    }

    public String readBase64(String relativePath) {
        if (!StringUtils.hasText(relativePath)) {
            return null;
        }
        try {
            Path file = uploadDir.resolve(relativePath);
            if (!Files.exists(file)) {
                return null;
            }
            String mimeType = Files.probeContentType(file);
            String base64 = Base64.getEncoder().encodeToString(Files.readAllBytes(file));
            return "data:" + (mimeType != null ? mimeType : "image/png") + ";base64," + base64;
        } catch (IOException ex) {
            return null;
        }
    }

    public String writeBase64(String dataUrl, String existingPath) {
        delete(existingPath);
        if (!StringUtils.hasText(dataUrl)) {
            return null;
        }
        int dataIndex = dataUrl.indexOf("base64,");
        if (dataIndex < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid image backup payload.");
        }
        String metadata = dataUrl.substring(0, dataIndex);
        String base64 = dataUrl.substring(dataIndex + "base64,".length());
        String extension = metadata.contains("image/jpeg") ? "jpg" : metadata.contains("image/webp") ? "webp" : "png";
        String filename = UUID.randomUUID() + "." + extension;
        try {
            Files.write(uploadDir.resolve(filename), Base64.getDecoder().decode(base64));
            return filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to restore backup image.");
        }
    }

    public void clearAll() {
        try {
            Files.createDirectories(uploadDir);
            try (var paths = Files.list(uploadDir)) {
                paths.forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                    }
                });
            }
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to clear uploaded images.");
        }
    }
}
