---
type: Audit Report
title: Server Routes Domain Audit
description: Findings for backend/src/server/ — Express app factory, CORS, all route modules (chat, models, providers, threads, auth, admin, telemetry, health)
tags: [audit, routes, api, security, authentication, tier-1]
timestamp: 2026-06-23T00:00:00Z
related:
  - ./adapters.md
  - ./auth-storage.md
  - ./orchestrator-discovery.md
---

# Server Routes Domain Audit

## Management Brief

The single most impactful finding in this audit is that **`POST /api/chat/completions` — the most expensive endpoint in the system — has no authentication middleware**. Any anonymous client can consume provider quotas without limit. Additionally, `GET /api/providers` and `GET /api/models` are unauthenticated and expose internal infrastructure details (health status, quota state, adapter IDs, supported models). The `usage_log` table exists but is **never written to** by any route handler, so the telemetry dashboard, admin usage metrics, and quota enforcement are all reading from an empty table. There is also no global Express error handler — unhandled errors in async routes can crash the process.

## Findings

### Critical

**S-ROUTES-1. `POST /api/chat/completions` has no `authGuard`**
- File: `backend/src/server/routes/chat.ts:10`
- The route handler processes requests directly without any authentication middleware. Compare with `threads.ts:13` (`router.use(authGuard)`) and `admin.ts:8` (`router.use(authGuard, requireRole('admin'))`).
- Fix: Add `authGuard` middleware: `router.post('/api/chat/completions', authGuard, async (req, res) => { ... })`. Then use `req.tenant!.sub` for usage logging.
- Impact: Anyone with network access can make unlimited AI completion requests, draining provider quotas and incurring costs with no attribution.

### High

**E-ROUTES-1. `GET /api/providers` is unauthenticated — leaks internal state**
- File: `backend/src/server/routes/providers.ts:8`
- Returns health status, quota details, model lists, tier classification, and adapter IDs for all registered adapters. No auth required.
- Fix: Add `authGuard`. Optionally, expose a minimal public version with just provider names.
- Impact: Exposes operational details that help attackers identify weak points.

**E-ROUTES-2. `GET /api/models` is unauthenticated — leaks adapter internals**
- File: `backend/src/server/routes/models.ts:7`
- Returns all supported models with provider IDs. No auth required.
- Fix: Add `authGuard`.
- Impact: Lower severity than E-ROUTES-1 but still exposes internal adapter mapping.

**E-ROUTES-3. `usage_log` is never written to — telemetry and quota are dead**
- Files: `backend/src/server/routes/chat.ts` (no write), `backend/src/server/routes/telemetry.ts` (reads usage_log), `backend/src/server/routes/admin.ts:11-24` (reads usage_log)
- The `usage_log` table is defined, indexed, and queried by telemetry and admin routes, but **no route handler ever inserts records**. The chat route, which is the only place where usage data is generated, does not log to this table.
- Fix: After a successful chat completion, insert a row into `usage_log` with `tenant_id`, `provider`, `model`, `tokens_in`, `tokens_out`, `latency_ms`, `success`.
- Impact: Telemetry dashboards always show zero. Admin usage stats always show zero. Per-tenant quota enforcement reads an empty table.

**E-ROUTES-4. No global Express error handler**
- File: `backend/src/server/httpServer.ts:38-57`
- `createApp()` mounts routes but does not register `app.use((err, req, res, next) => ...)`. Unhandled rejections in async route handlers (e.g., if `JSON.parse` throws in a deeply nested call) will result in Express's default 500 HTML response, potentially leaking stack traces.
- Fix: Add a final error handler after all route mounts: `app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { res.status(500).json({ error: 'Internal server error' }) })`.
- Impact: Unhandled errors leak information and produce inconsistent error format.

### Medium

**E-ROUTES-5. Chat message per-element validation is missing**
- File: `backend/src/server/routes/chat.ts:13-16`
- Validates `Array.isArray(messages) && messages.length > 0` but does not check that each element has `role` (string) and `content` (string). Malformed messages (e.g., `[42, null, "hello"]`) are passed directly to adapters.
- Fix: Add per-element validation: `messages.every(m => typeof m === 'object' && m !== null && typeof m.role === 'string' && typeof m.content === 'string')`.

**E-ROUTES-6. Chat route does not attribute responses to tenants**
- File: `backend/src/server/routes/chat.ts:10-72`
- Even if `authGuard` were added, the response includes no tenant attribution. The response JSON has `id`, `model`, `provider`, `choices`, `usage` — no `tenant_id`.
- Fix: After adding auth, include `tenant_id: req.tenant!.sub` in the response metadata (not required in the OpenAI-compatible format, but useful for logging).

**E-ROUTES-7. Providers route always returns `enabled: true`**
- File: `backend/src/server/routes/providers.ts:26`
- Hardcoded `enabled: true` for every provider, regardless of config or health status. This is misleading — disabled or unhealthy providers appear as enabled.
- Fix: Derive from config or health status.

**E-ROUTES-8. Providers route fires 3 HTTP calls per adapter per request**
- File: `backend/src/server/routes/providers.ts:12-15`
- Calls `healthCheck()`, `getQuota()`, and `supportedModels()` for every adapter on every `GET /api/providers` request. With 9 adapters, that's 27 HTTP calls. No caching.
- Fix: Cache results with a 30-60s TTL.

**E-ROUTES-9. Models route fires 1 HTTP call per adapter per request**
- File: `backend/src/server/routes/models.ts:9-13`
- Calls `supportedModels()` for all adapters. With 9 adapters, that's 9 HTTP calls per request.
- Fix: Use the `ModelDiscoveryScanner` catalog (already scanning hourly) instead of querying adapters directly.

**E-ROUTES-10. SSE streaming error message may leak adapter internals**
- File: `backend/src/server/routes/chat.ts:52`
- `e.message` from adapter errors (e.g., "NIM stream error: HTTP 401") is sent to the client. This leaks provider names and internal HTTP status codes.
- Fix: Return a generic error message for streaming errors.

**S-ROUTES-2. Chat endpoint `model` field interpolated into adapter URL without validation**
- File: `backend/src/server/routes/chat.ts:19`, then forwarded to adapters (e.g., `nemotron.ts:44`)
- The `model` string from user input is passed to adapters, which may interpolate it into URL paths. No validation against allowed model IDs.
- Fix: Validate `model` against the known model catalog before passing to adapters.

### Low

**B-ROUTES-1.** `createApp` creates a new `AdapterRegistry` if none provided (`httpServer.ts:39`) — test convenience that could mask production misconfig.
**B-ROUTES-2.** CORS `Vary: Origin` header only set when origin matches (`httpServer.ts:26-27`) — correct but non-standard; some CDNs expect `Vary: Origin` always.
**C-ROUTES-1.** No request ID generation — makes correlating logs across services impossible.
**C-ROUTES-2.** `express.json({ limit: '1mb' })` — 1MB body limit is generous for chat completions; consider reducing to 256KB.
**C-ROUTES-3.** Health route returns `{ status: 'ok' }` with no version or uptime info.
**C-ROUTES-4.** Thread title truncated to 200 chars (`threads.ts:27`) but no feedback to the client that truncation occurred.
**E-ROUTES-11.** Telemetry `days` parameter SQL-injected via string interpolation (`telemetry.ts:60`: `-${days} days`) — safe because `days` is validated as integer, but the pattern is fragile.
**E-ROUTES-12.** Admin tenant list aggregates usage from last 1 day only (`admin.ts:21`) — no configurable window.

### Auth Coverage by Endpoint

| Endpoint | Method | Auth | Rate Limit | Validates Input |
|----------|--------|------|------------|-----------------|
| `/health`, `/api/health` | GET | None | None | — |
| `/api/models` | GET | **None** | None | — |
| `/api/providers` | GET | **None** | None | — |
| `/api/chat/completions` | POST | **None** | None | Partial |
| `/api/auth/register` | POST | None (by design) | None | Yes |
| `/api/auth/login` | POST | None (by design) | 5/15min/IP | Yes |
| `/api/threads/*` | ALL | `authGuard` | None | Yes |
| `/api/admin/*` | ALL | `authGuard` + `requireRole('admin')` | None | Yes |
| `/api/telemetry/*` | GET | `authGuard` | None | Partial |

### Test Gaps

- **No test for unauthenticated chat access** (CRITICAL) — should verify authGuard is enforced.
- **No test for malformed chat messages** (HIGH) — per-element validation missing, no test for it.
- **No test for `usage_log` writes** (HIGH) — because no writes exist.
- **No test for error handler middleware** (MEDIUM) — doesn't exist.
- **No test for providers/models auth** (MEDIUM) — currently unauthenticated by design.
- **No load test for providers endpoint** (MEDIUM) — 27 HTTP calls per request untested.
