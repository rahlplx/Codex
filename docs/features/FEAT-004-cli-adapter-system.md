# Feature: CLI Adapter System

**Status:** Planned
**Spec:** [SPEC-002](../specs/SPEC-002-tech-stack.md)
**Branch:** `feature/cli-adapters`

## Summary

The backend adapter layer implementing `ICliAdapter` interface for each provider. Phase 1 delivers three Tier-1 adapters (OpenCode Zen, OpenRouter Free, Nemotron/NIM). Each adapter normalizes its provider's API to the standard ChatCompletion interface with streaming support. The orchestrator uses composite scoring for routing and circuit breakers for reliability.

## UI/UX Screens

No UI screens. This is a backend-only feature. Health and quota data surfaces through FEAT-001 (Provider Dashboard) and FEAT-005 (Telemetry Dashboard).

## Architecture

### CLI Adapter Interface

```typescript
interface ICliAdapter {
  id: string;
  name: string;
  tier: 'free' | 'freemium' | 'paid';
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  supportsReasoning: boolean;

  supportedModels(): Promise<Model[]>;
  healthCheck(): Promise<HealthStatus>;
  getQuota(): Promise<QuotaStatus>;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  initialize(config: AdapterConfig): Promise<void>;
  shutdown(): Promise<void>;
}
```

### Adapter Implementations

| Adapter | File | Base URL | Auth | Wire API |
|---------|------|----------|------|----------|
| OpenCode Zen | `opencode-zen.ts` | `https://opencode.ai/zen/v1` | None (free) | Responses API (translated to Chat Completions) |
| OpenRouter Free | `openrouter-free.ts` | `https://openrouter.ai/api/v1` | 64 encrypted keys, rotation | Chat Completions + Responses API |
| Nemotron/NIM | `nemotron.ts` | `https://integrate.api.nvidia.com/v1` | None (free tier) | OpenAI-compatible Chat Completions |

### Orchestrator Components

| Component | File | Purpose |
|-----------|------|---------|
| Router | `src/backend/orchestrator/router.ts` | Request -> best adapter via composite scoring |
| Health Monitor | `src/backend/orchestrator/health.ts` | 60-second health probes per adapter |
| Circuit Breaker | `src/backend/orchestrator/circuit-breaker.ts` | 3 failures -> open -> 5min half-open retry |
| Discovery Scanner | `src/backend/orchestrator/discovery.ts` | Hourly model catalog refresh |

### Composite Scoring Algorithm

```
Score = (0.35 * success_rate_7d
       + 0.25 * normalized_speed
       + 0.20 * quality_score
       + 0.15 * (1 - normalized_cost)
       + 0.05 * recency_bonus)
       * availability_multiplier
       * quota_multiplier
```

### Fallback Chain

1. Tier 1: Best-scored free model (telemetry-driven)
2. Tier 1b: Second-best free model
3. Tier 2: Community router (9Router/CliRelay sidecar)
4. Tier 3: User's own API keys (if configured)
5. Final: Error with diagnostic info (providers tried, failure reasons)

## Acceptance Criteria

- [ ] `ICliAdapter` interface defined in `src/shared/src/types/adapter.types.ts`
- [ ] All 3 Tier-1 adapters implement ICliAdapter interface
- [ ] OpenCode Zen: translates Responses API to Chat Completions, streams via SSE
- [ ] OpenRouter Free: rotates through encrypted key pool, handles 429 with backoff
- [ ] Nemotron/NIM: OpenAI-compatible passthrough, handles free tier rate limits
- [ ] Health prober runs every 60s, updates HealthStatus per adapter
- [ ] Circuit breaker opens after 3 consecutive failures, recovers after 5min
- [ ] Composite score drives model selection with correct weights (35/25/20/15/5)
- [ ] Fallback chain: Tier 1 -> Tier 1b -> Tier 2 -> Tier 3 -> error with diagnostics
- [ ] Streaming works end-to-end (adapter -> orchestrator -> API -> frontend SSE)
- [ ] Each adapter emits telemetry events to usage_log table
- [ ] Adapters lazy-initialized (initialize() called on first use, not startup)

## Implementation Notes

- Base HTTP client: `undici` (Node.js native) for connection pooling
- Responses API translation: port logic from codex-mobile `unifiedResponsesProxy.ts`
- Key rotation: port from codex-mobile `freeMode.ts` (64 encrypted keys, random selection, rotate on 429)
- Adapter config: loaded from `config/providers.yaml`
- Registry pattern: `AdapterRegistry` discovers, registers, and manages adapter lifecycle

## Test Coverage

- Unit: `tests/unit/backend/adapters/opencode-zen.test.ts`
- Unit: `tests/unit/backend/adapters/openrouter-free.test.ts`
- Unit: `tests/unit/backend/adapters/nemotron.test.ts`
- Unit: `tests/unit/backend/adapters/registry.test.ts`
- Unit: `tests/unit/backend/orchestrator/circuit-breaker.test.ts`
- Unit: `tests/unit/backend/orchestrator/router.test.ts`
- Integration: `tests/integration/adapters/opencode-zen.live.test.ts`
- Integration: `tests/integration/adapters/nemotron.live.test.ts`
