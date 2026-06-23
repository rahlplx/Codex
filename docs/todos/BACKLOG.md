# Backlog

Active tasks ordered by priority. Move items to DONE section when complete.

## Active

| Priority | Task | Owner | Feature |
|----------|------|-------|---------|
| ~~P0~~ | ~~Fix ci.yml for self-hosted runner (bracket notation)~~ | ~~DevOps~~ | ~~CI~~ |
| P1 | ~~Build Antigravity CLI adapter (OAuth flow)~~ | ~~Engineer~~ | ~~Backend~~ |
| P1 | ~~Build KiloCode adapter~~ | ~~Engineer~~ | ~~Backend~~ |
| P1 | ~~Implement dynamic model discovery scanner (hourly)~~ | ~~Engineer~~ | ~~Backend~~ |
| ~~P2~~ | ~~9Router sidecar integration~~ | ~~Engineer~~ | ~~Backend~~ |
| ~~P2~~ | ~~CliRelay sidecar integration~~ | ~~Engineer~~ | ~~Backend~~ |
| ~~P2~~ | ~~Telegram bot bridge (port from codex-mobile)~~ | ~~Engineer~~ | ~~Feature~~ |
| ~~P3~~ | ~~Caddy/Traefik reverse proxy setup~~ | ~~DevOps~~ | ~~Deploy~~ |
| ~~P3~~ | ~~CLIProxyAPI + AIClient2API sidecar integration~~ | ~~Engineer~~ | ~~Backend~~ |
| ~~P3~~ | ~~E2E tests (Playwright)~~ | ~~Engineer~~ | ~~Testing~~ |

## Done

| Date | Task |
|------|------|
| 2026-06-22 | Bootstrap repository folder structure |
| 2026-06-22 | Create CLAUDE.md |
| 2026-06-22 | Set up CI pipeline scaffold in `.github/workflows/ci.yml` |
| 2026-06-23 | Write SPEC-001 (folder structure) |
| 2026-06-23 | Seed knowledge base with GitHub Actions learnings |
| 2026-06-23 | Fill memory gaps (api-quirks, lessons) with CI session learnings |
| 2026-06-23 | Write TDD structural harness `tests/unit/harness.sh` (64/64 pass) |
| 2026-06-23 | Add .gitignore |
| 2026-06-23 | Full doc fetchability audit — all 9 gaps resolved |
| 2026-06-23 | Register self-hosted runner + get CI green (P0) |
| 2026-06-23 | Fix harness Loop 6: write-capability assertions (CI-safe) |
| 2026-06-23 | Harden setup-runner.sh (dep check, --token guard, darwin→osx, launchd fix) |
| 2026-06-23 | Write SPEC-002 (tech stack: Vue 3 + Express 5 + SQLite + Docker) |
| 2026-06-23 | Write SPEC-003 (backend scaffold + ICliAdapter interface) |
| 2026-06-23 | Write SPEC-004 (frontend scaffold + Provider Dashboard screens) |
| 2026-06-23 | Implement backend scaffold: types, ICliAdapter, registry, router, /health |
| 2026-06-23 | Implement frontend scaffold: Vite + Vue 3 + Tailwind + 3 views |
| 2026-06-23 | Write unit tests for registry + router (TDD) |
| 2026-06-23 | Merge PR #4 (CI) and PR #1 (WebUI architecture) to main |
| 2026-06-23 | Clone codex-mobile as frontend/ (as-is, no scratch build) |
| 2026-06-23 | Apply 5 Gemini review fixes (quota null, Array.isArray, lockfile tracking) |
| 2026-06-23 | Create IconTablerServer.vue + IconTablerBrain.vue |
| 2026-06-23 | Add /providers + /models routes to Vue Router |
| 2026-06-23 | Create ProviderCard.vue (full codex-mobile design system) |
| 2026-06-23 | Create ProviderDashboard.vue (3 tabs: CLIs / Routers / Savings) |
| 2026-06-23 | Create ModelCatalog.vue (search + filter + sort table) |
| 2026-06-23 | Wire App.vue: sidebar nav, ContentHeader, content branches, computed props |
| 2026-06-23 | Merge PR #6 to main; close PR #5 (stale from-scratch approach) |
| 2026-06-23 | Implement OpenCode Zen adapter with 26 unit tests (TDD) |
| 2026-06-23 | Wire POST /api/chat/completions (streaming + non-streaming, 16 tests, 53 total green) |
| 2026-06-23 | Implement Nemotron/NIM adapter |
| 2026-06-23 | Implement OpenRouter Free adapter |
| 2026-06-23 | Implement auth layer (JWT, PBKDF2, authGuard middleware) |
| 2026-06-23 | Implement admin tenant management API (GET/PUT/DELETE /api/admin/tenants) |
| 2026-06-23 | Implement telemetry routes (rankings, usage, reliability, speed, summary) |
| 2026-06-23 | Implement quota enforcement middleware (429 when daily limit exceeded) |
| 2026-06-23 | Add multi-tenant DB schema (tenants, tenant_keys, usage_log) |
| 2026-06-23 | Add Docker Compose + Dockerfiles + nginx config |
| 2026-06-23 | Add frontend codex-agent panels (Admin, Telemetry, Provider) |
| 2026-06-23 | Add useCodexAgent composable with auth + admin guard |
| 2026-06-23 | Add /telemetry and /admin routes to Vue Router |
| 2026-06-23 | Evolve harness from 64 to 109 assertions (Loops 11-18) |
| 2026-06-23 | Wire Telemetry + Admin panels into App.vue (unified design system) |
| 2026-06-23 | Implement 3-layer admin visibility (sidebar v-if, router meta guard, backend JWT) |
| 2026-06-23 | Create IconTablerChartBar.vue + IconTablerShield.vue |
| 2026-06-23 | Security hardening: timing-safe JWT, SSE \r handling, reader cleanup, rolling quota reset, timestamp index, days validation, 401 auto-logout |
| 2026-06-23 | Resolve all 8 Gemini code review findings on PR #8 |
| 2026-06-23 | Merge PR #7 (vitest 2.x → 4.x security bump) |
| 2026-06-23 | Rebase PR #8 onto updated main (clean, no conflicts) |
| 2026-06-23 | Fix all 63 TypeScript compilation errors (PR #10 merged) |
| 2026-06-23 | Resolve all 4 Gemini review findings on PR #10 |
| 2026-06-23 | Build Antigravity (Google Gemini) adapter with 14 tests |
| 2026-06-23 | Build KiloCode adapter with 13 tests |
| 2026-06-23 | Implement ModelDiscoveryScanner with hourly scan + 12 tests |
| 2026-06-23 | Wire new adapters + scanner into server index |
| 2026-06-23 | Evolve harness to 121 assertions (Loops 19-20) |
| 2026-06-23 | Resolve all 9 Gemini review findings on PR #11 |
| 2026-06-23 | Add comprehensive test coverage (jwt, password, middleware, threads, admin, auth, telemetry, models, providers) |
| 2026-06-23 | Add streaming tests for Antigravity + KiloCode adapters |
| 2026-06-23 | Build 9Router sidecar adapter + Docker Compose profile |
| 2026-06-23 | Build CliRelay sidecar adapter + Docker Compose profile |
| 2026-06-23 | Build CLIProxyAPI sidecar adapter + Docker Compose profile |
| 2026-06-23 | Build AIClient2API sidecar adapter + Docker Compose profile |
| 2026-06-23 | Build SidecarAdapter base class (shared OpenAI-compatible protocol) |
| 2026-06-23 | Build Telegram bot bridge with thread integration |
| 2026-06-23 | Coverage boost: 82% → 92.5% lines, 84% → 92% functions |
| 2026-06-23 | Fix CI pipeline: ubuntu-latest, Node 22, tsc + vitest + coverage |
| 2026-06-23 | Add Caddy reverse proxy config (deploy/Caddyfile) + production docker-compose |
| 2026-06-23 | Add Playwright E2E test suite (health, auth, threads CRUD, chat completions) |
| 2026-06-23 | Resolve all 9 Gemini review findings on PR #12 |
