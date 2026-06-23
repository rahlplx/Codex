---
type: Router Integration
title: AIClient2API
description: Simulates CLI client requests for Gemini, Antigravity, Codex, Grok, Kiro. Account pool management, auto-failover, 50+ API endpoints. Claims 99.9% uptime.
resource: https://github.com/justlovemaki/AIClient2API
tags: [router, tier-2, sidecar, account-pool, failover, simulation]
timestamp: 2026-06-22T00:00:00Z
---

# AIClient2API Integration

AIClient2API breaks through client limitations by converting free CLI-only models into standard OpenAI-compatible interfaces. Uses strategy and adapter patterns with account pool management.

## Supported CLIs

| CLI | Free Models |
|-----|-------------|
| Gemini CLI | Gemini models |
| Antigravity | Gemini 3.x |
| Codex | GPT models |
| Grok / Grok Build | Grok 4.x |
| Kiro | Built-in Claude |

## Key Features

- Intelligent conversion between OpenAI, Claude, and Gemini protocols
- Account pool management with polling
- Auto-failover and health checks
- 50+ API endpoints with self-discovery
- v3.0.0 "Deep AI Integration & Self-Discovery Architecture"
- Remote `/api/help` and `/api/example` endpoints
- AI agents can auto-discover and operate all endpoints

## Architecture

Built on Node.js with:
- Strategy pattern for provider switching
- Adapter pattern for protocol translation
- Built-in health monitoring
- Modular, extensible design

## Docker Sidecar Config

```yaml
ai-client-2-api:
  image: ghcr.io/justlovemaki/aiclient2api:latest
  ports:
    - "3100:3100"
  volumes:
    - ./config/aiclient2api:/app/config
  profiles:
    - routers
```

## Related

- [CliRelay](/routers/cli-relay.md) (alternative)
- [CLIProxyAPI](/routers/cli-proxy-api.md) (alternative)
