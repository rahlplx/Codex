---
type: Provider Adapter
title: Nemotron / NVIDIA NIM
description: Free NVIDIA Nemotron models via build.nvidia.com NIM API. OpenAI-compatible endpoint, no API key required for free tier.
resource: https://developer.nvidia.com/nemotron
tags: [provider, free, tier-1, nvidia, nemotron, nim]
timestamp: 2026-06-22T00:00:00Z
---

# Nemotron / NVIDIA NIM Adapter

NVIDIA provides free access to Nemotron models through their NIM (NVIDIA Inference Microservices) platform at build.nvidia.com. The API is OpenAI-compatible.

## Connection

| Field | Value |
|-------|-------|
| Base URL | `https://integrate.api.nvidia.com/v1` |
| Auth | Free tier: no key needed / Paid: NIM API key |
| Wire API | OpenAI Chat Completions (native) |
| Streaming | SSE supported |

## Models

| Model | Parameters | Active Params | Best For |
|-------|-----------|---------------|----------|
| Nemotron 3 Ultra | — | 55B | Agent orchestration, deep research |
| Nemotron 3 Super | 120B | 12B (MoE) | Fast coding, 50%+ faster generation |
| Nemotron 2 | — | — | General purpose |

## Free Tier Details

- 100+ AI models available free on build.nvidia.com
- No credit card required
- Puter.js provides unlimited access wrapper
- Rate limited but generous for individual use
- Also available free via [OpenRouter](/providers/openrouter-free.md)

## Configuration

```yaml
nemotron:
  enabled: true
  tier: free
  base_url: "https://integrate.api.nvidia.com/v1"
  priority: 4
  models:
    - nvidia/nemotron-3-super-120b
    - nvidia/nemotron-3-ultra
```

## Related

- [OpenRouter Free](/providers/openrouter-free.md) (also serves Nemotron)
- [Model Routing](/models/model-routing.md)
