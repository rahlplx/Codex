# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Codex is a self-hostable, multi-tenant coding agent WebUI with a multi-CLI backend. It aggregates free AI token sources (OpenCode Zen, Antigravity/Gemini, KiloCode, Nemotron, OpenRouter) and community router repos (9Router, CliRelay, CLIProxyAPI, AIClient2API) into a unified interface with tiered fallback routing.

**Stack:** Vue 3 + Tailwind CSS 4 + Vite 6 (frontend) | Node.js + Express 5 + better-sqlite3 (backend)
**Deploy target:** Single VPS (4 vCPU, 8GB RAM) via Docker Compose

## Build & Dev Commands

### Backend (primary development area)

```bash
cd backend && npm ci                 # Install dependencies
cd backend && npm run dev            # Dev server with tsx watch (port 3001)
cd backend && npm run build          # Production build via tsup
cd backend && npm run typecheck      # TypeScript strict mode check (tsc --noEmit)
cd backend && npm run test           # Run all unit + integration tests (vitest)
cd backend && npm run test:watch     # Watch mode
cd backend && npx vitest run tests/unit/adapters/opencode-zen.test.ts  # Single test file
```

### Frontend (fork of codex-mobile / codexapp)

The `frontend/` directory is a fork of [codex-mobile](https://github.com/friuns2/codex-mobile). It uses **yarn** (not npm). It has its own `AGENTS.md` with extensive rules for UI work, dev servers, Playwright testing, and Docker workflows — read `frontend/AGENTS.md` before working on frontend code.

### Docker

```bash
docker compose up -d                         # Core services (frontend + backend)
docker compose --profile routers up -d       # Include community router sidecars
docker compose logs -f backend               # Tail backend logs
```

Requires `JWT_SECRET` env var: `export JWT_SECRET=$(openssl rand -hex 32)`

### CI Pipeline (.github/workflows/ci.yml)

Stages: lint/typecheck → unit tests → integration tests → e2e (placeholder) → telemetry. Runs on Node 22. All stages run from the `backend/` directory.

## Architecture

```
Browser → Frontend (Vue 3 SPA, port 80) → Backend (Express, port 3001) → CLI Orchestrator → Providers
                                                                          ├─ Tier 1: Free CLIs (direct adapters)
                                                                          ├─ Tier 2: Community Routers (Docker sidecars)
                                                                          └─ Tier 3: Paid / Self-hosted (BYOK)
```

### Backend (`backend/src/`)

- **`index.ts`** — Entry point. Initializes all adapters in parallel via `Promise.allSettled`, registers them with the `AdapterRegistry`, opens SQLite, starts the model discovery scanner, optionally starts the Telegram bridge, then starts Express.
- **`adapters/`** — Each provider is an `AdapterBase` subclass implementing `ICliAdapter` (defined in `types/adapter.ts`). Key methods: `healthCheck()`, `getQuota()`, `chatCompletion()`, `chatCompletionStream()`. The `AdapterRegistry` is a simple `Map<string, ICliAdapter>`.
- **`orchestrator/router.ts`** — The `Router` class scores all healthy adapters with available quota, then picks the highest-scoring one. Scoring uses the `score` field from `HealthStatus`.
- **`server/httpServer.ts`** — Express app factory. Mounts route modules under `/api/*`. CORS origins configured via `CORS_ORIGINS` env var.
- **`server/routes/`** — REST endpoints: `health`, `providers`, `models`, `chat`, `threads`, `auth`, `admin`, `telemetry`.
- **`storage/database.ts`** — Opens better-sqlite3 with WAL mode. Creates tables inline: `tenants`, `tenant_keys`, `usage_log`, `threads`, `messages`.
- **`auth/`** — JWT-based auth (`jwt.ts`), Express middleware (`middleware.ts`), bcrypt password hashing (`password.ts`), per-tenant quota tracking (`quota.ts`).
- **`discovery/scanner.ts`** — `ModelDiscoveryScanner` periodically probes adapters for available models.
- **`integrations/telegram.ts`** — Optional Telegram bot bridge for chat and alerts.
- **`types/config.ts`** — `loadConfig()` reads all settings from env vars. Provider defaults are all enabled unless explicitly set to `'false'`.

### Frontend (`frontend/src/`)

Fork of codex-mobile. Key architectural pattern: **no Pinia/Vuex** — all state lives in a single composable `useDesktopState.ts` (~2000 LOC). The bridge layer (`codexAppServerBridge.ts`) spawns `codex app-server` as a child process and proxies JSON-RPC. Real-time transport: WebSocket on `/codex-api/ws` with SSE fallback. See `frontend/PROJECT_SPEC.md` for full protocol and state management details.

## Test Layout

Tests are in `tests/` at the repo root, organized to mirror `backend/src/`:

```
tests/unit/adapters/       → adapter unit tests
tests/unit/auth/           → JWT, middleware, password tests
tests/unit/orchestrator/   → router logic tests
tests/unit/server/         → route handler tests (uses supertest)
tests/unit/storage/        → database/thread/message tests
tests/unit/discovery/      → scanner tests
tests/unit/integrations/   → telegram bridge tests
tests/integration/backend/ → integration tests against real services
tests/e2e/                 → Playwright specs (auth, chat, health, threads)
```

Vitest config is at `backend/vitest.config.ts` — it includes test paths from `../tests/`. The setup file (`backend/vitest.setup.ts`) sets `JWT_SECRET` for test runs.

## Code Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- **No `any` types** — use `unknown` + type guards
- **Named exports only** — no default exports
- **No barrel files** — import from source directly
- **No classes unless stateful** — prefer functions and interfaces
- **Vue 3 Composition API** with `<script setup>` — no Options API
- **Tailwind CSS** for all styling — no inline styles, no CSS modules, no native `<select>` elements

## Key Env Vars

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Backend listen port |
| `DATABASE_PATH` | `./data/codex.db` | SQLite database location |
| `JWT_SECRET` | (required) | JWT signing secret |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `OPENCODE_ZEN_ENABLED` | `true` | Enable/disable per-provider (pattern: `<PROVIDER>_ENABLED`) |
| `OPENROUTER_API_KEY` | — | API key for OpenRouter |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot bridge |

## Adding a New Provider Adapter

1. Create the OKF doc at `knowledge/providers/<name>.md`
2. Create `backend/src/adapters/<name>.ts` extending `AdapterBase`
3. Implement: `healthCheck()`, `getQuota()`, `supportedModels()`, `chatCompletion()`, `chatCompletionStream()`
4. Register in `backend/src/index.ts` (instantiate, initialize, register)
5. Add env var config in `backend/src/types/config.ts`
6. Write tests in `tests/unit/adapters/<name>.test.ts`

## Documentation Structure

- **`ARCHITECTURE.md`** — Full system architecture, provider config format, design decisions, implementation phases
- **`AGENTS.md`** — Rules for AI agents working on this repo (git workflow, testing, performance)
- **`frontend/AGENTS.md`** — Frontend-specific agent rules (dev servers, Playwright, Docker workflows, UI rules)
- **`frontend/PROJECT_SPEC.md`** — Detailed frontend architecture, protocol reference, state management
- **`knowledge/`** — OKF-formatted knowledge base (providers, routers, models, architecture)
- **`docs/specs/`** — Versioned design decisions (never delete, only supersede)
- **`docs/memory/`** — Cross-session persistent insights (append-only)
- **`docs/todos/BACKLOG.md`** — Task backlog
