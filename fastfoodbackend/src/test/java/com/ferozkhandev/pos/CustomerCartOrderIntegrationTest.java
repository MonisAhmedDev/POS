package com.ferozkhandev.pos;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class CustomerCartOrderIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void customerCanBuildCartApplyCouponAndCheckout() throws Exception {
        Cookie[] authCookies = signupCustomer("cart-user@example.com");

        MvcResult menuResult = mockMvc.perform(get("/api/menu-items").cookie(authCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(15))
            .andReturn();

        JsonNode menuItems = objectMapper.readTree(menuResult.getResponse().getContentAsString());
        String itemId = menuItems.get(0).get("id").asText();

        mockMvc.perform(post("/api/customer/cart/items")
                .cookie(authCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "menuItemId": "%s",
                          "quantity": 1
                        }
                        """.formatted(itemId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].qty").value(1))
            .andExpect(jsonPath("$.subtotal").value(8.99))
            .andExpect(jsonPath("$.total").value(10.98));

        mockMvc.perform(post("/api/customer/cart/coupon")
                .cookie(authCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "code": "WELCOME10"
                        }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.couponCode").value("WELCOME10"))
            .andExpect(jsonPath("$.discount").value(0.90))
            .andExpect(jsonPath("$.total").value(10.08));

        mockMvc.perform(post("/api/customer/orders")
                .cookie(authCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "deliveryName": "Cart User",
                          "phone": "+92 300 0000000",
                          "address": "House 1, Street 2, Karachi",
                          "paymentMethod": "Cash"
                        }
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("Preparing"))
            .andExpect(jsonPath("$.couponCode").value("WELCOME10"))
            .andExpect(jsonPath("$.total").value(10.08));

        mockMvc.perform(get("/api/customer/orders").cookie(authCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].status").value("Preparing"))
            .andExpect(jsonPath("$[0].items[0].qty").value(1));
    }

    @Test
    void customerCannotAccessAdminCoupons() throws Exception {
        Cookie[] authCookies = signupCustomer("customer-authz@example.com");

        mockMvc.perform(get("/api/admin/coupons").cookie(authCookies))
            .andExpect(status().isForbidden());
    }

    private Cookie[] signupCustomer(String email) throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Cart User",
                          "email": "%s",
                          "password": "secret123",
                          "confirmPassword": "secret123"
                        }
                        """.formatted(email)))
            .andExpect(status().isCreated())
            .andReturn();

        return new Cookie[]{
            signup.getResponse().getCookie("fastbite_access"),
            signup.getResponse().getCookie("fastbite_refresh")
        };
    }
}
