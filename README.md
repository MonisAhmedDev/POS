# FastBite - Fast Food Shop Management System

FastBite is a browser-based fast food shop management application with a static frontend served by a Spring Boot backend and persisted in MySQL.

## How To Run

### Client install from Docker Hub on Windows

Use the packaged setup script so both required containers start together:

1. Open the `setup` folder.
2. Run `setup.bat`.
3. Wait for the script to report that FastBite is ready.
4. Open [http://localhost:8080](http://localhost:8080).

### Source checkout / local build

From the repository root:

```bash
docker compose up -d --build
```

Then open [http://localhost:8080](http://localhost:8080).

### Important

Do not run the app image by itself. `ferozkhandev/fastbite-app:latest` depends on a MySQL container plus the environment variables defined in `setup/compose.yaml`. Running only the app image usually results in startup failure, so nothing useful appears at `localhost:8080`.

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fastfood.com | admin123 |
| Customer | Sign up in the app | your choice |

## Data Persistence

Application data is stored in MySQL and uploaded photos are stored in a Docker volume. Normal container recreation should not remove data as long as the Docker volumes are kept.

## Troubleshooting

If `http://localhost:8080` is blank or does not load:

1. Confirm both `app` and `db` containers are running.
2. Check the app logs for database connection errors.
3. Do not use the app image alone unless you also provide a reachable MySQL database and the required `SPRING_DATASOURCE_*` environment variables.

Example checks:

```bash
docker compose -f setup/compose.yaml ps
docker compose -f setup/compose.yaml logs app
```

## Publishing

To publish a Docker Hub image that works on both Windows `amd64` machines and Apple Silicon machines, use:

```bash
sh scripts/publish-multiarch.sh
```

The script publishes `ferozkhandev/fastbite-app:latest` for `linux/amd64` and `linux/arm64` by default.

## Features

### Admin Panel

- Dashboard with totals, revenue, recent orders, and top-selling items
- Menu item management with food photo uploads
- Order management with status updates
- Customer management and history review
- Feedback and review management
- Settings, backup, import, and admin account management

### Customer Panel

- Browse menu items by category
- Manage cart contents
- Checkout with delivery details
- Track and cancel eligible orders
- Leave ratings and reviews for delivered orders

### Cashier Panel

- Create counter orders
- Manage walk-in customer carts
- Update order status

## Project Structure

| Path | Purpose |
|------|---------|
| `index.html` | Frontend markup |
| `style.css` | Frontend styling |
| `app.js` | Frontend application logic |
| `fastfoodbackend/` | Spring Boot backend and API |
| `setup/` | Client-facing Docker Hub deployment package |

## Technical Notes

- Frontend assets are bundled into the Spring Boot JAR during build.
- The backend serves the frontend on port `8080`.
- The backend requires MySQL and will fail startup if the database is unavailable.
- Uploaded photos are served from `/uploads/**`.
