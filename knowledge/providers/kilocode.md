---
type: Provider Adapter
title: KiloCode CLI
description: Free-forever AI coding agent with 500+ models via OpenRouter integration. Available as CLI, VS Code, and JetBrains extension.
resource: https://kilo.ai/cli
tags: [provider, free, tier-1, kilocode, openrouter]
timestamp: 2026-06-22T00:00:00Z
---

# KiloCode CLI Adapter

Kilo Code is an open-source coding agent available in IDE (VS Code, JetBrains) and CLI. Free tier is forever with zero markup on AI tokens.

## Connection

| Field | Value |
|-------|-------|
| Install | `npm i -g @kilocode/cli` |
| Auth | BYOK (bring your own key) or free models |
| Models | 500+ via OpenRouter, direct provider APIs |
| Wire API | OpenAI Chat Completions |
| Markup | Zero — exact provider rates |

## Key Features

- Free for individual use forever
- 500+ models via OpenRouter integration
- Specialized agents (switchable mid-task)
- Custom agent creation
- Direct provider key support (Anthropic, OpenAI, Google)
- Local model support (Ollama, on-device)

## Integration Strategy

1. **As OpenRouter passthrough** — KiloCode uses OpenRouter under the hood, so we can integrate at the OpenRouter API level
2. **CLI wrapper** — spawn `kilocode` CLI process for agentic tasks
3. **Direct API** — use `https://api.kilo.ai/v1` if available

## Configuration

```yaml
kilocode:
  enabled: true
  tier: free
  base_url: "https://api.kilo.ai/v1"
  priority: 3
  models:
    - via-openrouter
```

## Related

- [OpenRouter](/providers/openrouter.md) (underlying provider)
- [9Router](/routers/nine-router.md) (can route through KiloCode)
