#!/usr/bin/env sh

set -eu

IMAGE_NAME="${FASTBITE_IMAGE_NAME:-ferozkhandev/fastbite-app}"
IMAGE_TAG="${FASTBITE_IMAGE_TAG:-latest}"
PLATFORMS="${FASTBITE_PLATFORMS:-linux/amd64,linux/arm64}"
EXTRA_TAGS="${FASTBITE_EXTRA_TAGS:-}"

if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker command not found." >&2
    exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
    echo "Error: Docker Buildx is required." >&2
    exit 1
fi

set -- buildx build --platform "$PLATFORMS" -t "$IMAGE_NAME:$IMAGE_TAG"

if [ -n "$EXTRA_TAGS" ]; then
    old_ifs=$IFS
    IFS=,
    for extra_tag in $EXTRA_TAGS; do
        set -- "$@" -t "$IMAGE_NAME:$extra_tag"
    done
    IFS=$old_ifs
fi

set -- "$@" --push .

echo "Publishing $IMAGE_NAME:$IMAGE_TAG for $PLATFORMS"
docker "$@"
