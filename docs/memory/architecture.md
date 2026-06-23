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

## 2026-06-23 — codex-mobile UI integration (SPEC-004)

**Frontend base**: `frontend/` = https://github.com/friuns2/codex-mobile verbatim (Vue 3 + Tailwind 4 + Vite, 6123-line App.vue). Design system rules: `@reference "tailwindcss"` in scoped styles, `:root.dark .class` dark overrides, zinc-* neutrals, emerald/amber/rose/sky accents, Tabler icons, `rounded-xl` cards, `shadow-sm`.  
**New routes**: `/providers` → `ProviderDashboard.vue`, `/models` → `ModelCatalog.vue`. Both use `EmptyRouteView` pattern and `defineAsyncComponent` imports.  
**New components**: `ProviderCard` (status dot, tier badge, metrics pills, optional toggle), `ProviderDashboard` (3 tabs: Direct CLIs / Routers / Savings, polls `/api/providers` every 30s), `ModelCatalog` (search + tier/provider filter chips + sortable table, polls `/api/models`).  
**App.vue**: sidebar nav buttons follow `.sidebar-skills-link` pattern; `ContentHeader` `:accent` extended; content body branches after `isAutomationsRoute`; computed `isProvidersRoute` / `isModelsRoute`; `contentTitle` updated.  
**Never modify**: `codexAppServerBridge.ts` (9656 lines), `freeMode.ts`, `unifiedResponsesProxy.ts` — these are Phase 2 (server bridge replacement).

## 2026-06-23 — SidecarAdapter base class (shared OpenAI-compatible protocol)

All community router sidecars (9Router, CliRelay, CLIProxyAPI, AIClient2API) extend `SidecarAdapter` which extends `AdapterBase`. Each concrete class only defines: `id`, `name`, `tier`, `defaultBaseUrl`, `fallbackModels`. The base handles healthCheck (GET /models), getQuota (unlimited), supportedModels (dynamic via /models + fallback), chatCompletion, and chatCompletionStream — all through OpenAI-compatible endpoints. Optional chaining on all API response fields prevents crashes from malformed responses.

## 2026-06-23 — Caddy reverse proxy for production

Production deployment uses Caddy (via `deploy/docker-compose.prod.yml`) for automatic TLS, API proxying (`/api/* → backend:3001`), SPA serving (try_files with fallback to index.html), security headers (X-Frame-Options, CSP, HSTS), and gzip/zstd compression. Zero-config HTTPS via ACME.

## 2026-06-23 — Telegram bot bridge architecture

Polling-based (not webhook) to work behind NAT/firewalls without public URL. Maps Telegram chat IDs to backend thread IDs. Commands: /start, /help, /newthread, /chat, /status. Thread creation is centralized in `createThread()` helper. Chat completions include full thread history for context. Error handling: polling errors logged, thread/completion failures reported to user. Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_USER_IDS, TELEGRAM_BACKEND_URL.

## 2026-06-23 — SQLite for thread/message persistence

Single-file SQLite at `DATABASE_PATH=/app/data/codex.db`. Schema: `threads(id, user_id, title, created_at, archived)`, `messages(id, thread_id, role, content, provider_id, model_id, ts)`. No external DB dependency — simplifies single-VPS deploys and backup (snapshot the data volume).
