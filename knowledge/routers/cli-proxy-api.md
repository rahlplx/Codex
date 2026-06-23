---
type: Router Integration
title: CLIProxyAPI
description: Multi-CLI proxy wrapping Antigravity, Codex, Claude Code, Grok Build as OpenAI-compatible API. Has companion WebUI management center and EasyCLI desktop app.
resource: https://github.com/router-for-me/CLIProxyAPI
tags: [router, tier-2, sidecar, proxy, management-ui]
timestamp: 2026-06-22T00:00:00Z
---

# CLIProxyAPI Integration

CLIProxyAPI wraps multiple AI CLIs as OpenAI/Gemini/Claude/Codex compatible API with a management WebUI and desktop monitoring app.

## Supported CLIs

| CLI | Models |
|-----|--------|
| Antigravity | Gemini 3.1 Pro |
| ChatGPT Codex | GPT 5.5 |
| Claude Code | Claude |
| Grok Build | Grok 4.3 |

## Ecosystem

| Tool | Purpose |
|------|---------|
| CLIProxyAPI | Core proxy server |
| [Management Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center) | React WebUI for config and monitoring |
| [EasyCLI](https://github.com/router-for-me/EasyCLI) | Tauri desktop app for quota monitoring |

## Install Options

- Homebrew (macOS)
- Docker
- Build from source

## Docker Sidecar Config

```yaml
cli-proxy-api:
  image: ghcr.io/router-for-me/cliproxyapi:latest
  ports:
    - "8080:8080"
  volumes:
    - ./config/cliproxyapi:/app/config
  profiles:
    - routers
```

## Related

- [CliRelay](/routers/cli-relay.md) (alternative)
- [AIClient2API](/routers/ai-client-2-api.md) (alternative)
