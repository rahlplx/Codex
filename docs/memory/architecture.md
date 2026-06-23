# Architecture Memory

Append-only log of architectural decisions.

## 2026-06-22 — Initial structure

Adopted the agentic engineering folder layout: `docs/` for all AI-readable documentation (knowledge, memory, context, specs, features, brainstorming, todos, index), `logs/` for telemetry and session records, `tests/` for TDD (unit/integration/e2e), `src/` for production code. This mirrors the proven pattern where each folder has a single, clear audience and lifecycle.

## 2026-06-23 — WebUI tech stack locked (SPEC-002)

**Frontend**: Vue 3.5 + Composition API + `<script setup>` | Tailwind CSS 4 | Vite 6 | TypeScript strict | Vue Router 4.3  
**Backend**: Node.js ≥22 LTS | Express 5 | TypeScript strict (tsup compile) | SQLite (better-sqlite3 9)  
**Tests**: Vitest 2 (both frontend and backend)  
**Deploy**: Docker Compose (base: frontend+backend) + `--profile routers` (Tier 2 sidecars) + prod profile (Caddy)

## 2026-06-23 — ICliAdapter interface + 3-tier routing (SPEC-003)

All provider adapters implement `ICliAdapter` (defined in `src/types/adapter.ts`). The `AdapterRegistry` holds live instances; the `Router` scores each healthy adapter using: `score = errorRate*0.5 + latencyScore*0.3 + quotaScore*0.2` and picks the highest. Fallback chain: Tier 1 free CLIs → Tier 2 community routers → Tier 3 paid/self-hosted. Health scores are cached 30s; re-evaluated on adapter error.

## 2026-06-23 — SQLite for thread/message persistence

Single-file SQLite at `DATABASE_PATH=/app/data/codex.db`. Schema: `threads(id, user_id, title, created_at, archived)`, `messages(id, thread_id, role, content, provider_id, model_id, ts)`. No external DB dependency — simplifies single-VPS deploys and backup (snapshot the data volume).
