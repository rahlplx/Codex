---
type: Audit Report
title: Frontend Domain Audit
description: Findings for frontend/ — Vue 3 SPA, Dockerfile, nginx, vite config, state management, security
tags: [audit, frontend, vue, docker, nginx, security, tier-1]
timestamp: 2026-06-23T00:00:00Z
related:
  - ./infrastructure.md
  - ./server-routes.md
---

# Frontend Domain Audit

## Management Brief

The frontend Docker build is **broken** — `frontend/package.json` does not exist, but the Dockerfile's first `COPY` instruction expects it. The Dockerfile has a fallback (`|| npm install`), but without `package.json` there are no dependencies to install, so `npx vite build` will fail. Separately, the `vite.config.ts` imports `./package.json` directly for version info, which also fails. The actual dependency lock file (`package-lock.json`) exists but is empty (lockfileVersion 3, no packages). The frontend uses `yarn.lock` for development but the Dockerfile uses `npm ci`, creating a package manager mismatch. The state management uses a single 5,733-line composable (`useDesktopState.ts`) — this is an intentional architectural choice per `PROJECT_SPEC.md`, not a bug, but it creates a maintenance burden.

## Findings

### Critical

**B-FE-1. `frontend/package.json` does not exist — Docker build broken**
- File: `frontend/Dockerfile:3` (`COPY package.json package-lock.json* ./`)
- `package.json` is missing from `frontend/`. The Dockerfile copies it as the first step, but the file doesn't exist. The fallback `npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts` will run `npm install` in a directory with no `package.json`, installing nothing. The subsequent `npx vite build` will fail because Vite is not installed.
- Evidence: `ls frontend/package.json` returns "No such file or directory". `package-lock.json` exists but is empty.
- Fix: Restore or regenerate `package.json` with all frontend dependencies (vue, vite, tailwindcss, etc.). Ensure lock file is populated.
- Impact: Frontend cannot be built via Docker. Production deployment is blocked.

### High

**E-FE-1. `vite.config.ts` imports missing `package.json`**
- File: `frontend/vite.config.ts:11` (`import pkg from "./package.json"`)
- Since `package.json` doesn't exist, this import fails at build time. The version info used in `VITE_APP_VERSION` cannot be resolved.
- Fix: Restore `package.json`. The import is used for `define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) }`.

**E-FE-2. Package manager mismatch — `yarn.lock` exists but Dockerfile uses `npm`**
- Files: `frontend/yarn.lock` (exists), `frontend/Dockerfile:4` (`npm ci`)
- The frontend development workflow uses `yarn` (per `frontend/AGENTS.md`), but the Dockerfile uses `npm ci`. These resolve dependencies differently and can produce different dependency trees.
- Fix: Align on one package manager. Either switch Dockerfile to `yarn install --frozen-lockfile` or convert to npm and delete `yarn.lock`.

**E-FE-3. `package-lock.json` is empty — no locked dependencies**
- File: `frontend/package-lock.json`
- Contains only `{ "lockfileVersion": 3 }` with no packages. Even if `package.json` were restored, `npm ci` would install nothing because the lock file is empty.
- Fix: Run `npm install` after restoring `package.json` to regenerate the lock file, or convert to `yarn.lock` exclusively.
- Impact: No reproducible builds — dependency versions drift between builds.

**E-FE-4. God-object composable: `useDesktopState.ts` is 5,733 lines**
- File: `frontend/src/composables/useDesktopState.ts`
- Single file manages all application state: thread state (~6 refs), live streaming state (~3 refs), UI state (~4 refs), loading state (~4 refs), server interaction state, localStorage persistence (9+ keys). This is intentional per `PROJECT_SPEC.md` ("No Pinia/Vuex: All state lives in a single composable").
- Fix: Not a bug per se — this is a deliberate architectural decision. However, consider splitting into focused composables (e.g., `useThreadState`, `useLiveState`, `useUIPreferences`) that are re-composed in a single entry point.
- Impact: Hard to review, hard to test in isolation, high merge conflict risk. File is approaching the limit where IDE performance degrades.

**S-FE-1. nginx config does not proxy WebSocket connections for `/codex-api/ws`**
- File: `frontend/nginx.conf:7-14`
- The nginx config proxies `/api` to the backend, but the frontend's `vite.config.ts` sets up a WebSocket endpoint at `/codex-api/ws`. This path is not handled by nginx and would return a 404 in production.
- Fix: Add a separate `location /codex-api` block with WebSocket upgrade headers.
- Impact: Real-time notifications via WebSocket will not work in the Docker/nginx production deployment.

### Medium

**E-FE-5. No `.env` or `.env.example` file for frontend**
- File: `frontend/` directory
- The frontend reads several environment variables (`VITE_WORKTREE_NAME`, `VITE_APP_VERSION`, `VITE_ROLLBACK_DEBUG_FALLBACK`, `CODEX_BACKEND_URL`, etc.) but provides no `.env.example` documenting them.
- Fix: Create `frontend/.env.example` listing all env vars with descriptions and defaults.

**E-FE-6. XSS mitigation relies on manual `escapeHtml()` — no sanitization library**
- Files: `frontend/src/components/ThreadConversation.vue` (7 `v-html` usages), `frontend/src/components/CodexChat.vue` (2 `v-html` usages), `frontend/src/components/SkillDetailModal.vue` (1 `v-html` usage)
- All `v-html` directives are preceded by a custom `escapeHtml()` function that escapes `&`, `<`, `>`, `"`, `'`. The implementation is correct and safe for the current use cases.
- Risk: Manual escaping is fragile — a future developer adding `v-html` might forget to escape. No DOMPurify or sanitize-html library provides a safety net.
- Fix: Consider adding DOMPurify as a runtime sanitizer for `v-html` directives, or create a `v-safe-html` directive wrapper.
- Impact: Currently safe. Future XSS risk if convention is not followed.

**E-FE-7. No frontend health check in Docker**
- File: `docker-compose.yml:36-38` (frontend service)
- Backend has `healthcheck: test: ["CMD", "wget", ...]` but frontend has no healthcheck. Docker cannot determine if nginx started successfully.
- Fix: Add `healthcheck: test: ["CMD", "wget", "-qO-", "http://localhost:80/"]`.

**C-FE-1. Local file serving middleware in vite.config.ts serves arbitrary files**
- File: `frontend/vite.config.ts` (middleware for `/codex-local-image`, `/codex-local-file`, `/codex-local-directories`, `/codex-local-browse/*`, `/codex-local-edit/*`)
- The dev server middleware serves local filesystem files. While this is dev-only and not exposed in production (nginx serves static files), it allows reading arbitrary local files during development.
- Fix: Add path validation to restrict access to the project directory.

**C-FE-2. Frontend test infrastructure is minimal**
- Files: 15 test files in `frontend/src/`
- Unit tests cover API layer and server bridges but not Vue components. Manual test plans exist (13 suites in `frontend/tests/`) but are not automated.
- Fix: Add component tests using Vitest + Vue Test Utils for critical components.

### Low

**B-FE-2.** `.npmrc` sets `side-effects-cache=false` and `package-import-method=copy` — pnpm settings that have no effect with npm/yarn.
**C-FE-3.** `vite.config.ts` allows `.trycloudflare.com` as a host — Cloudflare tunnel support, but could be a vector if unexpected.
**C-FE-4.** No source maps in production build (default Vite behavior) — makes debugging production issues harder.
**E-FE-8.** 121 source files (56 TypeScript + 65 Vue) with no barrel files or organized module boundaries.
**E-FE-9.** Frontend uses `codexAppServerBridge.ts` to spawn a child process — only relevant in desktop mode, not in the Docker SPA deployment.

### Test Gaps

- **No automated component tests** (HIGH) — Vue components untested in CI.
- **No Playwright E2E tests in CI** (HIGH) — exists as placeholder only.
- **No test for Docker build success** (CRITICAL) — would have caught B-FE-1.
- **No test for nginx routing** (MEDIUM) — WebSocket path issue untested.
- **No visual regression tests** (LOW) — manual testing only.
