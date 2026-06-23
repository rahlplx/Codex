---
type: Specification
title: Dynamic Model Registry & Fallback System
description: Auto-updating model catalog with health-aware routing, telemetry-driven selection, and multi-tier fallback chains for handling daily/weekly free model changes.
resource: /backend/src/orchestrator
tags: [orchestrator, routing, fallback, dynamic, telemetry]
timestamp: 2026-06-22T00:00:00Z
---

# Dynamic Model Registry & Fallback System

Free AI models change on a daily/weekly basis — providers add, remove, rate-limit, or deprecate models constantly. The system must handle this gracefully without manual intervention.

## Core Design: Self-Healing Model Registry

```
┌─────────────────────────────────────────────────┐
│           DYNAMIC MODEL REGISTRY                 │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Discovery │  │ Health   │  │ Telemetry     │ │
│  │ Scanner   │  │ Prober   │  │ Aggregator    │ │
│  │ (hourly)  │  │ (60s)    │  │ (per-request) │ │
│  └─────┬────┘  └─────┬────┘  └──────┬────────┘ │
│        │             │               │           │
│        ▼             ▼               ▼           │
│  ┌───────────────────────────────────────────┐  │
│  │         MODEL CATALOG (SQLite)             │  │
│  │                                            │  │
│  │  model_id | provider | status | score |    │  │
│  │  latency_p50 | success_rate | last_seen | │  │
│  │  quota_remaining | cost_per_1k | ...      │  │
│  └───────────────────────────────────────────┘  │
│                      │                           │
│                      ▼                           │
│  ┌───────────────────────────────────────────┐  │
│  │         ROUTING ENGINE                     │  │
│  │                                            │  │
│  │  Score = w1*success_rate                   │  │
│  │        + w2*(1/latency_p50)               │  │
│  │        + w3*quality_rating                │  │
│  │        + w4*(1/cost_per_1k)               │  │
│  │        - penalty_if_quota_low             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Discovery Scanner

Runs hourly (configurable) to detect model changes:

```typescript
interface ModelDiscovery {
  // Poll each provider's /models endpoint
  scanProviderModels(provider: ICliAdapter): Promise<ModelInfo[]>;
  
  // Diff against catalog — detect added/removed/changed
  diffCatalog(current: ModelInfo[], stored: ModelInfo[]): ModelDiff;
  
  // Auto-update catalog, emit events for UI
  applyCatalogUpdate(diff: ModelDiff): Promise<void>;
  
  // Notify admin on significant changes (model removed, new free model)
  notifyChanges(diff: ModelDiff): Promise<void>;
}

interface ModelDiff {
  added: ModelInfo[];      // New models available
  removed: ModelInfo[];    // Models no longer available
  changed: ModelInfo[];    // Models with changed properties
  unchanged: ModelInfo[];  // No changes
}
```

## Health Prober

Runs every 60 seconds per active provider:

```typescript
interface HealthProbe {
  // Lightweight ping (HEAD or minimal completion)
  probe(provider: string, model: string): Promise<ProbeResult>;
  
  // Update model status based on probe
  updateStatus(model: string, result: ProbeResult): void;
  
  // Circuit breaker: mark provider down after N failures
  circuitBreaker: {
    failureThreshold: 3,      // failures before opening circuit
    recoveryTimeout: 300_000,  // 5 min before half-open retry
    halfOpenRequests: 1,       // test requests in half-open state
  };
}

interface ProbeResult {
  healthy: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
  quotaRemaining?: number;
  rateLimitReset?: Date;
}
```

## Telemetry-Driven Model Scoring

Every request logs telemetry for data-driven model selection:

```typescript
interface RequestTelemetry {
  requestId: string;
  timestamp: Date;
  provider: string;
  model: string;
  
  // Performance
  ttfb_ms: number;           // Time to first byte
  total_ms: number;          // Total request time
  tokens_in: number;
  tokens_out: number;
  
  // Quality
  success: boolean;
  error_type?: 'rate_limit' | 'quota' | 'timeout' | 'server_error' | 'auth';
  http_status?: number;
  
  // Cost
  cost_usd?: number;         // If paid provider
  
  // User feedback (optional)
  user_rating?: 1 | 2 | 3 | 4 | 5;
  regenerated?: boolean;     // User asked to regenerate = bad signal
}
```

### Scoring Algorithm

```
ModelScore = (
    0.35 * success_rate_7d          // 35% weight on reliability
  + 0.25 * normalized_speed         // 25% on speed (1/p50_latency)
  + 0.20 * quality_score            // 20% on output quality
  + 0.15 * (1 - normalized_cost)    // 15% on cost efficiency
  + 0.05 * recency_bonus            // 5% bias toward recently-verified
) * availability_multiplier          // 0 if down, 0.5 if degraded, 1 if healthy
  * quota_multiplier                 // Scales down as quota depletes
```

## Multi-Tier Fallback Chain

```
Request → Router
  │
  ├─ Tier 1: Best-scored free model (telemetry-driven)
  │    ├─ Success → Return response
  │    └─ Fail → Log telemetry, try next
  │
  ├─ Tier 1b: Second-best free model
  │    ├─ Success → Return response
  │    └─ Fail → Escalate to Tier 2
  │
  ├─ Tier 2: Community router (9Router/CliRelay)
  │    ├─ Success → Return response
  │    └─ Fail → Escalate to Tier 3
  │
  ├─ Tier 3: User's own API keys (if configured)
  │    ├─ Success → Return response
  │    └─ Fail → Final fallback
  │
  └─ Final: Return error with diagnostic info
       - Which providers were tried
       - Why each failed
       - Suggested action (add API key, wait for quota reset)
```

## Auto-Recovery

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Model removed | Discovery scanner finds missing | Remove from catalog, shift traffic |
| Rate limited | 429 response | Back off, rotate to next provider |
| Quota exhausted | Quota tracker hits 0 | Skip provider until quota resets |
| Provider down | Health probe fails 3x | Circuit breaker opens, auto-retry in 5min |
| New free model | Discovery scanner finds new | Add to catalog, start collecting telemetry |
| Quality degradation | Success rate drops below 80% | Reduce score, alert admin |

## Related

- [Provider Catalog](/providers/index.md)
- [Free Models](/models/free-models.md)
- [Orchestrator Architecture](/architecture/orchestrator.md)
