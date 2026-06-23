# Feature: F001 — Backend Scaffold

**Status:** In Progress  
**Spec:** [SPEC-003](../specs/SPEC-003-backend-scaffold.md)  
**Branch:** `claude/project-folder-structure-uosdsk`

## Summary

Establishes the Express 5 + TypeScript backend with the `ICliAdapter` interface, `AdapterRegistry`, scoring router, and a working `/health` endpoint. This is the minimum foundation all provider adapters build on.

## Acceptance Criteria

- [x] `GET /health` → `200 {"status":"ok","ts":"..."}`
- [x] `GET /api/providers` → JSON list of registered adapters
- [x] `GET /api/models` → aggregated model list (empty until adapters added)
- [x] `ICliAdapter` interface enforced by TypeScript — any adapter missing a method is a compile error
- [x] `AdapterRegistry.register()` / `.resolve()` / `.list()` work correctly
- [x] `Router.route()` returns highest-scoring healthy adapter or throws `NoAdapterAvailable`
- [x] Unit tests: registry (4 cases), router (5 cases) — all green via `npm test`
- [ ] Integration test: real HTTP server responds to `/health` (requires node, no provider needed)

## Implementation Notes

- `AdapterBase` abstract class provides: `initialize()` no-op, retry wrapper, logger prefix
- `HealthStatus.score` is precomputed by the adapter's `healthCheck()` and cached for 30s
- Router only re-scores when cache is stale or an adapter returns an error

## Test Coverage

- Unit: `tests/unit/adapters/registry.test.ts`
- Unit: `tests/unit/orchestrator/router.test.ts`
- Integration: `tests/integration/backend/health.test.ts` (placeholder)
