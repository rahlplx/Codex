# Backlog

Active tasks ordered by priority. Move items to DONE section when complete.

## Active

| Priority | Task | Owner | Feature |
|----------|------|-------|---------|
| P0 | Register self-hosted runner to unblock CI | DevOps | — |
| P0 | Write SPEC-002: Tech stack (Vue 3 + Express + SQLite + Docker) | Architect | — |
| P1 | Fork codex-mobile into `frontend/` and strip Codex-specific bridge | Engineer | Frontend |
| P1 | Scaffold backend (Express 5 + TypeScript + SQLite WAL) | Engineer | Backend |
| P1 | Implement base CLI adapter interface + OpenCode Zen adapter | Engineer | Backend |
| P1 | Implement OpenRouter free adapter with key rotation (port from codex-mobile `freeMode.ts`) | Engineer | Backend |
| P1 | Write FEAT-001: Provider Dashboard (Hermes-style UI) | Architect | UI |
| P1 | Write FEAT-002: Multi-tenant auth + API key management | Architect | Auth |
| P2 | Implement dynamic model registry with discovery scanner | Engineer | Backend |
| P2 | Implement health prober with circuit breakers | Engineer | Backend |
| P2 | Implement telemetry-driven routing with composite scoring | Engineer | Backend |
| P2 | Build Antigravity CLI adapter (OAuth flow) | Engineer | Backend |
| P2 | Build Nemotron/NIM adapter | Engineer | Backend |
| P2 | Build KiloCode adapter | Engineer | Backend |
| P2 | Docker Compose setup (frontend + backend + optional routers) | DevOps | Deploy |
| P2 | 9Router sidecar integration | Engineer | Backend |
| P2 | CliRelay sidecar integration | Engineer | Backend |
| P2 | Telegram bot bridge (port from codex-mobile) | Engineer | Feature |
| P3 | Caddy/Traefik reverse proxy setup | DevOps | Deploy |
| P3 | CLIProxyAPI + AIClient2API sidecar integration | Engineer | Backend |
| P1 | Fix `needs['unit-tests'].result` bracket notation in ci.yml once runner is live | Engineer | — |

## Done

| Date | Task |
|------|------|
| 2026-06-22 | Bootstrap repository folder structure |
| 2026-06-22 | Create CLAUDE.md |
| 2026-06-22 | Set up CI pipeline scaffold in `.github/workflows/ci.yml` |
| 2026-06-23 | Write SPEC-001 (folder structure) |
| 2026-06-23 | Seed knowledge base with GitHub Actions learnings |
| 2026-06-23 | Fill memory gaps (api-quirks, lessons) with CI session learnings |
| 2026-06-23 | Write TDD structural harness `tests/unit/harness.sh` |
| 2026-06-23 | Add .gitignore |
| 2026-06-23 | Full doc fetchability audit — all 9 gaps resolved |
| 2026-06-23 | Research codex-mobile repo (full architecture analysis) |
| 2026-06-23 | Research free CLI providers (OpenCode Zen, Antigravity, KiloCode, Nemotron, OpenRouter) |
| 2026-06-23 | Research community routers (9Router, CliRelay, CLIProxyAPI, AIClient2API) |
| 2026-06-23 | Write ARCHITECTURE.md with 3-tier provider system |
| 2026-06-23 | Create OKF v0.1 knowledge base (15 docs: providers, routers, models, architecture, design) |
| 2026-06-23 | Design dynamic model registry + telemetry-driven routing |
| 2026-06-23 | Design multi-tenant architecture with fair-share quotas |
| 2026-06-23 | Design Hermes-style provider settings UI (wireframes) |
| 2026-06-23 | Design VPS resource constraints + Docker resource limits |
| 2026-06-23 | Create AGENTS.md (agentic engineering guide) |
| 2026-06-23 | PR #1 merged: architecture + OKF knowledge base |
