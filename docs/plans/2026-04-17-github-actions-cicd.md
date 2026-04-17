# GitHub Actions Docker CI/CD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub Actions workflow that builds, tests, and deploys the FastBite Docker image to Docker Hub from `main` and `master`.

**Architecture:** The pipeline will live in a single workflow file with three sequential jobs. `build` validates the Dockerfile, `test` runs the existing backend and shell checks, and `deploy` performs the multi-arch Docker Hub publish only for branch pushes to `main` or `master`.

**Tech Stack:** GitHub Actions, Docker Buildx, QEMU, Gradle, POSIX shell

---

### Task 1: Add the approved design and plan docs

**Files:**
- Create: `docs/plans/2026-04-17-github-actions-cicd-design.md`
- Create: `docs/plans/2026-04-17-github-actions-cicd.md`

**Step 1: Write the design doc**

Capture the trigger rules, stage responsibilities, image tags, Docker Hub secrets, and validation plan.

**Step 2: Write the implementation plan**

Document the exact workflow file, jobs, and verification commands.

### Task 2: Add the GitHub Actions workflow

**Files:**
- Create: `.github/workflows/docker-image.yml`

**Step 1: Define workflow triggers**

Trigger on `push` and `pull_request` for `main` and `master`.

**Step 2: Define the build job**

Run a non-publishing Docker build against `Dockerfile` from the repository root.

**Step 3: Define the test job**

Run:

- `chmod +x fastfoodbackend/gradlew`
- `./gradlew test --no-daemon`
- `sh -n setup/setup.sh`
- `sh -n scripts/publish-multiarch.sh`
- `sh -n tests/setup/test_setup_sh_waits_for_health.sh`
- `sh tests/setup/test_setup_sh_waits_for_health.sh`

**Step 4: Define the deploy job**

Gate the job to `push` events on `main` and `master`, set up QEMU and Buildx, log in with `DOCKERHUB_USERNAME` and `DOCKERHUB_PASSWORD`, compute `latest`, `sha-*`, and Git tag image tags, then push `linux/amd64` and `linux/arm64`.

### Task 3: Validate the workflow locally

**Files:**
- Verify: `.github/workflows/docker-image.yml`
- Verify: `fastfoodbackend/build.gradle`
- Verify: `fastfoodbackend/gradlew`
- Verify: `setup/setup.sh`
- Verify: `scripts/publish-multiarch.sh`
- Verify: `tests/setup/test_setup_sh_waits_for_health.sh`

**Step 1: Parse the workflow YAML**

Run: `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/docker-image.yml')"`

Expected: zero exit status.

**Step 2: Run backend tests**

Run: `cd fastfoodbackend && chmod +x gradlew && ./gradlew test --no-daemon`

Expected: Gradle test task passes.

**Step 3: Run shell syntax checks**

Run: `sh -n setup/setup.sh scripts/publish-multiarch.sh tests/setup/test_setup_sh_waits_for_health.sh`

Expected: zero exit status with no output.

**Step 4: Run the setup regression test**

Run: `sh tests/setup/test_setup_sh_waits_for_health.sh`

Expected: zero exit status.
