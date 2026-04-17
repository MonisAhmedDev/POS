#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
PROJECT_NAME="${FASTBITE_PROJECT_NAME:-fastbite}"
APP_PORT="${FASTBITE_PORT:-8080}"
WAIT_TIMEOUT="${FASTBITE_WAIT_TIMEOUT:-2700}"
POLL_INTERVAL="${FASTBITE_POLL_INTERVAL:-5}"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Error: required command not found: $1" >&2
        exit 1
    fi
}

require_command docker
require_command sleep

if ! docker compose version >/dev/null 2>&1; then
    echo "Error: Docker Compose v2 is required." >&2
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running. Start Docker Desktop and try again." >&2
    exit 1
fi

echo "Using compose file: $COMPOSE_FILE"
echo "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" pull

echo "Starting FastBite..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --remove-orphans

echo
echo "Waiting for FastBite to become healthy. First startup can take several minutes on some Windows machines."

elapsed=0
last_status=""
while [ "$elapsed" -lt "$WAIT_TIMEOUT" ]; do
    app_container_id=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q app 2>/dev/null || true)

    if [ -n "$app_container_id" ]; then
        app_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app_container_id" 2>/dev/null || true)

        if [ -n "$app_status" ] && [ "$app_status" != "$last_status" ]; then
            echo "App status: $app_status"
            last_status=$app_status
        fi

        case "$app_status" in
            healthy)
                echo
                echo "FastBite is ready."
                echo "Open: http://localhost:$APP_PORT"
                echo "Database and uploads are stored in Docker volumes and should survive normal updates."
                exit 0
                ;;
            unhealthy|exited|dead)
                echo >&2
                echo "Error: FastBite container status is $app_status." >&2
                echo "Run: docker compose -f \"$COMPOSE_FILE\" -p \"$PROJECT_NAME\" logs app" >&2
                exit 1
                ;;
        esac
    fi

    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
done

echo
echo "Error: FastBite did not become healthy within $WAIT_TIMEOUT seconds." >&2
echo "Run: docker compose -f \"$COMPOSE_FILE\" -p \"$PROJECT_NAME\" ps" >&2
echo "Run: docker compose -f \"$COMPOSE_FILE\" -p \"$PROJECT_NAME\" logs app" >&2
exit 1
