---
type: Audit Report
title: Infrastructure Domain Audit
description: Findings for docker-compose.yml, deploy/, .github/workflows/ci.yml, Caddyfile, Dockerfiles — CI/CD, containerization, reverse proxy, secrets
tags: [audit, infrastructure, docker, ci, caddy, nginx, security, tier-1]
timestamp: 2026-06-23T00:00:00Z
related:
  - ./frontend.md
  - ./server-routes.md
  - ./adapters.md
---

# Infrastructure Domain Audit

## Management Brief

The CI pipeline has a **silent failure bug** — the integration test stage uses `|| echo "No integration tests found"`, which means the stage passes even if tests exist and fail. The E2E test stage is a **placeholder** that just prints a message. The Caddyfile has a **route ordering bug** that prevents SSE streaming headers from being applied to the chat completions endpoint — the specific `/api/chat/completions` handler is defined after the wildcard `/api/*` handler, so Caddy matches the wildcard first and the SSE-specific configuration is never reached. All container images use `:latest` or unpinned minor versions, creating reproducibility risks. The production compose file does not validate `JWT_SECRET` (unlike the dev compose which uses `${JWT_SECRET:?}`), meaning the backend can start with an empty or missing secret.

## Findings

### Critical

**B-INFRA-1. Caddy route ordering — SSE handler unreachable**
- File: `deploy/Caddyfile:7-24`
- The wildcard `handle /api/*` block (line 7) is defined **before** the specific `handle /api/chat/completions` block (line 18). Caddy's `handle` directive matches first-match, so `/api/chat/completions` is matched by `/api/*` and the SSE-specific handler with WebSocket upgrade headers is never reached.
- Fix: Move the specific `/api/chat/completions` block **above** the generic `/api/*` block. Or use `handle_path` with more specific matching.
- Impact: SSE streaming through Caddy uses the generic reverse proxy config, which does include `flush_interval -1` (good), but misses the WebSocket upgrade headers. This may cause issues with some SSE clients that negotiate via upgrade headers.

### High

**S-INFRA-1. Production compose does not validate `JWT_SECRET`**
- Files: `docker-compose.yml:11` (has `${JWT_SECRET:?...}`), `deploy/docker-compose.prod.yml` (uses `${JWT_SECRET}`)
- The dev compose correctly uses parameter expansion with error message. The production compose does not. If `JWT_SECRET` is unset, the backend starts with `JWT_SECRET=''`, which passes the code-level check (`jwt.ts:12-14` requires length >= 32) and throws at startup — but this is a runtime error, not a deploy-time error.
- Fix: Use `${JWT_SECRET:?JWT_SECRET must be set}` in production compose.
- Impact: Production deployment can start without a valid JWT secret, crashing at runtime instead of at deploy time.

**E-INFRA-1. CI integration test stage swallows failures**
- File: `.github/workflows/ci.yml:61`
- `run: cd backend && npx vitest run --config vitest.config.ts -- ../tests/integration/ || echo "No integration tests found"` — the `|| echo` means the step succeeds (exit code 0) even if tests exist and fail. The entire integration test stage is effectively a no-op quality gate.
- Fix: Remove `|| echo "..."`. If no integration tests exist, vitest exits 0 on its own (no tests matched = pass). If tests fail, vitest exits non-zero and the stage should fail.
- Impact: Integration test failures are invisible in CI. Broken integrations ship to production.

**E-INFRA-2. CI E2E test stage is a placeholder**
- File: `.github/workflows/ci.yml:69-70`
- `run: echo "Playwright E2E tests configured — run locally with npx playwright test"` — no actual tests are run. This stage always passes.
- Fix: Either implement Playwright E2E tests in CI or remove the stage (a passing placeholder gives false confidence).

**E-INFRA-3. All container images use unpinned versions**
- Files: `docker-compose.yml`, `deploy/docker-compose.prod.yml`, `backend/Dockerfile`, `frontend/Dockerfile`
- `node:22-alpine` (could be 22.1 or 22.15), `nginx:alpine` (any version), `caddy:2-alpine`, community router images (`:latest`). Builds are not reproducible — the same Dockerfile can produce different images on different days.
- Fix: Pin to digest: `node:22-alpine@sha256:...` or at minimum to specific patch versions: `node:22.12.0-alpine3.21`.
- Impact: Silent regressions from upstream image updates. Community router images (`:latest`) are especially risky — these are third-party images that could change behavior or introduce vulnerabilities at any time.

**E-INFRA-4. No database backup strategy**
- Files: `docker-compose.yml:15` (`codex-data:/data`), `backend/src/storage/database.ts`
- SQLite database is stored in a Docker named volume. No backup cronjob, no snapshot mechanism, no export to external storage. WAL mode provides crash recovery but not backup.
- Fix: Add a backup sidecar or cronjob that runs `sqlite3 /data/codex.db ".backup /backup/codex-$(date +%Y%m%d).db"` daily. Mount a separate backup volume.
- Impact: Data loss on volume corruption, accidental deletion, or host failure. Single point of failure for all user data.

**E-INFRA-5. No structured logging**
- Files: `backend/src/index.ts` (uses `console.log/error`), all backend code
- No structured logging library (Pino, Winston, bunyan). All logs are unstructured `console.log` strings. No log levels, no request correlation IDs, no JSON format for log aggregation tools.
- Fix: Add Pino with request-scoped correlation IDs. Configure JSON output for production, pretty output for development.
- Impact: Debugging production issues requires searching unstructured text. No ability to filter by severity, tenant, or request.

### Medium

**E-INFRA-6. Frontend container has no health check**
- File: `docker-compose.yml:27-38`
- Backend has `healthcheck: test: ["CMD", "wget", ...]` but frontend has no healthcheck. Docker Compose can't determine if the frontend is serving traffic.
- Fix: Add `healthcheck: test: ["CMD", "wget", "-qO-", "http://localhost:80/"]`.

**E-INFRA-7. Caddy container has no health check (production)**
- File: `deploy/docker-compose.prod.yml`
- The Caddy reverse proxy has no health check. If Caddy crashes or stops serving, Docker won't restart it until the process exits.
- Fix: Add `healthcheck: test: ["CMD", "wget", "-qO-", "http://localhost:80/health"]`.

**E-INFRA-8. No network segmentation**
- Files: `docker-compose.yml`, `deploy/docker-compose.prod.yml`
- All services (frontend, backend, routers) share the default Docker bridge network. Router sidecars can communicate directly with the database-holding backend service.
- Fix: Create separate networks: `frontend` (frontend + caddy + backend), `backend` (backend + routers), `data` (backend only). Restrict router access to only the backend API.

**E-INFRA-9. Router sidecar ports exposed to host**
- File: `docker-compose.yml:42-76`
- Community router services expose ports to the host: `20128`, `3456`, `8080`, `3100`. These should only be accessible to the backend.
- Fix: Remove `ports:` mappings for router services. They only need to be reachable within the Docker network.

**E-INFRA-10. CI pipeline is strictly sequential**
- File: `.github/workflows/ci.yml`
- `unit-tests` depends on `lint`, `integration-tests` depends on `unit-tests`, `e2e-tests` depends on `integration-tests`. Lint and unit tests could run in parallel to reduce pipeline duration.
- Fix: Make `unit-tests` depend only on `lint` but run integration tests in parallel with unit tests (they're independent).

**C-INFRA-1. Backend Dockerfile uses `--ignore-scripts` for npm ci**
- File: `backend/Dockerfile`
- `npm ci --ignore-scripts` skips postinstall scripts. This is a security best practice but could break packages that require native compilation (e.g., `better-sqlite3` needs a build step).
- Fix: Verify that `better-sqlite3` works without postinstall. If not, use `npm ci` without `--ignore-scripts` but with `--production=false` to allow build scripts.

**C-INFRA-2. Caddy CSP allows `'unsafe-inline'` for scripts and styles**
- File: `deploy/Caddyfile:39`
- `script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` — allowing inline scripts weakens CSP protection against XSS. This is often necessary for Vue/Vite SPA frameworks but should be replaced with nonce-based CSP when possible.
- Fix: Use Vite's CSP nonce support to remove `'unsafe-inline'` for scripts.

### Low

**B-INFRA-2.** CI `cache: npm` with `cache-dependency-path: backend/package-lock.json` — caching only backend deps, frontend deps are not cached (frontend CI not implemented).
**C-INFRA-3.** Backend memory limit (1536M) is generous for a Node.js process with `--max-old-space-size=1024` — the extra 512MB provides headroom for RSS overhead.
**C-INFRA-4.** No `docker-compose.override.yml` for developer-specific overrides (debug ports, volume mounts).
**C-INFRA-5.** Caddy `admin off` is good practice — prevents admin API exposure.
**C-INFRA-6.** No `.dockerignore` files found — Docker builds may include `.git`, `node_modules`, and test files.
**E-INFRA-11.** No Dependabot or Renovate configuration for automated dependency updates.
**E-INFRA-12.** No secret scanning (GitGuardian, GitHub secret scanning) configured.

### Test Gaps

- **No test for Docker build success** (CRITICAL) — would have caught missing `package.json`.
- **No test for Caddy route ordering** (HIGH) — would have caught SSE handler ordering.
- **No integration test for CI pipeline** (MEDIUM) — pipeline itself is untested.
- **No chaos testing for service failures** (MEDIUM) — no validation of restart policies.
- **No load test for 18-probe routing overhead** (HIGH) — performance impact untested.
