---
type: Index
title: Community Routers
description: Tier 2 community-built router/proxy tools that pool CLI OAuth sessions, provide auto-fallback, and multiply free token access.
tags: [routers, tier-2, community, sidecar]
timestamp: 2026-06-22T00:00:00Z
---

# Community Routers (Tier 2)

These are open-source projects that wrap multiple AI CLIs as unified OpenAI-compatible APIs. They run as Docker sidecars alongside our backend.

## Why Sidecars

- Each router has its own dependencies and update cycle
- Isolation: one crashing router doesn't take down the backend
- Easy to add/remove with Docker Compose profiles
- They handle OAuth flows, account pooling, and failover internally

## Available Routers

| Router | Repo | Key Feature |
|--------|------|-------------|
| [9Router](/routers/nine-router.md) | [decolua/9router](https://github.com/decolua/9router) | RTK compression (20-40% token savings), 40+ providers |
| [CliRelay](/routers/cli-relay.md) | [kittors/CliRelay](https://github.com/kittors/CliRelay) | Native OAuth for 7+ CLIs, web control panel |
| [CLIProxyAPI](/routers/cli-proxy-api.md) | [router-for-me/CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | Multi-CLI proxy, Homebrew/Docker install, management WebUI |
| [AIClient2API](/routers/ai-client-2-api.md) | [justlovemaki/AIClient2API](https://github.com/justlovemaki/AIClient2API) | Account pool, auto-failover, 99.9% uptime, 50+ API endpoints |

## Integration Pattern

All routers expose OpenAI-compatible `/v1/chat/completions` endpoints. Our backend treats them as just another adapter:

```
Backend Orchestrator
  → checks Tier 1 adapters first (direct free CLIs)
  → if all at quota, routes to Tier 2 sidecar
  → sidecar handles OAuth, pooling, fallback internally
  → returns OpenAI-compatible response
```
