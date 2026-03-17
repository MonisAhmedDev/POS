# Client Setup Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone deployment folder that lets clients install or update FastBite from Docker Hub without the source repository.

**Architecture:** The setup package will contain a self-sufficient compose file plus Windows and POSIX setup scripts. The scripts will always operate on the colocated compose file, pull the latest images, and start the stack using a stable project name so data volumes remain reusable across updates.

**Tech Stack:** Docker Compose, POSIX shell, Windows batch

---

### Task 1: Add design and planning docs

**Files:**
- Create: `docs/plans/2026-03-17-client-setup-design.md`
- Create: `docs/plans/2026-03-17-client-setup.md`

**Step 1: Write the design doc**

Capture the chosen deployment approach, persistence strategy, assumptions, and validation plan.

**Step 2: Write the implementation plan**

Document the concrete files to create and the verification steps.

### Task 2: Create the standalone compose package

**Files:**
- Create: `setup/compose.yaml`

**Step 1: Define the compose project**

Use a stable project name and two services:

- `db` with `mysql:8.4`
- `app` with `ferozkhandev/fastbite-app:latest`

**Step 2: Define persistence and networking**

Add named volumes for MySQL data and uploaded files. Configure app environment variables so the app talks to the `db` service on the compose network.

**Step 3: Add health and restart behavior**

Keep the app gated on a healthy database and retain restart policies suitable for client machines.

### Task 3: Create the POSIX setup script

**Files:**
- Create: `setup/setup.sh`

**Step 1: Resolve the script directory**

Ensure the script can be launched from any working directory while still targeting `setup/compose.yaml`.

**Step 2: Add environment checks**

Fail fast with clear messages if Docker or Docker Compose are unavailable or the Docker daemon is not running.

**Step 3: Add update and start commands**

Run:

- `docker compose pull`
- `docker compose up -d --remove-orphans`

Print the application URL at the end.

### Task 4: Create the Windows setup script

**Files:**
- Create: `setup/setup.bat`

**Step 1: Resolve the script directory**

Use `%~dp0` so the compose file is always found.

**Step 2: Add environment checks**

Fail with readable instructions if Docker or Docker Compose are unavailable.

**Step 3: Add update and start commands**

Mirror the POSIX script behavior so repeated runs act as updates.

### Task 5: Verify the package

**Files:**
- Verify: `setup/compose.yaml`
- Verify: `setup/setup.sh`
- Verify: `setup/setup.bat`

**Step 1: Validate compose rendering**

Run: `docker compose -f setup/compose.yaml config`

Expected: rendered compose output with `app` and `db` services and named volumes.

**Step 2: Validate shell syntax**

Run: `sh -n setup/setup.sh`

Expected: no output and zero exit status.

**Step 3: Review batch logic**

Check path handling and exit conditions for Windows execution.
