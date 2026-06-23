---
type: UI Design
title: Provider Settings Screen (Hermes-style)
description: Visual card-based UI for API key management, OAuth connections, and provider health monitoring. Inspired by Hermes agent's clean auth UX.
tags: [design, ui, ux, providers, auth, oauth, api-keys]
timestamp: 2026-06-22T00:00:00Z
---

# Provider Settings Screen

## Design Philosophy (Hermes-style)

- Card-based layout with clear visual hierarchy
- Status indicators (green/yellow/red) at a glance
- One-click OAuth connections
- Auto-validation of API keys on paste
- Live quota/usage display per provider
- Zero-config for free providers (auto-enabled)

## Screen: Provider Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  ⚡ Providers                                    [Refresh] │
│                                                            │
│  ┌─ System Health ───────────────────────────────────────┐ │
│  │  🟢 5 Active  │  🟡 1 Degraded  │  🔴 0 Down        │ │
│  │  📊 Today: 847 requests  │  💰 $0.00 spent           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                            │
│  ═══ Free Providers (auto-configured) ═══════════════════ │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ 🟢 OpenCode Zen      │  │ 🟢 OpenRouter Free   │       │
│  │                      │  │                      │       │
│  │ Models: zen-default  │  │ Models: llama, gemma │       │
│  │ Latency: 340ms avg   │  │ Latency: 520ms avg   │       │
│  │ Success: 98.2%       │  │ Success: 95.1%       │       │
│  │ Today: 124 requests  │  │ Today: 89 requests   │       │
│  │                      │  │                      │       │
│  │ [Disable]            │  │ [Disable]            │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ 🟢 NVIDIA NIM        │  │ 🟡 Antigravity       │       │
│  │                      │  │                      │       │
│  │ Models: nemotron-3   │  │ ⚠ OAuth required     │       │
│  │ Latency: 280ms avg   │  │                      │       │
│  │ Success: 99.1%       │  │ [Connect Google →]   │       │
│  │ Today: 203 requests  │  │                      │       │
│  │                      │  │                      │       │
│  │ [Disable]            │  │                      │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                            │
│  ═══ Your API Keys ══════════════════════════════════════ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🤖 OpenAI                                 [Remove ×] │ │
│  │ sk-proj-...7x4f                                      │ │
│  │ ✅ Valid  │  Models: gpt-4o, o1  │  $12.40 remaining │ │
│  │ Today: 45 requests  │  Avg latency: 890ms            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ➕ Add Provider                                      │ │
│  │                                                      │ │
│  │  [🔑 Paste API Key]     [🔗 Connect via OAuth]     │ │
│  │                                                      │ │
│  │  Quick add:                                          │ │
│  │  [OpenAI] [Anthropic] [Google] [OpenRouter] [Custom] │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ═══ Community Routers (Docker Sidecars) ════════════════ │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ 🟢 9Router           │  │ ⬜ CliRelay           │       │
│  │ Port: 20128          │  │ Not running           │       │
│  │ Providers: 12 active │  │                      │       │
│  │ RTK savings: 34%     │  │ docker compose       │       │
│  │                      │  │ --profile routers up │       │
│  │ [📊 Dashboard]      │  │                      │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Screen: Add API Key Modal

```
┌────────────────────────────────────────────────┐
│  🔑 Add API Key                          [×]  │
│                                                │
│  Provider                                      │
│  ┌────────────────────────────────────────┐    │
│  │ 🤖 OpenAI                          ▾  │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  API Key                                       │
│  ┌────────────────────────────────────────┐    │
│  │ sk-proj-xxxxxxxxxxxxxxxxxxxx          │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │ ✅ Key validated successfully          │    │
│  │                                        │    │
│  │ Available models:                      │    │
│  │  • gpt-4o (128k context)             │    │
│  │  • gpt-4o-mini (128k context)        │    │
│  │  • o1 (200k context)                 │    │
│  │                                        │    │
│  │ Credit remaining: $12.40              │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Label (optional)                              │
│  ┌────────────────────────────────────────┐    │
│  │ Personal OpenAI key                   │    │
│  └────────────────────────────────────────┘    │
│                                                │
│             [Cancel]  [Save Key]               │
└────────────────────────────────────────────────┘
```

## Screen: OAuth Connect Flow

```
┌────────────────────────────────────────────────┐
│  🔗 Connect via OAuth                    [×]  │
│                                                │
│  Select provider:                              │
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │  🌐 Google (Antigravity)              │    │
│  │  Access Gemini 3.5 Flash for free     │    │
│  │  [Connect with Google →]              │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │  🐙 GitHub                            │    │
│  │  Access Copilot models                │    │
│  │  [Connect with GitHub →]              │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │  🔧 Custom OAuth                      │    │
│  │  Configure custom OAuth2 provider     │    │
│  │  [Configure →]                        │    │
│  └────────────────────────────────────────┘    │
│                                                │
└────────────────────────────────────────────────┘
```

## Screen: Telemetry Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  📊 Provider Telemetry (Last 7 Days)                       │
│                                                            │
│  ┌─ Model Rankings (by composite score) ─────────────────┐ │
│  │  #1  🟢 nemotron-3-super   Score: 92  ████████████▊   │ │
│  │  #2  🟢 zen-default        Score: 89  ███████████▋    │ │
│  │  #3  🟢 gemini-3.5-flash   Score: 85  ██████████▋     │ │
│  │  #4  🟢 llama-3.3-70b      Score: 78  █████████▊      │ │
│  │  #5  🟡 gemma-4-26b        Score: 71  ████████▉       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Reliability ──────┐  ┌─ Speed ────────────────────┐   │
│  │ NIM:    99.1% ████▉│  │ NIM:    280ms ████████▋    │   │
│  │ Zen:    98.2% ████▊│  │ Zen:    340ms ███████▋     │   │
│  │ OR:     95.1% ████▌│  │ Grav:   450ms ██████▋      │   │
│  │ Grav:   93.8% ████▎│  │ OR:     520ms █████▋       │   │
│  └─────────────────────┘  └────────────────────────────┘   │
│                                                            │
│  ┌─ Daily Usage ──────────────────────────────────────────┐ │
│  │ Mon  ████████████ 234 reqs                             │ │
│  │ Tue  ██████████████ 289 reqs                           │ │
│  │ Wed  █████████ 178 reqs                                │ │
│  │ Thu  ████████████████ 341 reqs                         │ │
│  │ Fri  ██████████ 198 reqs                               │ │
│  │ Sat  ███████ 142 reqs                                  │ │
│  │ Sun  ██████████████ 283 reqs                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                            │
│  Token savings from RTK compression: 34% (≈ 124k tokens)  │
│  Total cost this week: $0.00 (100% free tier)              │
└────────────────────────────────────────────────────────────┘
```

## Component Map

| Screen | Vue Component | Route |
|--------|--------------|-------|
| Provider Dashboard | `ProviderDashboard.vue` | `/providers` |
| Add API Key | `AddApiKeyModal.vue` | Modal overlay |
| OAuth Connect | `OAuthConnectModal.vue` | Modal overlay |
| Telemetry | `TelemetryDashboard.vue` | `/telemetry` |
| Model Rankings | `ModelRankings.vue` | Widget in dashboard |

## Related

- [Multi-Tenant Auth](/architecture/multi-tenant.md)
- [Dynamic Model Routing](/models/model-routing.md)
- [Provider Catalog](/providers/index.md)
