# Backlog

Active tasks ordered by priority. Move items to DONE section when complete.

## Active

| Priority | Task | Owner | Feature |
|----------|------|-------|---------|
| P1 | Implement OpenCode Zen adapter (`src/adapters/opencode-zen.ts`) | Engineer | F001 |
| P1 | Wire `/api/chat/completions` route end-to-end | Engineer | F001 |
| P1 | Implement SQLite storage layer (threads, messages) | Engineer | F001 |
| P2 | Frontend: connect Provider Dashboard to live `/api/providers` | Engineer | F002 |
| P2 | Frontend: implement Chat view with WebSocket streaming | Engineer | F002 |
| P2 | Add Antigravity CLI adapter | Engineer | F001 |
| P2 | Add Nemotron/NIM adapter | Engineer | F001 |
| P3 | Add Telegram bot bridge | Engineer | — |
| P3 | Add 9Router sidecar integration | Engineer | — |
| P3 | Docker Compose prod profile with Caddy reverse proxy | DevOps | — |
| P3 | Add Playwright E2E tests for Provider Dashboard | Engineer | F002 |

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
