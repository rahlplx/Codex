---
type: Router Integration
title: CliRelay
description: Wraps Gemini CLI, Antigravity, ChatGPT Codex, Claude Code, Qwen Code, iFlow as unified OpenAI-compatible API with native OAuth and web control panel.
resource: https://github.com/kittors/CliRelay
tags: [router, tier-2, sidecar, oauth, account-pool, cli-wrapper]
timestamp: 2026-06-22T00:00:00Z
---

# CliRelay Integration

CliRelay wraps multiple AI CLIs as a unified OpenAI/Gemini/Claude/Codex compatible API service with native OAuth flows, routing groups, failover, request logging, and a web management panel.

## Supported CLIs

| CLI | Auth Type |
|-----|-----------|
| Gemini CLI | OAuth |
| Antigravity | OAuth |
| ChatGPT Codex | OAuth |
| Claude Code | OAuth |
| Qwen Code | OAuth |
| iFlow | OAuth |
| Kimi | Cookie/browser |

## Key Features

- Native OAuth flows for all supported CLIs
- Device/browser/cookie auth variants
- Routing groups with failover
- Request logging and quota control
- Model pricing awareness
- API-key self-service
- Web control panel at `/manage`
- Storage backends: local files, PostgreSQL, Git, S3

## Docker Sidecar Config

```yaml
cli-relay:
  image: ghcr.io/kittors/clirelay:latest
  ports:
    - "3456:3456"
  volumes:
    - ./config/clirelay:/app/config
  profiles:
    - routers
```

## Related

- [CLIProxyAPI](/routers/cli-proxy-api.md) (similar tool)
- [AIClient2API](/routers/ai-client-2-api.md) (similar tool)
- [Antigravity](/providers/antigravity.md) (direct adapter alternative)
