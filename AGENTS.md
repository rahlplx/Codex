# Codex Agent WebUI — Agentic Engineering Guide

> This file serves as the primary context document for AI coding agents (Claude Code, Cursor, Copilot, OpenCode, KiloCode, etc.) working on this codebase. It follows patterns distilled from Open Design's 17-CLI adapter system, codex-mobile's AGENTS.md, and community best practices for vibe coding with AI agents.

## Project Identity

- **Name**: Codex Agent WebUI
- **Purpose**: Self-hostable coding agent WebUI with multi-CLI backend
- **Stack**: Vue 3 + Tailwind CSS 4 + Vite 6 (frontend) | Node.js + Express 5 + SQLite (backend)
- **Deploy**: Docker Compose on VPS (4 vCPU, 8GB RAM, 75GB NVMe)
- **Users**: Multi-tenant (multiple users per instance)

## Architecture Quick Reference

```
Frontend (Vue 3 SPA)  →  Backend (Express)  →  CLI Orchestrator  →  Providers
     Port 80/443           Port 3001              ┌─ Tier 1: Free CLIs
                                                   ├─ Tier 2: Community Routers (Docker sidecars)
                                                   └─ Tier 3: Paid/Self-hosted
```

See `ARCHITECTURE.md` for full details.

## Knowledge Base

All project knowledge lives in `knowledge/` using Google's [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).

**Before making changes**, read the relevant OKF docs:
- Providers: `knowledge/providers/*.md`
- Routers: `knowledge/routers/*.md`
- Models: `knowledge/models/*.md`
- Architecture: `knowledge/architecture/*.md`
- Runbooks: `knowledge/runbooks/*.md`

**After making changes**, update the relevant OKF doc and `knowledge/log.md`.

---

## Development Rules

### Code Style

- **TypeScript strict mode** everywhere
- **No `any` types** — use `unknown` + type guards
- **No default exports** — named exports only
- **No barrel files** (`index.ts` re-exporting everything) — import from source
- **No classes unless stateful** — prefer functions and interfaces
- **Tailwind CSS** for all styling — no inline styles, no CSS modules
- **Vue 3 Composition API** with `<script setup>` — no Options API

### File Organization

```
src/
├── server/          # Express backend (TypeScript, compiled with tsup)
├── api/             # Frontend API layer (gateway, RPC client)
├── components/      # Vue SFC components
│   ├── content/     # Main content area components
│   ├── sidebar/     # Sidebar components
│   ├── layout/      # Layout wrappers
│   ├── providers/   # Provider management UI (NEW)
│   └── icons/       # SVG icon components
├── composables/     # Vue composables (useXxx pattern)
├── types/           # Shared TypeScript types
├── router/          # Vue Router config
└── utils/           # Pure utility functions
```

### Git Workflow

- **Branch naming**: `feat/description`, `fix/description`, `refactor/description`
- **Commit messages**: imperative mood, one sentence, why not what
- **PR scope**: one logical change per PR — no monster PRs
- **Before merging**: check CI, check live state, verify no conflicts
- **Never force push** to main/shared branches

### Testing Strategy

- **Unit tests**: Vitest for pure functions, adapters, routing logic
- **Integration tests**: Test provider adapters against real (free) endpoints
- **E2E tests**: Playwright for critical UI flows
- **Manual verification**: Always test in browser before marking UI work done
- **Provider health tests**: Automated hourly probe of all active providers

### Performance Constraints (VPS: 4 vCPU, 8GB RAM)

- Backend Node.js heap: max 1GB (`--max-old-space-size=1024`)
- SQLite with WAL mode, 64MB page cache
- No Prometheus/Grafana — use built-in telemetry + health endpoint
- Frontend: pre-built SPA via Nginx, not Vite dev server in production
- Stream responses via SSE — never buffer full LLM responses in memory
- Docker resource limits enforced on all containers

---

## Adapter Development Guide

When adding a new CLI/provider adapter:

### 1. Create OKF doc first

```yaml
# knowledge/providers/new-provider.md
---
type: Provider Adapter
title: New Provider Name
description: One-line description
resource: https://provider-url.com
tags: [provider, free/paid, tier-1/2/3]
timestamp: 2026-XX-XXT00:00:00Z
---
```

### 2. Implement the adapter interface

```typescript
// backend/src/adapters/new-provider.ts
import { ICliAdapter, ChatCompletionRequest, ChatCompletionResponse } from '../types/adapter';

export const newProviderAdapter: ICliAdapter = {
  id: 'new-provider',
  name: 'New Provider',
  tier: 'free',
  supportsStreaming: true,
  supportsToolUse: false,
  supportsReasoning: false,
  
  async supportedModels() { /* ... */ },
  async healthCheck() { /* ... */ },
  async getQuota() { /* ... */ },
  async chatCompletion(req) { /* ... */ },
  async *chatCompletionStream(req) { /* ... */ },
  async initialize(config) { /* ... */ },
  async shutdown() { /* ... */ },
};
```

### 3. Register in adapter registry

```typescript
// backend/src/adapters/registry.ts
import { newProviderAdapter } from './new-provider';
registry.register(newProviderAdapter);
```

### 4. Add health probe

The health monitor auto-discovers registered adapters — just implement `healthCheck()`.

### 5. Update the model catalog

Add the provider's models to `knowledge/models/free-models.md`.

### 6. Write tests

```typescript
// backend/src/adapters/__tests__/new-provider.test.ts
describe('NewProvider adapter', () => {
  it('should list available models', async () => { /* ... */ });
  it('should handle rate limits gracefully', async () => { /* ... */ });
  it('should stream responses', async () => { /* ... */ });
});
```

---

## Multi-Tenant Rules

- **All queries must be tenant-scoped** — never leak data between users
- **API keys encrypted at rest** with AES-256-GCM, per-tenant encryption key
- **Free tier pooling** — fair-share quota per tenant on shared providers
- **Admin role** can manage all tenants, view aggregate telemetry
- **User role** can only see own threads, keys, and usage

## UI/UX Rules

- **No native `<select>` dropdowns** — use custom dropdown components
- **Dark theme first** — all colors in CSS variables, test in both themes
- **Mobile responsive** — test on 375px width minimum
- **Loading states** — every async action shows a spinner or skeleton
- **Error states** — every error shows actionable recovery guidance
- **Provider cards** — Hermes-style visual cards for API key management
- **Real-time status** — WebSocket for streaming, provider health, quota updates

## Telegram Bot Bridge

Maintained from codex-mobile. Config via env vars:
- `TELEGRAM_BOT_TOKEN` — Bot API token
- `TELEGRAM_ALLOWED_USER_IDS` — Comma-separated allowed user IDs
- `TELEGRAM_DEFAULT_CWD` — Default working directory
- Also receives quota exhaustion and provider-down alerts

## Docker Operations

```bash
# Start core services (frontend + backend)
docker compose up -d

# Start with community routers
docker compose --profile routers up -d

# View resource usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# View logs
docker compose logs -f backend

# Backup SQLite DB
docker compose exec backend cp /app/data/codex.db /app/data/codex.db.backup
```

---

## Workflow: Spec → Design → Build → Ship

This project follows a structured flow:

1. **Spec** — Architecture decisions in `ARCHITECTURE.md`, requirements in OKF docs
2. **UI/UX Design** — Screen mockups in `knowledge/design/` (ASCII wireframes + Figma links)
3. **Features** — Implementation tracked in GitHub Issues with OKF feature specs
4. **OSS Research** — Meta-learnings from codex-mobile, Open Design, 9Router, CliRelay etc. stored in `knowledge/research/`
5. **Build** — Follow adapter guide above, test, PR
6. **Ship** — Docker build, push, deploy, verify health

## Reference Repos & Learnings

| Repo | What We Learned |
|------|----------------|
| [codex-mobile](https://github.com/friuns2/codex-mobile) | Vue 3 SPA + Express bridge, free key rotation, proxy architecture |
| [Open Design](https://github.com/nexu-io/open-design) | 17-CLI adapter patterns, skill system, DESIGN.md conventions |
| [9Router](https://github.com/decolua/9router) | RTK compression, multi-provider fallback, scoring |
| [CliRelay](https://github.com/kittors/CliRelay) | OAuth wrapping, account pool, web management |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | CLI proxy patterns, Homebrew distribution |
| [AIClient2API](https://github.com/justlovemaki/AIClient2API) | Client simulation, failover, self-discovery API |
