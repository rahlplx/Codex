# Architecture Memory

Append-only log of architectural decisions.

## 2026-06-22 — Initial structure

Adopted the agentic engineering folder layout: `docs/` for all AI-readable documentation (knowledge, memory, context, specs, features, brainstorming, todos, index), `logs/` for telemetry and session records, `tests/` for TDD (unit/integration/e2e), `src/` for production code. This mirrors the proven pattern where each folder has a single, clear audience and lifecycle.

## 2026-06-23 — WebUI architecture: hybrid layered backend

Chose hybrid layered backend over pure router or custom orchestrator. Three reasons: (1) direct CLI adapters give first-party free tokens without middlemen, (2) community routers provide pooling/fallback as Docker sidecars, (3) we control orchestration logic (priority, quota, health) at our layer. If a community router goes down, direct adapters still work.

## 2026-06-23 — Frontend: fork codex-mobile

Fork [codex-mobile](https://github.com/friuns2/codex-mobile) (Vue 3 + Tailwind + Vite + Express) instead of building from scratch. Reuse 90% of UI: chat streaming, threads, terminal, file browser, git review, dark/light theme, mobile responsive. Only replace the `codexAppServerBridge.ts` bridge layer (~1 file) to make it CLI-agnostic.

## 2026-06-23 — OKF v0.1 for project knowledge

Adopted Google's Open Knowledge Format (OKF) v0.1 for `knowledge/` directory. Each concept = one markdown file with YAML frontmatter. Only required field is `type`. Cross-references via markdown links create a navigable knowledge graph. Both humans and AI agents parse the same files — no translation layer needed.

## 2026-06-23 — Multi-tenant with fair-share quotas

Multi-tenant architecture on single VPS (4 vCPU, 8GB RAM). Per-tenant API keys encrypted with AES-256-GCM. Free-tier providers pooled with fair-share quota (100k tokens/day/tenant default). JWT sessions, admin/user roles. SQLite for all persistence (WAL mode, 64MB page cache).

## 2026-06-23 — Telemetry-driven model routing

Dynamic model registry because free models change daily/weekly. Discovery scanner (hourly), health prober (60s), circuit breakers (3 failures → open → 5min recovery). Composite scoring: 35% reliability + 25% speed + 20% quality + 15% cost + 5% recency. All routing data-driven from request telemetry, not static config.

## 2026-06-23 — Dual documentation systems

Project uses two complementary doc systems: (1) `docs/` — agentic engineering docs (memory, context, specs, features, todos, brainstorming, agents) following CLAUDE.md conventions, (2) `knowledge/` — OKF v0.1 knowledge base for domain knowledge (providers, routers, models, architecture, design). `docs/` is workflow-oriented; `knowledge/` is reference-oriented.
