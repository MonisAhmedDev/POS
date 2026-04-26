package com.ferozkhandev.pos;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderHistoryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ShopOrderRepository shopOrderRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void adminReceivesDailyWeeklyAndMonthlyRollupsUsing4AmCutoff() throws Exception {
        Cookie[] adminCookies = login("admin@fastfood.com", "admin123");

        mockMvc.perform(post("/api/admin/staff/cashiers")
                .cookie(adminCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "History Cashier",
                          "email": "history-cashier@example.com",
                          "password": "secret123"
                        }
                        """))
            .andExpect(status().isCreated());

        Cookie[] cashierCookies = login("history-cashier@example.com", "secret123");

        MvcResult menuResult = mockMvc.perform(get("/api/menu-items"))
            .andExpect(status().isOk())
            .andReturn();
        String itemId = objectMapper.readTree(menuResult.getResponse().getContentAsString()).get(0).get("id").asText();

        String firstOrderId = createCashierOrder(cashierCookies, itemId);
        String secondOrderId = createCashierOrder(cashierCookies, itemId);
        String thirdOrderId = createCashierOrder(cashierCookies, itemId);
        String fourthOrderId = createCashierOrder(cashierCookies, itemId);

        ZoneId zone = ZoneId.systemDefault();
        LocalDate currentBusinessDate = toBusinessDate(Instant.now(), zone);

        setOrderTimestamp(firstOrderId, currentBusinessDate.minusDays(2).atTime(8, 0).atZone(zone).toInstant());
        setOrderTimestamp(secondOrderId, currentBusinessDate.minusDays(1).atTime(3, 30).atZone(zone).toInstant());
        setOrderTimestamp(thirdOrderId, currentBusinessDate.minusDays(10).atTime(6, 0).atZone(zone).toInstant());
        setOrderTimestamp(fourthOrderId, currentBusinessDate.minusDays(40).atTime(6, 0).atZone(zone).toInstant());

        mockMvc.perform(get("/api/admin/orders/history").cookie(adminCookies))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.businessDayCutoffHour").value(4))
            .andExpect(jsonPath("$.daily[0].periodType").value("day"))
            .andExpect(jsonPath("$.daily[0].orderCount").value(2))
            .andExpect(jsonPath("$.daily[0].orders.length()").value(2))
            .andExpect(jsonPath("$.weekly[0].periodType").value("week"))
            .andExpect(jsonPath("$.weekly[0].orderCount").value(1))
            .andExpect(jsonPath("$.monthly[0].periodType").value("month"))
            .andExpect(jsonPath("$.monthly[0].orderCount").value(1));
    }

    private String createCashierOrder(Cookie[] cashierCookies, String itemId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/cashier/orders")
                .cookie(cashierCookies)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "customerName": "Walk-in Customer",
                          "paymentMethod": "Cash",
                          "items": [
                            { "id": "%s", "qty": 1 }
                          ]
                        }
                        """.formatted(itemId)))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    private void setOrderTimestamp(String orderId, Instant timestamp) {
        shopOrderRepository.findById(orderId).orElseThrow();
        jdbcTemplate.update(
            "update shop_order set created_at = ?, updated_at = ? where id = ?",
            Timestamp.from(timestamp),
            Timestamp.from(timestamp),
            orderId
        );
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

    private LocalDate toBusinessDate(Instant timestamp, ZoneId zone) {
        var zonedDateTime = timestamp.atZone(zone);
        LocalDate businessDate = zonedDateTime.toLocalDate();
        if (zonedDateTime.toLocalTime().isBefore(LocalTime.of(4, 0))) {
            businessDate = businessDate.minusDays(1);
        }
        return businessDate;
    }
}
