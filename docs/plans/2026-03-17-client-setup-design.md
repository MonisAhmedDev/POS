# Client Setup Package Design

**Date:** 2026-03-17

**Goal:** Ship a minimal deployment folder that lets a non-technical client install or update FastBite without the source code.

## Context

The Docker image published to Docker Hub contains the application container only. The product still requires MySQL, so running the app image directly from Docker Desktop creates a single standalone container and does not provision the database.

## Chosen Approach

Create a standalone `setup/` directory containing:

- `compose.yaml`
- `setup.sh`
- `setup.bat`

The compose file will define the full runtime stack:

- `db` using `mysql:8.4`
- `app` using `ferozkhandev/fastbite-app:latest`

The scripts will:

- verify Docker and Docker Compose are available
- use the compose file in the same directory
- pull the latest images
- start or update the stack with `docker compose up -d`
- preserve named Docker volumes so database and uploaded photos survive updates

## Why This Approach

- Client does not need source code.
- Client does not need to understand Docker commands beyond running one script.
- Updates remain simple because rerunning the same script will pull newer images and recreate containers while reusing Docker volumes.
- The application keeps the correct multi-container architecture instead of forcing MySQL into the same container as the app.

## Rejected Alternatives

### Single image only

Rejected because the application still depends on MySQL. Packing both services into one container adds operational complexity and increases data-loss risk unless storage is managed very carefully.

### App image only plus manual database setup

Rejected because it increases client effort and support burden.

## Data Persistence

Persistence will rely on named Docker volumes:

- MySQL data volume
- upload/photo storage volume

Containers may be replaced during updates, but the volumes remain attached, so normal updates should not erase data.

## Assumptions

- Docker Hub image reference is `ferozkhandev/fastbite-app:latest`.
- Client machine already has Docker Desktop installed and running.
- Port `8080` is available on the client machine.

## Validation

Validation will cover:

- `docker compose config` on the new setup package
- shell syntax check for `setup.sh`
- batch file sanity review for `setup.bat`
