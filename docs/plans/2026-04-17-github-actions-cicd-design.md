# GitHub Actions Docker CI/CD Design

**Date:** 2026-04-17

**Goal:** Add a GitHub Actions pipeline that builds, tests, and deploys the FastBite Docker image to Docker Hub.

## Context

The repository already publishes the runtime image as `ferozkhandev/fastbite-app`. The image is built from the root [Dockerfile](/Users/feroze/Downloads/FastFoodShop%202/Dockerfile), which packages the Spring Boot backend together with the static frontend assets.

The requested deployment behavior is:

- deploy only from `main` or `master`
- publish a multi-architecture image for `linux/amd64` and `linux/arm64`
- tag the image as `latest`
- tag the image with the commit SHA
- also publish Git tags that point at the deployed commit

## Chosen Approach

Add one workflow at `.github/workflows/docker-image.yml` with three jobs:

1. `build`
2. `test`
3. `deploy`

The workflow will trigger on:

- `push` to `main` and `master`
- `pull_request` targeting `main` and `master`

The `deploy` job will be gated so it runs only for direct branch pushes to `main` or `master`.

## Job Responsibilities

### Build

Validate that the production Docker image can be built from the repository root using the existing Dockerfile.

### Test

Run the project test commands that already exist in the repo:

- `fastfoodbackend/gradlew test --no-daemon`
- `sh -n setup/setup.sh`
- `sh -n scripts/publish-multiarch.sh`
- `sh -n tests/setup/test_setup_sh_waits_for_health.sh`
- `sh tests/setup/test_setup_sh_waits_for_health.sh`

### Deploy

Use Docker Buildx and QEMU to build and push a multi-arch image to Docker Hub. Login credentials will come from GitHub Actions secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_PASSWORD`

## Tagging Strategy

For each deployment from `main` or `master`, publish:

- `ferozkhandev/fastbite-app:latest`
- `ferozkhandev/fastbite-app:sha-<short-sha>`

If the deployed commit has one or more Git tags pointing to it, also publish:

- `ferozkhandev/fastbite-app:<git-tag>`

## Rejected Alternatives

### Separate CI and CD workflows

Rejected because one small workflow is easier to review and matches the requested three-stage pipeline directly.

### Deploy from every branch

Rejected because the user explicitly limited deployment to `main` and `master`.

### Single-architecture publish

Rejected because the current publishing intent already targets both Windows `amd64` users and Apple Silicon users through a multi-arch image.

## Assumptions

- Docker Hub repository: `ferozkhandev/fastbite-app`
- GitHub repository admins will add `DOCKERHUB_USERNAME` and `DOCKERHUB_PASSWORD` secrets
- `DOCKERHUB_PASSWORD` may be a Docker Hub access token

## Validation

Validation will cover:

- YAML parsing for the workflow file
- local Gradle test execution
- local shell syntax checks for the referenced scripts
- local execution of the setup regression test
