# SPEC-002: Tech Stack

**Status:** Accepted
**Date:** 2026-06-23
**Author:** Architect (Claude)

## Problem

SPEC-001 established the folder structure but left `src/` empty, deferring tech stack decisions. The project needs a concrete stack that supports: streaming LLM responses, multi-tenant auth, CLI adapter orchestration, Docker deployment on a 4 vCPU / 8GB RAM VPS, and a chat UI forked from codex-mobile.

## Decision

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Vue 3 (Composition API, `<script setup>`) | 3.x |
| Frontend styling | Tailwind CSS | 4.x |
| Frontend build | Vite | 6.x |
| Frontend base | Fork of codex-mobile | — |
| Backend framework | Express | 5.x |
| Backend language | TypeScript (strict mode, no `any`) | 5.x |
| Database | better-sqlite3 (WAL mode, 64MB page cache) | — |
| Auth | jsonwebtoken (JWT) + bcrypt | — |
| Encryption | Node.js crypto (AES-256-GCM) for stored API keys | — |
| Runtime | Node.js | 22 LTS |
| Container | Docker Compose (core) + Caddy (production proxy) | — |
| Testing | Vitest (unit) + Playwright (E2E) | — |
| Target VPS | 4 vCPU AMD, 8GB RAM, 75GB NVMe SSD, 200 Mbit/s | — |

### Source Layout

```
src/
  backend/           Express 5 + TypeScript
    server.ts        Entry point
    types/           ICliAdapter interface, API types
    adapters/        CLI provider adapters
    orchestrator/    Routing, health, circuit breakers
    auth/            JWT, middleware, encryption
    db/              SQLite schema, migrations, queries
    api/             REST route handlers
  frontend/          Forked codex-mobile (Vue 3 SPA)
    src/components/  UI components by feature
    src/composables/ Shared reactive state
    src/router/      Vue Router config
  shared/            TypeScript types shared between frontend/backend
```

### Runtime Constraints

- Backend Node.js heap: `--max-old-space-size=1024`
- SQLite: WAL mode, `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=-65536;`
- Frontend: pre-built SPA served by Nginx in production (not Vite dev server)
- Streaming: SSE for LLM responses, WebSocket for real-time status updates
- Docker resource limits: backend 1.5GB RAM / 1 vCPU, frontend 128MB / 0.25 vCPU

## Rationale

- **Vue 3 + Tailwind**: Inherited from codex-mobile fork. Reuses 90% of existing UI (chat streaming, threads, terminal, file browser, dark/light theme, mobile responsive). Only the bridge layer changes.
- **Express 5**: codex-mobile already uses Express for its backend. Express 5 adds native async error handling. Lightweight enough for 1.5GB memory budget.
- **better-sqlite3 over Prisma/Sequelize**: Synchronous API avoids connection pool overhead. WAL mode enables concurrent reads. No external database process needed. Single-file backup (`cp codex.db codex.db.backup`).
- **TypeScript strict**: Catches adapter interface violations at compile time. Shared types between frontend and backend eliminate contract drift.
- **Docker Compose**: Single-command deployment (`docker compose up -d`). Optional `--profile routers` for community sidecars. Caddy for production SSL.
- **Vitest**: Native ESM, TypeScript-first, compatible with Vue 3 test utils.
- **Node.js 22 LTS**: Current LTS with native fetch, stable ESM, and performance improvements.

## Alternatives Considered

### Frontend
- **React + Next.js**: Rejected. Would require rewriting codex-mobile from scratch. Vue 3 fork saves weeks of work.
- **Svelte/SvelteKit**: Rejected. Same rewrite cost, smaller ecosystem for the component patterns we need.

### Backend
- **Fastify**: Considered for higher throughput, but codex-mobile already has Express patterns. Migration cost outweighs marginal performance gain on a 4-tenant system.
- **NestJS**: Rejected. Heavy framework overhead, excessive abstraction for our adapter-based architecture.
- **Bun runtime**: Rejected. SQLite driver compatibility issues. Node.js 22 LTS is more stable for production VPS.

### Database
- **PostgreSQL**: Rejected. Requires separate container (~256MB RAM). Overkill for expected data volume (<5GB). SQLite WAL handles our read-heavy workload.
- **SQLite via Prisma**: Rejected. Prisma's query engine adds ~100MB memory overhead. better-sqlite3 is synchronous, zero-overhead, and sufficient for our scale.

### Deployment
- **Kubernetes**: Rejected. Far too heavy for single-VPS deployment. Docker Compose is the right abstraction.
- **Bare metal (no containers)**: Rejected. Containers provide reproducible builds, resource limits, and clean sidecar management for community routers.

## Acceptance Criteria

- [ ] `src/backend/` contains Express 5 + TypeScript project with `tsconfig.json`
- [ ] `src/frontend/` contains forked codex-mobile with `package.json`
- [ ] `src/shared/types.ts` defines shared TypeScript types
- [ ] `docker-compose.yml` starts both services
- [ ] SQLite database initializes with WAL mode on first run
- [ ] Backend enforces `--max-old-space-size=1024`
- [ ] All TypeScript compiles under strict mode with no `any` types
- [ ] `npm test` runs Vitest suite in backend

## References

- [SPEC-001: Folder Structure](SPEC-001-folder-structure.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [VPS Constraints](../../knowledge/architecture/vps-constraints.md)
- [codex-mobile](https://github.com/friuns2/codex-mobile) — frontend fork source
