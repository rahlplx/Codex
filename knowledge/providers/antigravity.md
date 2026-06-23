---
type: Provider Adapter
title: Antigravity CLI (Gemini)
description: Google's Antigravity CLI provides free Gemini 3.5 Flash access via OAuth. Replaced Gemini CLI on June 18, 2026.
resource: https://ai.google.dev/gemini-api/docs/antigravity-agent
tags: [provider, free, tier-1, gemini, google, antigravity]
timestamp: 2026-06-22T00:00:00Z
---

# Antigravity CLI Adapter

Antigravity is Google's agent-first CLI, replacing Gemini CLI as of June 18, 2026. It provides free Gemini 3.5 Flash and shares the same agent harness as Antigravity 2.0 desktop app.

## Connection

| Field | Value |
|-------|-------|
| Auth | Google OAuth (device flow) |
| Free Model | Gemini 3.5 Flash |
| Agent Sandbox | Secure Linux sandbox hosted by Google |
| Features | Reasoning, code execution, file management, web browsing |

## Key Facts

- Gemini CLI deprecated June 18, 2026 — all free access moved to Antigravity
- Single API call gives an agent that reasons, executes code, manages files, browses web
- Supports agent skills, hooks, subagents, and extensions
- iFlow and Gemini CLI free tiers discontinued in 2026

## Integration Strategy

Two approaches:
1. **CLI wrapper** — spawn `antigravity` process, pipe stdin/stdout (like codex-mobile's app-server bridge)
2. **API proxy** — use community tools (CliRelay, AIClient2API) that wrap Antigravity OAuth as OpenAI-compatible API

## Configuration

```yaml
antigravity:
  enabled: true
  tier: free
  auth_type: google-oauth
  priority: 2
  models:
    - gemini-3.5-flash
```

## Related

- [CliRelay](/routers/cli-relay.md) (wraps Antigravity as API)
- [AIClient2API](/routers/ai-client-2-api.md) (simulates Antigravity client)
- [9Router](/routers/nine-router.md) (routes to Antigravity)
