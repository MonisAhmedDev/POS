#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
PROJECT_NAME="${FASTBITE_PROJECT_NAME:-fastbite}"
APP_PORT="${FASTBITE_PORT:-8080}"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Error: required command not found: $1" >&2
        exit 1
    fi
}

require_command docker

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
echo "FastBite is starting."
echo "Open: http://localhost:$APP_PORT"
echo "Database and uploads are stored in Docker volumes and should survive normal updates."
