@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%compose.yaml"

if "%FASTBITE_PROJECT_NAME%"=="" set "FASTBITE_PROJECT_NAME=fastbite"
if "%FASTBITE_PORT%"=="" set "FASTBITE_PORT=8080"

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
echo FastBite is starting.
echo Open: http://localhost:%FASTBITE_PORT%
echo Database and uploads are stored in Docker volumes and should survive normal updates.
exit /b 0

:fail
echo.
if defined ERROR_MESSAGE echo %ERROR_MESSAGE%
if defined ERROR_HINT echo %ERROR_HINT%
if not defined ERROR_MESSAGE echo FastBite setup failed.
pause
exit /b 1
