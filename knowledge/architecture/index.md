---
type: Index
title: Architecture Overview
description: High-level architecture for the Codex Agent WebUI — self-hostable coding agent with multi-CLI backend, multi-tenant, telemetry-driven routing.
tags: [architecture, overview, index]
timestamp: 2026-06-22T00:00:00Z
---

# Architecture Overview

## System Design

```
Users (Browser/Mobile/Telegram)
         │
    Caddy (SSL + Reverse Proxy)
         │
    ┌────┴────┐
    │         │
Frontend  Backend
(Vue 3)   (Express)
             │
        Orchestrator
      ┌──────┼──────┐
   Tier 1  Tier 2  Tier 3
   Free    Routers  Paid
   CLIs    Sidecars  BYOK
```

## Components

- [Frontend Architecture](/architecture/frontend.md) — Vue 3 SPA (fork of codex-mobile)
- [Backend Architecture](/architecture/backend.md) — Express 5 + SQLite
- [CLI Orchestrator](/architecture/orchestrator.md) — Smart routing, fallback, telemetry
- [Proxy Layer](/architecture/proxy-layer.md) — Responses API ↔ Chat Completions translation
- [Multi-Tenant](/architecture/multi-tenant.md) — User isolation, per-tenant keys, fair-share quotas
- [VPS Constraints](/architecture/vps-constraints.md) — Optimization for 4 vCPU, 8GB RAM
- [Deployment](/architecture/deployment.md) — Docker Compose + Caddy

## Key Design Principles

1. **Free-first** — maximize free AI tokens, paid as last resort
2. **Self-healing** — dynamic model registry adapts to daily/weekly provider changes
3. **Data-driven** — telemetry scores models by reliability, speed, quality, cost
4. **Multi-tenant** — isolated users sharing one VPS, fair quota pooling
5. **Resource-conscious** — everything fits in 8GB RAM with headroom
6. **OKF-documented** — all knowledge in agent-readable OKF format

## Data Flow

See [Model Routing](/models/model-routing.md) for the full routing algorithm.

## Related

- [Provider Catalog](/providers/index.md)
- [Router Catalog](/routers/index.md)
- [Free Models](/models/free-models.md)
