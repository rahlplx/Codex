---
type: Router Integration
title: 9Router
description: 18k-star open-source AI router with 40+ providers, RTK token compression (20-40% savings), and 3-tier auto-fallback.
resource: https://github.com/decolua/9router
tags: [router, tier-2, sidecar, rtk, compression, fallback]
timestamp: 2026-06-22T00:00:00Z
---

# 9Router Integration

9Router is the most popular open-source AI coding router (18.1k GitHub stars). It routes requests across 40+ providers with RTK token compression and smart fallback.

## Key Features

| Feature | Details |
|---------|---------|
| Providers | 40+ (Kiro, OpenCode Free, Vertex, and more) |
| RTK Compression | 20-40% token savings on tool outputs (git diffs, grep, find, ls, tree) |
| Fallback | 3-tier: maximize subscriptions → cheap models → free models |
| Format Translation | OpenAI ↔ Anthropic ↔ Gemini format conversion |
| Dashboard | Local at `http://localhost:20128` |
| API Endpoint | `http://localhost:20128/v1` |

## Free Providers (2026)

| Provider | Status |
|----------|--------|
| Kiro | Free |
| OpenCode Free | Free |
| Vertex | Free |
| iFlow | Discontinued 2026 |
| Qwen | Discontinued 2026 |
| Gemini CLI | Discontinued 2026 |

## Docker Sidecar Config

```yaml
nine-router:
  image: ghcr.io/decolua/9router:latest
  ports:
    - "20128:20128"
  volumes:
    - ./config/9router:/app/config
  profiles:
    - routers
```

## Backend Integration

```yaml
nine-router:
  enabled: true
  tier: free
  type: sidecar
  base_url: "http://nine-router:20128/v1"
  priority: 10
  features:
    - rtk-compression
    - auto-fallback
    - format-translation
```

## Related

- [CliRelay](/routers/cli-relay.md) (alternative router)
- [Provider Catalog](/providers/index.md)
- [Model Routing](/models/model-routing.md)
