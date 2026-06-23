---
type: Provider Adapter
title: OpenRouter Free Tier
description: Free-tier models on OpenRouter including Llama, Gemma, and community models. codex-mobile includes 64 encrypted free keys with rotation.
resource: https://openrouter.ai
tags: [provider, free, tier-1, openrouter, key-rotation]
timestamp: 2026-06-22T00:00:00Z
---

# OpenRouter Free Tier Adapter

OpenRouter provides free access to select open-source models. codex-mobile already implements this with 64 encrypted API keys and automatic rotation in `freeMode.ts`.

## Connection

| Field | Value |
|-------|-------|
| Base URL | `https://openrouter.ai/api/v1` |
| Responses API | `https://openrouter.ai/api/v1/responses` |
| Chat Completions | `https://openrouter.ai/api/v1/chat/completions` |
| Auth | Free community keys (rotated) |
| Wire API | Both Responses and Chat Completions |
| Streaming | SSE supported |

## Free Models

| Model | Notes |
|-------|-------|
| `meta-llama/llama-3.3-70b:free` | Meta's Llama 3.3 |
| `google/gemma-4-26b:free` | Google Gemma 4 |
| `openrouter/free` | Auto-routed free model |

## Existing Implementation

codex-mobile has full implementation in:
- `src/server/freeMode.ts` — 64 encrypted keys, random rotation per session
- `src/server/openRouterProxy.ts` — API proxy with response sanitization
- Default model: `meta-llama/llama-2-7b-chat:free`
- Fallback models: `openrouter/free`, `google/gemma-4-26b-a4b-it:free`
- State persisted to `$CODEX_HOME/webui-custom-providers.json`

## Configuration

```yaml
openrouter-free:
  enabled: true
  tier: free
  base_url: "https://openrouter.ai/api/v1"
  key_rotation: true
  priority: 5
  models:
    - meta-llama/llama-3.3-70b:free
    - google/gemma-4-26b:free
    - openrouter/free
```

## Related

- [OpenRouter Paid](/providers/openrouter.md) (upgrade path)
- [KiloCode](/providers/kilocode.md) (uses OpenRouter)
