# FastBite Setup

## Windows

1. Make sure Docker Desktop is installed and running.
2. Double-click `setup.bat`.
3. Wait for the script to say `FastBite is ready`.
4. Open `http://localhost:8080`.

## Important

Do not run `ferozkhandev/fastbite-app:latest` by itself from Docker Desktop. FastBite needs both:

- the `app` container
- the `db` MySQL container

`setup.bat` starts both services with the required environment variables and persistent Docker volumes.

## Troubleshooting

If the site does not open:

```powershell
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs app
```

If the app logs show database connection failures, the stack was not started correctly or the database is still starting.
If the app is still in `starting` health status, wait until `setup.bat` reports readiness before opening the browser.
