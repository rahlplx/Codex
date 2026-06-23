---
type: Index
title: Provider Catalog
description: All supported AI providers organized by tier. Tier 1 are direct CLI adapters with free tokens, Tier 2 are community routers, Tier 3 is paid fallback.
tags: [providers, catalog, index]
timestamp: 2026-06-22T00:00:00Z
---

# Provider Catalog

## Tier 1 — Direct CLI Adapters (Free Tokens)

| Provider | Free Tier | Models | Priority |
|----------|-----------|--------|----------|
| [OpenCode Zen](/providers/opencode-zen.md) | Yes | Curated coding models | 1 |
| [Antigravity](/providers/antigravity.md) | Yes | Gemini 3.5 Flash | 2 |
| [KiloCode](/providers/kilocode.md) | Yes | 500+ via OpenRouter | 3 |
| [Nemotron](/providers/nemotron.md) | Yes | Nemotron 3 Super/Ultra | 4 |
| [OpenRouter Free](/providers/openrouter-free.md) | Yes | Llama, Gemma, etc. | 5 |

## Tier 2 — Community Routers (Sidecars)

| Router | Stars | Providers | Features |
|--------|-------|-----------|----------|
| [9Router](/routers/nine-router.md) | 18.1k | 40+ | RTK compression, auto-fallback |
| [CliRelay](/routers/cli-relay.md) | Active | 7+ CLIs | OAuth, account pool |
| [CLIProxyAPI](/routers/cli-proxy-api.md) | Active | 4+ CLIs | WebUI management |
| [AIClient2API](/routers/ai-client-2-api.md) | Active | 5+ CLIs | Account pool, failover |

## Tier 3 — Paid / Self-hosted Fallback

| Provider | Type | Notes |
|----------|------|-------|
| [OpenRouter Paid](/providers/openrouter.md) | Paid | Full model catalog |
| [Custom Endpoint](/providers/custom-endpoint.md) | BYOK | Any OpenAI-compatible API |
| Ollama | Self-hosted | Local models, zero cost |

## Routing Strategy

Requests flow through tiers in order: Tier 1 → Tier 2 → Tier 3. See [Model Routing](/models/model-routing.md) for details.
