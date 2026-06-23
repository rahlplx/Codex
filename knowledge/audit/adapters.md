---
type: Audit Report
title: Adapters Domain Audit
description: Findings for backend/src/adapters/, types/adapter.ts — all 9 provider adapters, base classes, registry
tags: [audit, adapters, providers, tier-1, tier-2, routing]
timestamp: 2026-06-23T00:00:00Z
related:
  - ./orchestrator-discovery.md
  - ./server-routes.md
  - ../providers/index.md
---

# Adapters Domain Audit

## Management Brief

The adapter layer is the system's connection to AI providers. Two of the five Tier 1 adapters (Nemotron and OpenRouter) have **broken response formatting** — they return raw API wire format instead of the normalized format the rest of the system expects. This means token usage tracking, finish reason detection, and provider attribution silently fail for ~40% of direct adapters. Additionally, the health scoring system uses **incompatible scales** across adapters (0-1 vs 0-100), making the routing engine's "pick the best adapter" logic fundamentally broken. The `PROVIDER_ENABLED=false` configuration flag is also completely ignored — disabled providers still participate in routing.

## Findings

### Critical

**B-ADAPT-1. Nemotron `chatCompletion` returns raw snake_case wire format**
- File: `backend/src/adapters/nemotron.ts:39-51`
- `fetchJson()` returns raw OpenAI format (`prompt_tokens`, `finish_reason`) but the return type claims `ChatCompletionResponse` (`promptTokens`, `finishReason`). TypeScript's `as T` cast hides this. Consumers get `undefined` for all camelCase fields.
- Fix: Add response normalization matching the pattern in `opencode-zen.ts` and `kilocode.ts`.
- Impact: Telemetry, usage tracking, and response metadata broken for all Nemotron requests.

**B-ADAPT-2. OpenRouter `chatCompletion` returns raw snake_case wire format**
- File: `backend/src/adapters/openrouter-free.ts:48-64`
- Same issue as B-ADAPT-1. `provider` field is also missing from responses.
- Fix: Parse and normalize the response.
- Impact: Same as B-ADAPT-1 but for OpenRouter requests.

### High

**B-ADAPT-3. Nemotron `chatCompletionStream` never terminates on `[DONE]`**
- File: `backend/src/adapters/nemotron.ts:79`
- Uses `continue` instead of `return` on `[DONE]`. Stream only ends when reader reaches `done`, not when sentinel arrives. Data after `[DONE]` would be incorrectly processed.
- Fix: Change to `if (line === 'data: [DONE]') return;`

**B-ADAPT-4. Nemotron streaming has no timeout — unbounded hang**
- File: `backend/src/adapters/nemotron.ts:53-87`
- `fetch()` called with no `signal`. If NIM endpoint hangs, stream blocks forever.
- Fix: Add `signal: AbortSignal.timeout(this.timeout())`

**B-ADAPT-5. OpenRouter streaming has no timeout**
- File: `backend/src/adapters/openrouter-free.ts:71-81`
- Same issue as B-ADAPT-4.

**E-ADAPT-1. `enabled` config flag is completely ignored**
- File: `backend/src/index.ts:34-61`, `backend/src/types/config.ts`
- `loadConfig()` produces `providers[id].enabled` but `index.ts` unconditionally initializes and registers all 9 adapters. Setting `PROVIDER_ENABLED=false` has no effect.
- Fix: Wrap init+register in `if (config.providers[id]?.enabled !== false)` checks.

**E-ADAPT-4. Health score scales are incompatible — routing is silently broken**
- Files: Multiple adapters
- OpenCode Zen: 0.0-1.0 (latency decay), Nemotron/Sidecar: 80, KiloCode: 75, OpenRouter: 70, Antigravity: 90. Router sorts by score, so Zen (max 1.0) can **never** beat any sidecar adapter (score 80).
- Fix: Normalize all scores to 0-100 range. Apply latency decay formula consistently.

### Medium

**E-ADAPT-2. No retry logic in any adapter** — `AdapterConfig.maxRetries` exists but is unused.
**E-ADAPT-3. Nemotron has no `apiKey` support** — NVIDIA NIM typically requires one.
**C-ADAPT-1. Inconsistent SSE `[DONE]` detection** — Three different patterns across adapters.
**C-ADAPT-5. Antigravity model `supportsToolUse: true` contradicts adapter `supportsToolUse = false`.**
**S-ADAPT-3. Model name not validated** — `req.model` interpolated directly into URL paths (path traversal risk).
**S-ADAPT-4. Chat messages not validated per-element** — Array.isArray check only, no per-message structure validation.

### Low

**B-ADAPT-6.** OpenCode Zen SSE reader missing `reader.cancel()` in finally block.
**B-ADAPT-7.** Antigravity non-null assertion after null guard (fragile pattern).
**B-ADAPT-8.** `fetchJson` error messages discard response body (hard to debug).
**C-ADAPT-2.** Inconsistent `\r` handling across SSE parsers.
**C-ADAPT-3.** Response role always forced to `'assistant'` (masks tool-use roles).
**C-ADAPT-4.** Inconsistent `||` vs `??` for default model selection.
**E-ADAPT-5.** Sidecar hardcodes `contextWindow: 128_000` for all dynamic models.
**E-ADAPT-7.** Registry has no `listByTier()` filtering.
**E-ADAPT-8.** Shutdown handler never calls `adapter.shutdown()`.

### Test Gaps

- **No test file for NemotronAdapter** (HIGH) — Zero coverage on a Tier 1 adapter with 3 bugs.
- **No test file for OpenRouterFreeAdapter** (HIGH) — Same.
- **No test for `fetchJson` error handling** (MEDIUM)
- **Sidecar test doesn't verify response normalization** (MEDIUM) — Would have caught B-ADAPT-1/2.
- **No test for routing with mixed score scales** (MEDIUM)
- **No integration test for disabled adapters excluded from routing** (HIGH)
