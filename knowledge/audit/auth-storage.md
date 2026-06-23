---
type: Audit Report
title: Auth & Storage Domain Audit
description: Findings for backend/src/auth/, backend/src/storage/, types/ — JWT, passwords, middleware, database schema, threads, messages
tags: [audit, auth, storage, jwt, sqlite, tier-1, security]
timestamp: 2026-06-23T00:00:00Z
related:
  - ./server-routes.md
  - ./adapters.md
  - ../providers/index.md
---

# Auth & Storage Domain Audit

## Management Brief

The auth system is functional but has gaps in JWT payload validation — after verifying the signature, `verifyToken` only checks `exp` and does not validate the `sub`, `email`, or `role` fields exist and have the correct types. A malformed but signed token (e.g., missing `sub`) passes verification, and downstream code (`req.tenant.sub`) would produce `undefined`, leading to silent data corruption in tenant-scoped queries. Separately, the database schema has a **timestamp format mismatch** — `tenants`, `tenant_keys`, and `usage_log` use ISO strings (`datetime('now')`) while `threads` and `messages` use epoch integers. Cross-table joins or queries that compare timestamps will produce incorrect results. The `tenant_keys.key_encrypted` column stores keys as `BLOB` but no encryption implementation exists anywhere in the codebase — keys are stored in plaintext despite the column name implying encryption.

## Findings

### High

**S-AUTH-1. JWT `verifyToken` does not validate payload structure after signature check**
- File: `backend/src/auth/jwt.ts:42-47`
- After signature verification, the code parses the payload and checks `typeof decoded.exp !== 'number'` but does not validate `sub` (string), `email` (string), or `role` ('admin' | 'user'). A signed token with `sub: 42` (number) or missing `email` passes verification.
- Fix: Add type guards: `typeof decoded.sub !== 'string'`, `typeof decoded.email !== 'string'`, `!['admin','user'].includes(decoded.role)`.
- Impact: Malformed tokens propagate through the system; `req.tenant.sub` could be non-string, causing silent query corruption.

**S-AUTH-2. JWT algorithm header not validated — future `alg:none` vector**
- File: `backend/src/auth/jwt.ts:30-34`
- `verifyToken` never checks the `alg` field in the JWT header. The current HMAC flow prevents exploitation because `createHmac('sha256', SECRET)` is hardcoded, but if the code is ever refactored to respect the header's algorithm, an `alg:none` token could bypass verification.
- Fix: Parse header, assert `alg === 'HS256'`, reject otherwise.
- Impact: Defense-in-depth gap. No immediate exploit, but a common JWT vulnerability pattern.

**S-AUTH-3. `quotaGuard` middleware is defined nowhere**
- Files: `backend/src/auth/middleware.ts`, `backend/src/server/routes/chat.ts`
- The `usage_log` table exists, `authGuard` is implemented, but there is no middleware that enforces per-tenant quotas. The chat endpoint has no rate limiting tied to token usage.
- Fix: Implement `quotaGuard` that reads `usage_log` aggregate for the current tenant and rejects when over threshold.
- Impact: A single tenant can exhaust all provider quotas with no limit.

### Medium

**E-AUTH-1. Database timestamp format mismatch across tables**
- File: `backend/src/storage/database.ts:12-72`
- `tenants.created_at`, `tenant_keys.created_at`, `usage_log.timestamp` use `TEXT DEFAULT (datetime('now'))` (ISO 8601 strings). `threads.created_at`, `threads.updated_at`, `messages.ts` use `INTEGER NOT NULL` (epoch seconds).
- Fix: Standardize on one format. Epoch integers are more efficient for sorting; ISO strings are more human-readable. Pick one and migrate.
- Impact: Cross-table queries comparing timestamps (e.g., "find usage during a thread's lifespan") require format conversion and are error-prone.

**E-AUTH-2. `tenant_keys.key_encrypted` is not actually encrypted**
- Files: `backend/src/storage/database.ts:24-29`, entire codebase
- The column is named `key_encrypted` with type `BLOB`, but no encryption/decryption functions exist in the codebase. No `encrypt()` or `decrypt()` utility is defined. Keys are stored in plaintext despite the name.
- Fix: Implement AES-256-GCM encryption using a derived key from `JWT_SECRET` or a separate `KEY_ENCRYPTION_SECRET`. Add `encryptKey()` and `decryptKey()` functions.
- Impact: Tenant API keys are stored in plaintext in the SQLite database. Database file compromise exposes all keys.

**E-AUTH-3. Registration race condition on first-admin election (mitigated)**
- File: `backend/src/server/routes/auth.ts:50-56`
- The count+insert is wrapped in a SQLite transaction, which prevents the TOCTOU race for the first-admin check. However, SQLite's default `DEFERRED` transaction mode could still allow two concurrent registrations to both see `count === 0` under high concurrency.
- Fix: Use `IMMEDIATE` transaction: `db.transaction(() => { ... })` → `db.transaction(() => { ... }, { immediate: true })` or use `BEGIN IMMEDIATE`.
- Impact: Low probability — requires exactly simultaneous first registrations. SQLite's single-writer lock makes this nearly impossible in practice.

**E-AUTH-4. Login rate limiter uses in-memory Map — resets on restart**
- File: `backend/src/server/routes/auth.ts:8-27`
- `loginAttempts` is a `Map<string, ...>` in process memory. Server restart clears all rate limit state. In a multi-process deployment (unlikely but possible), each process has independent counters.
- Fix: For single-process deployment this is acceptable. Document the limitation. For multi-process, move to SQLite-backed rate limiting.
- Impact: Low — single-process deployment means this works. But restart resets brute-force protection.

**E-AUTH-5. Password validation has no minimum length or complexity check**
- File: `backend/src/server/routes/auth.ts:34-38`
- Registration validates `email`, `password`, `displayName` are present and truthy, but does not enforce minimum password length. A 1-character password is accepted.
- Fix: Add `password.length < 8` check.
- Impact: Weak passwords accepted.

**E-AUTH-6. Email format not validated on registration**
- File: `backend/src/server/routes/auth.ts:34`
- `email` is checked for truthiness only. `email = "not-an-email"` passes validation.
- Fix: Add basic email format validation (regex or library).
- Impact: Invalid emails in the database; password reset flows (if added later) would fail.

**C-AUTH-1. `verifyPassword` does not handle malformed hash gracefully**
- File: `backend/src/auth/password.ts:17-19`
- If `hash` has no `:` separator, `split(':')` returns `[hash, undefined]`. The `if (!salt || !storedKey)` check catches this, but the function returns `false` rather than throwing, which silently masks database corruption.
- Fix: Acceptable behavior for auth flow. Consider logging the malformed hash for debugging.

**C-AUTH-2. `threads.user_id` has no foreign key to `tenants.id`**
- File: `backend/src/storage/database.ts:47`
- `user_id TEXT NOT NULL` has no `REFERENCES tenants(id)`. Orphaned threads survive tenant deletion.
- Fix: Add `REFERENCES tenants(id) ON DELETE CASCADE`.
- Impact: Data integrity gap — orphaned threads accumulate after tenant deletion.

### Low

**B-AUTH-1.** `displayName` stored as `display_name` in DB but returned as `displayName` in API — inconsistent casing (auth routes do manual mapping).
**B-AUTH-2.** `createdAt` in register response uses `new Date().toISOString()` (JS runtime time) instead of the DB-stored `datetime('now')` (SQLite time) — possible clock skew.
**C-AUTH-3.** `ThreadRepository` and `MessageRepository` not shown in route error responses — generic 500 returned.
**C-AUTH-4.** `usage_log` has `cost_usd REAL DEFAULT 0` but no adapter calculates or reports costs — column is always 0.
**C-AUTH-5.** `messages.role CHECK` constraint lists `'system','user','assistant'` — no `'tool'` role for tool-use flows.
**E-AUTH-7.** `openDatabase` creates schema inline — no migration versioning. Schema changes require manual ALTER TABLE.
**E-AUTH-8.** `tenants.last_active` updated only on login, not on API activity. Stale metric.
**E-AUTH-9.** No database backup strategy — WAL mode helps crash recovery but doesn't protect against file deletion.
**E-AUTH-10.** `usage_log` has no retention policy — unbounded growth.

### Test Gaps

- **No test for malformed JWT payloads** (HIGH) — signed tokens with wrong field types would reveal S-AUTH-1.
- **No test for `quotaGuard`** (HIGH) — doesn't exist yet.
- **No test for concurrent first-admin registration** (MEDIUM)
- **No test for login rate limiter reset behavior** (MEDIUM)
- **No test for password minimum length** (LOW) — because there is no minimum.
- **No integration test for timestamp format consistency** (MEDIUM) — would catch E-AUTH-1.
