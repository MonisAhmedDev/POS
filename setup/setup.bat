@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%compose.yaml"

if "%FASTBITE_PROJECT_NAME%"=="" set "FASTBITE_PROJECT_NAME=fastbite"
if "%FASTBITE_PORT%"=="" set "FASTBITE_PORT=8080"
if "%FASTBITE_WAIT_TIMEOUT%"=="" set "FASTBITE_WAIT_TIMEOUT=2700"
if "%FASTBITE_POLL_INTERVAL%"=="" set "FASTBITE_POLL_INTERVAL=5"

where docker >nul 2>nul
if errorlevel 1 (
    set "ERROR_MESSAGE=Error: Docker command not found."
    set "ERROR_HINT=Install Docker Desktop and try again."
    goto :fail
)

docker compose version >nul 2>nul
if errorlevel 1 (
    set "ERROR_MESSAGE=Error: Docker Compose v2 is required."
    set "ERROR_HINT=Update Docker Desktop and try again."
    goto :fail
)

docker info >nul 2>nul
if errorlevel 1 (
    set "ERROR_MESSAGE=Error: Docker is not running."
    set "ERROR_HINT=Start Docker Desktop and try again."
    goto :fail
)

echo Using compose file: "%COMPOSE_FILE%"
echo Pulling latest images...
docker compose -f "%COMPOSE_FILE%" -p "%FASTBITE_PROJECT_NAME%" pull
if errorlevel 1 (
    set "ERROR_MESSAGE=Error: failed to pull Docker images."
    set "ERROR_HINT=Check Docker Desktop, internet access, and Docker Hub image permissions."
    goto :fail
)

echo Starting FastBite...
docker compose -f "%COMPOSE_FILE%" -p "%FASTBITE_PROJECT_NAME%" up -d --remove-orphans
if errorlevel 1 (
    set "ERROR_MESSAGE=Error: failed to start FastBite containers."
    set "ERROR_HINT=Review the Docker output above for the exact cause."
    goto :fail
)

echo.
echo Waiting for FastBite to become healthy. First startup can take several minutes on some Windows machines.
set /a ELAPSED=0
set "LAST_STATUS="

:wait_loop
if !ELAPSED! geq %FASTBITE_WAIT_TIMEOUT% (
    set "ERROR_MESSAGE=Error: FastBite did not become healthy within %FASTBITE_WAIT_TIMEOUT% seconds."
    set "ERROR_HINT=Run: docker compose -f ""%COMPOSE_FILE%"" -p ""%FASTBITE_PROJECT_NAME%"" logs app"
    goto :fail
)

set "APP_CONTAINER_ID="
for /f "usebackq delims=" %%I in (`docker compose -f "%COMPOSE_FILE%" -p "%FASTBITE_PROJECT_NAME%" ps -q app 2^>nul`) do set "APP_CONTAINER_ID=%%I"

if defined APP_CONTAINER_ID (
    set "APP_STATUS="
    for /f "usebackq delims=" %%S in (`docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" "!APP_CONTAINER_ID!" 2^>nul`) do set "APP_STATUS=%%S"

    if defined APP_STATUS (
        if /I not "!APP_STATUS!"=="!LAST_STATUS!" (
            echo App status: !APP_STATUS!
            set "LAST_STATUS=!APP_STATUS!"
        )

        if /I "!APP_STATUS!"=="healthy" (
            echo.
            echo FastBite is ready.
            echo Open: http://localhost:%FASTBITE_PORT%
            echo Database and uploads are stored in Docker volumes and should survive normal updates.
            exit /b 0
        )

        if /I "!APP_STATUS!"=="unhealthy" (
            set "ERROR_MESSAGE=Error: FastBite container status is !APP_STATUS!."
            set "ERROR_HINT=Run: docker compose -f ""%COMPOSE_FILE%"" -p ""%FASTBITE_PROJECT_NAME%"" logs app"
            goto :fail
        )

        if /I "!APP_STATUS!"=="exited" (
            set "ERROR_MESSAGE=Error: FastBite container status is !APP_STATUS!."
            set "ERROR_HINT=Run: docker compose -f ""%COMPOSE_FILE%"" -p ""%FASTBITE_PROJECT_NAME%"" logs app"
            goto :fail
        )

        if /I "!APP_STATUS!"=="dead" (
            set "ERROR_MESSAGE=Error: FastBite container status is !APP_STATUS!."
            set "ERROR_HINT=Run: docker compose -f ""%COMPOSE_FILE%"" -p ""%FASTBITE_PROJECT_NAME%"" logs app"
            goto :fail
        )
    )
)

timeout /t %FASTBITE_POLL_INTERVAL% /nobreak >nul
set /a ELAPSED+=%FASTBITE_POLL_INTERVAL%
goto :wait_loop

:fail
echo.
if defined ERROR_MESSAGE echo !ERROR_MESSAGE!
if defined ERROR_HINT echo !ERROR_HINT!
if not defined ERROR_MESSAGE echo FastBite setup failed.
pause
exit /b 1
