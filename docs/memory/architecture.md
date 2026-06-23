# Architecture Memory

Append-only log of architectural decisions.

## 2026-06-22 — Initial structure

Adopted the agentic engineering folder layout: `docs/` for all AI-readable documentation (knowledge, memory, context, specs, features, brainstorming, todos, index), `logs/` for telemetry and session records, `tests/` for TDD (unit/integration/e2e), `src/` for production code. This mirrors the proven pattern where each folder has a single, clear audience and lifecycle.
