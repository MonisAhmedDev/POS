# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

### Start the full app stack (recommended)
- `./setup/setup.sh` — pulls/builds and starts MySQL + app via `setup/compose.yaml`.
- App URL: `http://localhost:8080`

### Docker Compose directly
- `docker compose -f setup/compose.yaml up -d --build`
- `docker compose -f setup/compose.yaml down`
- `docker compose -f setup/compose.yaml logs -f app`

### Backend (Spring Boot) from source
- `cd fastfoodbackend && ./gradlew bootRun`
- `cd fastfoodbackend && ./gradlew bootJar`
- `cd fastfoodbackend && ./gradlew build`

### Tests
- Run all tests: `cd fastfoodbackend && ./gradlew test`
- Run one test class: `cd fastfoodbackend && ./gradlew test --tests com.ferozkhandev.pos.AuthFlowIntegrationTest`
- Run one test method: `cd fastfoodbackend && ./gradlew test --tests 'com.ferozkhandev.pos.AuthFlowIntegrationTest.signupIssuesCookiesAndMeReturnsCurrentUser'`

### Linting / checks
- There is no dedicated lint plugin configured. Use `cd fastfoodbackend && ./gradlew check` as the standard verification task.

## Architecture overview

This project is a single deployable Spring Boot backend that also serves a vanilla JS frontend. The key tension is that frontend source files live at repository root (`index.html`, `style.css`, `app.js`), but production serving is handled by Spring from packaged static resources. `fastfoodbackend/build.gradle` copies those root files into `classpath:/static` during `processResources`.

### High-level flow
- Browser loads static frontend from Spring Boot (`/`, `/index.html`, `/style.css`, `/app.js`).
- Frontend (`app.js`) calls role-based REST APIs under `/api/**` and keeps runtime state in-memory.
- Auth uses JWT in HttpOnly cookies (`fastbite_access`, `fastbite_refresh`), not localStorage tokens.
- Refresh tokens are persisted in DB; access tokens are validated in `JwtAuthenticationFilter`.

### Backend structure (single Java package)
All backend code is in `com.ferozkhandev.pos` with a flat, monolith-style organization:
- Controllers: `AuthController`, `AdminController`, `CustomerController`, `CashierController`, `MenuController`, `AccountController`
- Business services: `OrderService`, `CartService`, `PricingService`, `CatalogService`, `UserManagementService`, `FeedbackService`, `BackupService`, `SeederService`, `SettingsService`
- Security: `SecurityConfig`, `JwtAuthenticationFilter`, `JwtService`, `CurrentUserService`, `AccessService`
- Persistence: JPA entities (`UserAccount`, `ShopOrder`, `MenuItem`, etc.) and repository interfaces consolidated in `Repositories.java`
- API contracts: request/response records consolidated in `Dtos.java`, mapping in `ApiMapper`

### Bootstrap endpoints pattern
The frontend primarily hydrates itself through role-specific bootstrap endpoints:
- `/api/admin/bootstrap`
- `/api/customer/bootstrap`
- `/api/cashier/bootstrap`

These return aggregated datasets (session, menu, orders, users/feedback/coupons/settings/cart depending on role), so many UI screens depend on these payload shapes.

### Data and infra
- DB: MySQL in normal runtime; Flyway migrations in `fastfoodbackend/src/main/resources/db/migration`.
- Tests: H2 + Flyway via `src/test/resources/application-test.yaml`.
- Uploaded images: filesystem path from `APP_UPLOAD_DIR`, served via `/uploads/**` (`WebConfig`, `StorageService`).
- Default seed data on app ready: admin user, menu items, default coupon (`SeederService`).

## Domain and security notes that affect changes
- Roles: `ADMIN`, `CASHIER`, `CUSTOMER`; some admin actions require `superAdmin` (`AccessService`).
- Pricing is centralized in `PricingService` (menu discounts, customer-level discounts, coupons, delivery fee, tax).
- Customer and cashier order creation/editing paths are different in `OrderService`; keep behavior aligned with existing rules around status transitions and editable states.
- Global API errors are normalized to `ErrorResponse` via `GlobalExceptionHandler`.

## Practical repo-specific notes
- `README.md` still contains legacy client-only/localStorage language; current runtime behavior is backend/API driven.
- Demo bootstrap admin credentials are configured via app properties/env and default to `admin@fastfood.com` / `admin123`.
