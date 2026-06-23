# SPEC-003: Backend Scaffold & CLI Adapter Interface

**Status:** Accepted  
**Date:** 2026-06-23  
**Author:** claude

## Problem

The backend needs a working Express server, TypeScript type system, and a stable `ICliAdapter` interface before any provider can be implemented. Without these foundations, every adapter will diverge.

## Decision

### Directory structure

```
backend/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts                  # Entry: start HTTP server
    ├── server/
    │   ├── httpServer.ts         # Express app factory
    │   └── routes/
    │       ├── health.ts         # GET /health — liveness probe
    │       ├── providers.ts      # GET /api/providers — list adapters
    │       └── models.ts         # GET /api/models — aggregate model list
    ├── adapters/
    │   ├── base.ts               # ICliAdapter interface + AdapterBase abstract class
    │   └── registry.ts           # AdapterRegistry: register, resolve, list
    ├── orchestrator/
    │   └── router.ts             # Route request → best adapter (scoring)
    └── types/
        ├── adapter.ts            # ICliAdapter, HealthStatus, QuotaStatus
        ├── provider.ts           # Provider, Model, Tier
        ├── thread.ts             # Thread, Message
        └── config.ts             # AdapterConfig, AppConfig
```

### ICliAdapter interface (canonical)

```typescript
export interface ICliAdapter {
  readonly id: string;
  readonly name: string;
  readonly tier: 'free' | 'freemium' | 'paid';
  readonly supportsStreaming: boolean;
  readonly supportsToolUse: boolean;

  initialize(config: AdapterConfig): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  getQuota(): Promise<QuotaStatus>;
  supportedModels(): Promise<Model[]>;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
}
```

### Routing algorithm

Score = `(1 - errorRate) * 0.5 + (1 - latencyScore) * 0.3 + quotaScore * 0.2`  
Pick highest score from healthy (non-quota-exceeded) adapters. Fall back down tier chain on error.

## Rationale

- Interface-first: all 6 adapters implement the same contract; router doesn't care which adapter it picks
- AdapterBase provides `initialize/shutdown` defaults and retry logic so concrete adapters only implement the API call
- Registry pattern allows runtime registration — adapters can be added without modifying router code

## Alternatives Considered

- **Plugin system via npm packages**: Rejected — too complex for v1; local adapters suffice
- **Function-based adapters (no class)**: Considered; rejected because adapters need mutable state (quota counters, health cache) that's cleaner as class fields

## Acceptance Criteria

- [x] `ICliAdapter` interface defined in `src/types/adapter.ts`
- [x] `AdapterRegistry` can register and resolve adapters by id
- [x] `Router.route()` returns the highest-scoring healthy adapter
- [x] `GET /health` returns `200 {"status":"ok"}`
- [x] Unit tests cover registry and router logic
- [x] `npm test` passes with 0 failures
