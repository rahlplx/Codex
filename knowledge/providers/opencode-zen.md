---
type: Provider Adapter
title: OpenCode Zen
description: Free curated coding models optimized for coding agents via opencode.ai/zen/v1 API. Already integrated in codex-mobile as zenProxy.ts.
resource: https://opencode.ai/zen
tags: [provider, free, tier-1, coding-models, opencode]
timestamp: 2026-06-22T00:00:00Z
---

# OpenCode Zen Adapter

OpenCode Zen is an AI gateway providing curated, benchmarked models specifically for coding agents. OpenCode sells at cost with no markup — only processing fees.

## Connection

| Field | Value |
|-------|-------|
| Base URL | `https://opencode.ai/zen/v1` |
| Responses API | `https://opencode.ai/zen/v1/responses` |
| Chat Completions | `https://opencode.ai/zen/v1/chat/completions` |
| Auth | None (free) / API key (paid tier) |
| Wire API | `responses` (native) or `chat` |
| Streaming | SSE supported |

## Existing Implementation

codex-mobile already has this adapter in `src/server/zenProxy.ts`:
- Local route: `/codex-api/zen-proxy/v1/responses`
- Uses `responsesPayloadFormat: "chat"` for Chat Completions translation
- Integrated with the unified responses proxy layer

## Configuration

```yaml
opencode-zen:
  enabled: true
  tier: free
  base_url: "https://opencode.ai/zen/v1"
  wire_api: responses
  priority: 1
```

## Codex CLI Integration

```bash
codex app-server \
  -c 'model_provider="opencode-zen"' \
  -c 'model_providers.opencode-zen.base_url="http://127.0.0.1:PORT/codex-api/zen-proxy/v1"' \
  -c 'model_providers.opencode-zen.wire_api="responses"'
```

## Related

- [Proxy Layer](/architecture/proxy-layer.md)
- [OpenRouter](/providers/openrouter.md) (fallback)
- [Model Routing](/models/model-routing.md)
