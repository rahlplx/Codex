# Feature: F002 — Frontend Scaffold + Provider Dashboard

**Status:** In Progress  
**Spec:** [SPEC-004](../specs/SPEC-004-frontend-scaffold.md)  
**Branch:** `claude/project-folder-structure-uosdsk`

## Summary

Vite 6 + Vue 3 + Tailwind 4 frontend with three views: Provider Dashboard, Model Catalog, and Chat stub. The Provider Dashboard is the first fully functional screen — it polls `/api/providers` every 30s and displays health/quota cards with status badges.

## Acceptance Criteria

- [x] `npm run dev` starts on port 5173 with HMR
- [x] `npm run build` compiles TypeScript cleanly
- [x] Provider Dashboard renders health cards with correct status colours
- [x] Status badge component: green=healthy, yellow=degraded, red=error, grey=offline
- [x] Dark mode toggle persists to `localStorage`
- [x] Mobile sidebar collapses at 768px breakpoint
- [ ] Live provider polling from backend (requires F001 running)
- [ ] Streaming chat responses via WebSocket/SSE (next feature)

## Screen Layouts

See `SPEC-004` for full ASCII wireframes of all 3 screens.

## Test Coverage

- Unit: `tests/unit/frontend/ProviderCard.test.ts` (component logic)
- Unit: `tests/unit/frontend/StatusBadge.test.ts`
- E2E: `tests/e2e/provider-dashboard.test.ts` (Playwright — placeholder)
