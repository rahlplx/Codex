---
type: Audit Index
title: Full Codebase Audit — 2026-06-23
description: Cross-domain audit of the entire Codex codebase covering adapters, auth, storage, server routes, orchestrator, frontend, and infrastructure
tags: [audit, quality, security, architecture]
timestamp: 2026-06-23T00:00:00Z
---

# Full Codebase Audit — 2026-06-23

## Executive Summary

A comprehensive 6-domain audit of the Codex codebase identified **5 critical**, **25 high**, **31 medium**, and **29 low** severity findings across adapters, auth/storage, server routes, orchestrator/discovery, frontend, and infrastructure.

The three most impactful systemic issues are:

1. **The chat endpoint is unauthenticated** — `POST /api/chat/completions` (the most expensive endpoint) has no auth middleware. Anyone can consume provider quotas anonymously.
2. **Two Tier 1 adapters return malformed responses** — Nemotron and OpenRouter return raw snake_case wire format while claiming camelCase `ChatCompletionResponse`. Every downstream consumer gets `undefined` for token counts, finish reasons, and provider IDs.
3. **The routing system is fundamentally broken** — Health scores use incompatible scales (0-1 vs 0-100), the `enabled` config flag is ignored, failed adapters are still registered, there's no fallback chain, no circuit breakers, and 18 HTTP probes fire per chat request.

## Severity Distribution

| Severity | Count | Domains |
|----------|-------|---------|
| Critical | 5 | Adapters (2), Routes (1), Orchestrator (1), Frontend/Infra (1) |
| High | 25 | All domains |
| Medium | 31 | All domains |
| Low | 29 | All domains |

## Domain Reports

| Domain | File | Critical | High | Medium | Low |
|--------|------|----------|------|--------|-----|
| [Adapters](./adapters.md) | adapters/, types/adapter.ts | 2 | 5 | 6 | 9 |
| [Auth & Storage](./auth-storage.md) | auth/, storage/, types/ | 0 | 3 | 8 | 10 |
| [Server Routes](./server-routes.md) | server/, routes/ | 1 | 4 | 11 | 12 |
| [Orchestrator & Discovery](./orchestrator-discovery.md) | orchestrator/, discovery/, integrations/ | 1 | 5 | 12 | 5 |
| [Frontend](./frontend.md) | frontend/src/, frontend/Dockerfile | 1 | 7 | 10 | 8 |
| [Infrastructure](./infrastructure.md) | docker-compose, CI, Caddyfile | 1 | 8 | 12 | 7 |

## Top 10 Recommended Actions (Prioritized)

| # | Severity | Domain | Finding | Why It Matters |
|---|----------|--------|---------|----------------|
| 1 | Critical | Routes | Add `authGuard` to `POST /api/chat/completions` | Most expensive endpoint is open to anonymous abuse |
| 2 | Critical | Adapters | Normalize Nemotron + OpenRouter `chatCompletion` responses | Consumers get `undefined` for token counts and finish reasons |
| 3 | Critical | Orchestrator | Only register adapters whose `initialize()` succeeded | Router can select unconfigured adapters that crash on use |
| 4 | High | Adapters | Normalize health scores to consistent 0-100 scale | OpenCode Zen (0-1) can never beat Sidecar (80) — routing is broken |
| 5 | High | Adapters | Check `config.providers[id].enabled` before registering | `PROVIDER_ENABLED=false` env var has zero effect |
| 6 | High | Orchestrator | Cache health/quota results with TTL (30-60s) | 18 HTTP calls per chat request adds unacceptable latency |
| 7 | High | Orchestrator | Implement fallback chain (return sorted list, retry on failure) | Single adapter failure = user gets 500, no retry |
| 8 | High | Auth | Validate JWT payload fields (`sub`, `email`, `role`) and header `alg` | Malformed tokens pass verification; future `alg:none` attack vector |
| 9 | High | Infra | Fix Caddy route ordering (specific before generic) | SSE streaming headers never applied to `/api/chat/completions` |
| 10 | High | Infra | Add `${JWT_SECRET:?}` validation to production compose | Empty JWT_SECRET = no authentication in production |

## Cross-Domain Relationships

```
Chat Request Flow (every finding marked * is on the critical path):
                                                                    
  Browser → POST /api/chat/completions                              
             * No authGuard (S-ROUTES-1)                            
             * No message validation (E-ROUTES-1, E-ROUTES-2)       
                    ↓                                               
             Router.route()                                         
             * 18 HTTP probes per request (E-ORCH-3)                
             * No circuit breakers (E-ORCH-2)                       
             * Failed adapters in pool (B-ORCH-1)                   
             * Score scales incompatible (E-ADAPT-4)                
             * Enabled flag ignored (E-ADAPT-1)                     
                    ↓                                               
             Adapter.chatCompletion()                               
             * Nemotron/OpenRouter return wrong format (B-ADAPT-1,2)
             * No timeout on streaming (B-ADAPT-4,5)                
             * No retry logic (E-ADAPT-2)                           
                    ↓                                               
             Response to client                                     
             * No usage_log write (E-ROUTES-12)                     
             * Telemetry dashboards always empty                    
```

## How to Use This Audit

- **For management**: Read this index and the Executive Summary. Each domain report has a "Management Brief" section explaining what changed and why.
- **For developers**: Go to the specific domain report. Each finding has file path, line numbers, severity, and recommended fix.
- **For prioritization**: Use the Top 10 table above. Items 1-3 are critical bugs to fix immediately. Items 4-10 are high-severity architectural issues.
- **For tracking**: Each finding has a stable ID (e.g., `B-ADAPT-1`). Reference these in PRs and issues.
