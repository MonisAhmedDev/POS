package com.ferozkhandev.pos;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.Cookie;
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
            .andExpect(jsonPath("$.version").value("2.0"))
            .andExpect(jsonPath("$.items.length()").value(15));

        mockMvc.perform(delete("/api/admin/backup/all").cookie(adminCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("All data cleared"));

        mockMvc.perform(get("/api/menu-items"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(15));
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
