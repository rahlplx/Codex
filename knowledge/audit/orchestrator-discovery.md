---
type: Audit Report
title: Orchestrator & Discovery Domain Audit
description: Findings for backend/src/orchestrator/, discovery/, integrations/, adapters/registry.ts — routing, scoring, model scanning, Telegram bridge
tags: [audit, orchestrator, discovery, routing, telegram, tier-1, performance]
timestamp: 2026-06-23T00:00:00Z
related:
  - ./adapters.md
  - ./server-routes.md
  - ./infrastructure.md
---

# Orchestrator & Discovery Domain Audit

## Management Brief

The routing engine selects adapters by querying every registered adapter's health and quota status **on every chat request** — with 9 adapters, that's 18 HTTP calls per request with zero caching. There is **no fallback chain**: if the single highest-scoring adapter fails during the actual completion call, the user gets a 500 error with no retry. There are no circuit breakers, so a consistently failing adapter still participates in (and slows down) every routing decision. Additionally, adapters whose `initialize()` fails are still unconditionally registered, meaning the router probes adapters it knows are broken. The Telegram bridge has silent error swallowing, no timeouts on backend API calls, and a race condition on thread creation.

## Findings

### Critical

**B-ORCH-1. Failed adapters are unconditionally registered**
- File: `backend/src/index.ts:34-61`
- `Promise.allSettled()` catches initialization failures (line 34), failures are logged (lines 47-51), but all 9 adapters are registered regardless (lines 53-61). An adapter that failed `initialize()` still participates in routing, consuming a health check call that will fail.
- Fix: Wrap registration in init-success check:
  ```
  inits.forEach((result, i) => {
    if (result.status === 'fulfilled') registry.register(adapters[i])
    else console.error(`[${adapterNames[i]}] init failed:`, result.reason)
  })
  ```
- Impact: Router wastes HTTP calls on broken adapters. If a broken adapter's `healthCheck()` returns a false positive (e.g., the health endpoint doesn't require init), it could be selected and crash on use.

### High

**E-ORCH-1. No fallback chain — single adapter failure = user-facing 500**
- File: `backend/src/orchestrator/router.ts:40-42`
- `route()` returns only the single highest-scoring adapter. If that adapter fails during `chatCompletion()` or `chatCompletionStream()`, the error propagates to the chat route handler (`chat.ts:58-69`), which returns a 500.
- Fix: Return a ranked list of adapters. The chat route should try the next adapter on failure.
- Impact: System has 9 adapters but uses zero redundancy. One adapter flaking = user error.

**E-ORCH-2. No circuit breakers — failing adapters never removed from rotation**
- File: `backend/src/orchestrator/router.ts:19-43`
- Each `route()` call independently evaluates all adapters. An adapter that has failed the last 100 health checks still gets probed on request 101. No failure tracking, no cooldown, no exponential backoff.
- Fix: Track consecutive failures per adapter. After N failures (e.g., 3), skip the adapter for a cooldown period (e.g., 60s) before re-probing.
- Impact: Consistently broken adapters add latency to every routing decision.

**E-ORCH-3. 18 HTTP calls per `route()` with no caching**
- File: `backend/src/orchestrator/router.ts:25-37`
- `Promise.all(adapters.map(async adapter => { const [health, quota] = await Promise.all([adapter.healthCheck(), adapter.getQuota()]) }))` — 2 calls per adapter, 9 adapters = 18 HTTP calls. Every single chat request pays this cost. No TTL cache.
- Fix: Cache `healthCheck()` and `getQuota()` results with a 30-60s TTL. The `ModelDiscoveryScanner` already does periodic scanning — extend the pattern to health/quota.
- Impact: Adds hundreds of milliseconds of latency to every chat request. Under load, this becomes the bottleneck.

**E-ORCH-4. Shutdown handler never calls `adapter.shutdown()`**
- File: `backend/src/index.ts:81-94`
- The shutdown function closes the HTTP server, stops the scanner, stops the Telegram bridge, and closes the database — but never calls `shutdown()` on any adapter. Adapters may hold HTTP clients, timers, or other resources.
- Fix: Add `await Promise.allSettled(registry.list().map(a => a.shutdown?.()))` before `db.close()`.
- Impact: Resource leaks on shutdown. May cause connection timeouts or warnings.

**E-ORCH-5. `AdapterConfig.maxRetries` defined but never used**
- File: `backend/src/types/adapter.ts` (config interface), all adapters
- The adapter config type defines `maxRetries` but no adapter or orchestrator code reads it. Retry logic is completely absent.
- Fix: Implement retry logic in the orchestrator or in `AdapterBase.fetchJson()`.
- Impact: Transient errors (network blips, 429 rate limits) immediately fail instead of retrying.

### Medium

**E-ORCH-6. `ModelDiscoveryScanner` catalog not used by routes**
- Files: `backend/src/discovery/scanner.ts`, `backend/src/server/routes/models.ts`
- The scanner runs every hour, queries all adapters for models, and caches results in `this.catalog`. But `GET /api/models` calls `adapter.supportedModels()` directly instead of reading from the scanner's catalog.
- Fix: Pass the scanner to the models route and read from `scanner.getCatalog()`.
- Impact: Redundant HTTP calls. The scanner's work is wasted.

**E-ORCH-7. Router `quotaOk` logic treats `remaining: null` as "has quota"**
- File: `backend/src/orchestrator/router.ts:32`
- `const quotaOk = quota.unlimited || quota.remaining === null || quota.remaining > 0` — if `remaining` is `null` (many adapters return this), the adapter is treated as having quota. This is correct for free/unlimited adapters, but could mask a provider that has exhausted quota but returns `null` instead of `0`.
- Fix: Document this convention explicitly. Consider requiring adapters to return `remaining: Infinity` for unlimited and `null` only for "unknown."

**E-ORCH-8. Telegram bridge swallows all handler errors**
- File: `backend/src/integrations/telegram.ts:71`
- `await this.handleUpdate(update).catch(() => {})` — any error in `handleUpdate` is silently dropped. Failed message sends, failed completions, and failed thread creations produce no log output.
- Fix: `await this.handleUpdate(update).catch(err => console.error('[TelegramBridge] handleUpdate error:', err))`.
- Impact: Debugging Telegram issues is nearly impossible.

**E-ORCH-9. Telegram backend API calls have no timeout**
- File: `backend/src/integrations/telegram.ts:136-169`
- The `fetch()` calls to the backend API (create thread, add message, get history, chat completion, add response) have no `signal: AbortSignal.timeout()`. If the backend is slow or unresponsive, these calls hang indefinitely, blocking the poll loop.
- Fix: Add `signal: AbortSignal.timeout(30000)` to all internal fetch calls.

**E-ORCH-10. Telegram thread creation race condition**
- File: `backend/src/integrations/telegram.ts:129-134`
- If two `/chat` messages arrive simultaneously for the same chat ID, both check `this.chatThreadMap.get(msg.chat.id)`, both find `undefined`, and both call `createThread()`, creating duplicate threads. The second thread's ID overwrites the first in the map.
- Fix: Use a per-chatId mutex or check-and-set pattern.
- Impact: Low probability in practice (Telegram delivers updates sequentially per chat), but possible with concurrent webhooks.

**C-ORCH-1. Telegram generates a new JWT per message**
- File: `backend/src/integrations/telegram.ts:90`
- `const token = generateToken(...)` is called on every incoming message. JWTs have 24h expiry, so the same user's token could be cached for the session.
- Fix: Cache tokens per Telegram user ID, regenerate on expiry.
- Impact: Minor performance waste — JWT generation is fast but unnecessary.

**C-ORCH-2. Registry has no `unregister()` or `listByTier()` methods**
- File: `backend/src/adapters/registry.ts`
- The registry is a simple `Map` with `register`, `resolve`, and `list`. No way to remove an adapter at runtime or filter by tier.
- Fix: Add `unregister(id: string)` and `listByTier(tier: string)` methods.
- Impact: Can't dynamically disable adapters without restart. Router can't filter by tier.

### Low

**B-ORCH-2.** Scanner `scan()` silently catches per-adapter errors in `Promise.allSettled` — correct behavior but no logging of which adapters failed.
**C-ORCH-3.** Scanner `findModel()` does linear search — fine for small catalogs but O(n) per lookup.
**C-ORCH-4.** Router creates `ScoredAdapter[]` on every call — no object pooling (minor GC pressure under load).
**C-ORCH-5.** Telegram `chatThreadMap` is in-memory — lost on restart, orphaning Telegram conversations.
**E-ORCH-11.** Scanner `start()` fires immediate scan then sets interval — if the immediate scan takes longer than `intervalMs`, a second scan starts before the first finishes (guarded by `isScanning` flag, so this just skips — but the timing is imprecise).

### Test Gaps

- **No test for fallback chain** (CRITICAL) — because no fallback chain exists.
- **No test for circuit breaker behavior** (HIGH) — because no circuit breaker exists.
- **No test for health/quota caching** (HIGH) — because no caching exists.
- **No test for failed adapter registration skipping** (HIGH) — would have caught B-ORCH-1.
- **No test for Telegram error handling** (MEDIUM) — silent error swallowing untested.
- **No test for concurrent Telegram thread creation** (MEDIUM) — race condition untested.
- **No integration test for full routing under adapter failure** (HIGH) — would validate E-ORCH-1.
