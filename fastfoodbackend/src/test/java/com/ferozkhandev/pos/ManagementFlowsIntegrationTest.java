package com.ferozkhandev.pos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ManagementFlowsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void cashierCanCreateAndDeliverOrderAndCustomerCanLeaveFeedback() throws Exception {
        Cookie[] adminCookies = login("admin@fastfood.com", "admin123");

        mockMvc.perform(post("/api/admin/staff/cashiers")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Cashier One",
                          "email": "cashier1@example.com",
                          "password": "secret123"
                        }
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("cashier"));

        Cookie[] cashierCookies = login("cashier1@example.com", "secret123");

        mockMvc.perform(post("/api/cashier/customers")
                .cookie(cashierCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Customer Flow",
                          "email": "customer-flow@example.com",
                          "password": "secret123"
                        }
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("customer"));

        MvcResult menuResult = mockMvc.perform(get("/api/menu-items"))
            .andExpect(status().isOk())
            .andReturn();
        String itemId = objectMapper.readTree(menuResult.getResponse().getContentAsString()).get(0).get("id").asText();

        MvcResult orderResult = mockMvc.perform(post("/api/cashier/orders")
                .cookie(cashierCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "customerName": "Customer Flow",
                          "paymentMethod": "Cash",
                          "items": [
                            { "id": "%s", "qty": 1 }
                          ]
                        }
                        """.formatted(itemId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("Preparing"))
            .andReturn();

        String orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/cashier/orders/{orderId}/status", orderId)
                .cookie(cashierCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "status": "Ready" }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Ready"));

        mockMvc.perform(put("/api/cashier/orders/{orderId}/status", orderId)
                .cookie(cashierCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "status": "Delivered" }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("Delivered"));

        Cookie[] customerCookies = login("customer-flow@example.com", "secret123");

        mockMvc.perform(post("/api/customer/feedback")
                .cookie(customerCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "orderId": "%s",
                          "rating": 5,
                          "comment": "Great service"
                        }
                        """.formatted(orderId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.rating").value(5))
            .andExpect(jsonPath("$.orderRef").isNotEmpty());
    }

    @Test
    void adminCanExportAndClearDataWhileDefaultsSurviveReset() throws Exception {
        Cookie[] adminCookies = login("admin@fastfood.com", "admin123");

        mockMvc.perform(get("/api/admin/backup/export").cookie(adminCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.version").value("2.1"))
            .andExpect(jsonPath("$.taxRate").value(0.00))
            .andExpect(jsonPath("$.items.length()").value(15));

        mockMvc.perform(delete("/api/admin/backup/all").cookie(adminCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("All data cleared"));

        mockMvc.perform(get("/api/menu-items"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(15));
    }

    @Test
    void nonChiefAdminCanExportAndImportBackup() throws Exception {
        String email = "backup-admin-" + UUID.randomUUID() + "@example.com";
        Cookie[] chiefAdminCookies = login("admin@fastfood.com", "admin123");
        createAdmin(chiefAdminCookies, "Backup Admin", email);
        Cookie[] adminCookies = login(email, "secret123");

        MvcResult exportResult = mockMvc.perform(get("/api/admin/backup/export").cookie(adminCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.version").value("2.1"))
            .andExpect(jsonPath("$.taxRate").exists())
            .andExpect(jsonPath("$.items.length()").value(15))
            .andReturn();

        mockMvc.perform(post("/api/admin/backup/import")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exportResult.getResponse().getContentAsString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Data imported"));
    }

    @Test
    void backupEndpointsRejectNonAdminUsers() throws Exception {
        Cookie[] adminCookies = login("admin@fastfood.com", "admin123");
        String cashierEmail = "backup-cashier-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(post("/api/admin/staff/cashiers")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Backup Cashier",
                          "email": "%s",
                          "password": "secret123"
                        }
                        """.formatted(cashierEmail)))
            .andExpect(status().isCreated());

        Cookie[] cashierCookies = login(cashierEmail, "secret123");
        Cookie[] customerCookies = signupCustomer("backup-customer-" + UUID.randomUUID() + "@example.com");

        mockMvc.perform(get("/api/admin/backup/export"))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/backup/export").cookie(customerCookies))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/backup/import")
                .cookie(cashierCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void importBackupRestoresSnapshotDataAndSettings() throws Exception {
        Cookie[] adminCookies = login("admin@fastfood.com", "admin123");
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        String itemName = "Restore Burger " + suffix;
        String couponCode = "RESTORE" + suffix;
        String customerName = "Restore Customer " + suffix;
        String customerEmail = "restore-customer-" + suffix.toLowerCase() + "@example.com";

        mockMvc.perform(put("/api/admin/settings/currency")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "currency": "USD|$|US Dollar" }
                        """))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/settings/tax")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "rate": 0.15 }
                        """))
            .andExpect(status().isOk());

        MvcResult itemResult = mockMvc.perform(multipart("/api/menu-items")
                .cookie(adminCookies)
                .param("name", itemName)
                .param("category", "Restore")
                .param("price", "12.34")
                .param("discount", "0.00")
                .param("description", "Backup restore item")
                .param("icon", "R")
                .param("available", "true"))
            .andExpect(status().isOk())
            .andReturn();
        String itemId = objectMapper.readTree(itemResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(post("/api/admin/coupons")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "code": "%s",
                          "discountType": "fixed",
                          "discountValue": 1.50,
                          "minOrderAttr": 0.00,
                          "applicableCategory": "Restore",
                          "status": "active"
                        }
                        """.formatted(couponCode)))
            .andExpect(status().isOk());

        Cookie[] customerCookies = signupCustomer(customerName, customerEmail);
        mockMvc.perform(post("/api/customer/cart/items")
                .cookie(customerCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "menuItemId": "%s",
                          "quantity": 2
                        }
                        """.formatted(itemId)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/customer/orders")
                .cookie(customerCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "deliveryName": "%s",
                          "phone": "+92 300 1111111",
                          "address": "Restore Street",
                          "paymentMethod": "Cash"
                        }
                        """.formatted(customerName)))
            .andExpect(status().isCreated());

        MvcResult exportResult = mockMvc.perform(get("/api/admin/backup/export").cookie(adminCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taxRate").value(0.15))
            .andReturn();
        String snapshot = exportResult.getResponse().getContentAsString();

        mockMvc.perform(delete("/api/admin/backup/all").cookie(adminCookies))
            .andExpect(status().isOk());

        Cookie[] resetAdminCookies = login("admin@fastfood.com", "admin123");
        mockMvc.perform(post("/api/admin/backup/import")
                .cookie(resetAdminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content(snapshot))
            .andExpect(status().isOk());

        Cookie[] restoredAdminCookies = login("admin@fastfood.com", "admin123");
        MvcResult bootstrapResult = mockMvc.perform(get("/api/admin/bootstrap").cookie(restoredAdminCookies))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode restored = objectMapper.readTree(bootstrapResult.getResponse().getContentAsString());

        assertThat(restored.get("currency").asText()).isEqualTo("USD|$|US Dollar");
        assertThat(restored.get("taxRate").decimalValue()).isEqualByComparingTo(new BigDecimal("0.15"));
        assertThat(hasFieldValue(restored.get("items"), "name", itemName)).isTrue();
        assertThat(hasFieldValue(restored.get("coupons"), "code", couponCode)).isTrue();
        assertThat(hasFieldValue(restored.get("customers"), "name", customerName)).isTrue();
        assertThat(hasFieldValue(restored.get("orders"), "customerName", customerName)).isTrue();

        mockMvc.perform(delete("/api/admin/backup/all").cookie(restoredAdminCookies))
            .andExpect(status().isOk());
    }

    @Test
    void invalidBackupImportReturnsBadRequestAndKeepsCurrentData() throws Exception {
        Cookie[] adminCookies = login("admin@fastfood.com", "admin123");

        mockMvc.perform(post("/api/admin/backup/import")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "version": "2.1" }
                        """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Invalid backup file."));

        mockMvc.perform(get("/api/menu-items"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(15));
    }

    private void createAdmin(Cookie[] adminCookies, String name, String email) throws Exception {
        mockMvc.perform(post("/api/admin/staff/admins")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "%s",
                          "email": "%s",
                          "password": "secret123"
                        }
                        """.formatted(name, email)))
            .andExpect(status().isCreated());
    }

    private Cookie[] signupCustomer(String email) throws Exception {
        return signupCustomer("Backup Customer", email);
    }

    private Cookie[] signupCustomer(String name, String email) throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "%s",
                          "email": "%s",
                          "password": "secret123",
                          "confirmPassword": "secret123"
                        }
                        """.formatted(name, email)))
            .andExpect(status().isCreated())
            .andReturn();

        return new Cookie[]{
            signup.getResponse().getCookie("fastbite_access"),
            signup.getResponse().getCookie("fastbite_refresh")
        };
    }

    private boolean hasFieldValue(JsonNode nodes, String field, String value) {
        for (JsonNode node : nodes) {
            if (value.equals(node.path(field).asText())) {
                return true;
            }
        }
        return false;
    }

    private Cookie[] login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "email": "%s",
                          "password": "%s"
                        }
                        """.formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn();
        return new Cookie[]{
            result.getResponse().getCookie("fastbite_access"),
            result.getResponse().getCookie("fastbite_refresh")
        };
    }
}
