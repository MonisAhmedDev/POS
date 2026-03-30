package com.ferozkhandev.pos;

import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/menu-items")
@RequiredArgsConstructor
public class MenuController {

    private final CatalogService catalogService;

    @GetMapping
    List<MenuItemResponse> list() {
        return catalogService.listMenuItems();
    }

    @PostMapping
    MenuItemResponse create(
        @RequestParam String name,
        @RequestParam String category,
        @RequestParam BigDecimal price,
        @RequestParam(required = false) BigDecimal discount,
        @RequestParam String description,
        @RequestParam(required = false) String icon,
        @RequestParam boolean available,
        @RequestParam(required = false) MultipartFile image
    ) {
        return catalogService.saveMenuItem(null, name, category, price, discount, description, icon, available, image, false);
    }

    @PutMapping("/{id}")
    MenuItemResponse update(
        @PathVariable String id,
        @RequestParam String name,
        @RequestParam String category,
        @RequestParam BigDecimal price,
        @RequestParam(required = false) BigDecimal discount,
        @RequestParam String description,
        @RequestParam(required = false) String icon,
        @RequestParam boolean available,
        @RequestParam(required = false) MultipartFile image,
        @RequestParam(defaultValue = "false") boolean removeImage
    ) {
        return catalogService.saveMenuItem(id, name, category, price, discount, description, icon, available, image, removeImage);
    }

    @DeleteMapping("/{id}")
    void delete(@PathVariable String id) {
        catalogService.deleteMenuItem(id);
    }
}
