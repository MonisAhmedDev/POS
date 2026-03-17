package com.ferozkhandev.pos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void signupIssuesCookiesAndMeReturnsCurrentUser() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "Jane Customer",
                          "email": "jane@example.com",
                          "password": "secret123",
                          "confirmPassword": "secret123"
                        }
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("customer"))
            .andExpect(jsonPath("$.email").value("jane@example.com"))
            .andExpect(cookie().exists("fastbite_access"))
            .andExpect(cookie().exists("fastbite_refresh"))
            .andReturn();

        Cookie access = signup.getResponse().getCookie("fastbite_access");
        Cookie refresh = signup.getResponse().getCookie("fastbite_refresh");

        assertThat(access).isNotNull();
        assertThat(refresh).isNotNull();

        mockMvc.perform(get("/api/auth/me").cookie(access, refresh))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Jane Customer"))
            .andExpect(jsonPath("$.role").value("customer"))
            .andExpect(jsonPath("$.isSuperAdmin").value(false));
    }

    @Test
    void logoutClearsCookies() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "email": "admin@fastfood.com",
                          "password": "admin123"
                        }
                        """))
            .andExpect(status().isOk())
            .andExpect(cookie().exists("fastbite_access"))
            .andExpect(cookie().exists("fastbite_refresh"))
            .andReturn();

        Cookie access = login.getResponse().getCookie("fastbite_access");
        Cookie refresh = login.getResponse().getCookie("fastbite_refresh");

        mockMvc.perform(post("/api/auth/logout").cookie(access, refresh))
            .andExpect(status().isOk())
            .andExpect(cookie().maxAge("fastbite_access", 0))
            .andExpect(cookie().maxAge("fastbite_refresh", 0));
    }
}
