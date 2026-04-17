#!/usr/bin/env sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

mkdir -p "$TMP_DIR/bin"

cat <<'EOF' > "$TMP_DIR/bin/docker"
#!/usr/bin/env sh
set -eu

STATE_DIR=${FAKE_DOCKER_STATE_DIR:?}
COMMAND_LOG="$STATE_DIR/docker.log"
COUNT_FILE="$STATE_DIR/inspect_count.txt"

printf '%s\n' "$*" >> "$COMMAND_LOG"

case "$*" in
  "compose version")
    exit 0
    ;;
  "info")
    exit 0
    ;;
  "compose "*pull)
    exit 0
    ;;
  "compose "*up\ -d\ --remove-orphans)
    exit 0
    ;;
  "compose "*ps\ -q\ app)
    printf 'container-123\n'
    exit 0
    ;;
esac

if [ "$1" = "inspect" ]; then
    count=0
    if [ -f "$COUNT_FILE" ]; then
        count=$(cat "$COUNT_FILE")
    fi
    count=$((count + 1))
    printf '%s' "$count" > "$COUNT_FILE"

    if [ "$count" -lt 3 ]; then
        printf 'starting\n'
    else
        printf 'healthy\n'
    fi
    exit 0
fi

echo "Unexpected docker invocation: $*" >&2
exit 1
EOF

cat <<'EOF' > "$TMP_DIR/bin/sleep"
#!/usr/bin/env sh
exit 0
EOF

chmod +x "$TMP_DIR/bin/docker" "$TMP_DIR/bin/sleep"
mkdir -p "$TMP_DIR/state"
printf '0' > "$TMP_DIR/state/inspect_count.txt"

OUTPUT_FILE="$TMP_DIR/output.txt"

if PATH="$TMP_DIR/bin:$PATH" \
   FAKE_DOCKER_STATE_DIR="$TMP_DIR/state" \
   FASTBITE_WAIT_TIMEOUT=30 \
   FASTBITE_POLL_INTERVAL=1 \
   sh "$ROOT_DIR/setup/setup.sh" >"$OUTPUT_FILE" 2>&1; then
    :
else
    cat "$OUTPUT_FILE"
    echo "setup.sh exited non-zero" >&2
    exit 1
fi

if ! grep -q "Waiting for FastBite to become healthy" "$OUTPUT_FILE"; then
    cat "$OUTPUT_FILE"
    echo "Expected wait message in setup.sh output" >&2
    exit 1
fi

if ! grep -q "FastBite is ready" "$OUTPUT_FILE"; then
    cat "$OUTPUT_FILE"
    echo "Expected ready message in setup.sh output" >&2
    exit 1
fi

INSPECT_COUNT=$(cat "$TMP_DIR/state/inspect_count.txt")
if [ "$INSPECT_COUNT" -lt 3 ]; then
    cat "$OUTPUT_FILE"
    echo "Expected setup.sh to poll container health before succeeding" >&2
    exit 1
fi
