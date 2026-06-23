# Feature: Multi-Tenant Auth

**Status:** Planned
**Spec:** [SPEC-002](../specs/SPEC-002-tech-stack.md)
**Branch:** `feature/multi-tenant-auth`

## Summary

JWT-based authentication with admin/user roles, password-based registration, session management, and per-tenant API key encryption. First registered user auto-promoted to admin. Admin can manage all tenants, quotas, and invite new users. All API keys encrypted at rest with AES-256-GCM.

## UI/UX Screens

### Screen 1: Login

**Route:** `/login`
**Component:** `LoginPage.vue`

```
+----------------------------------+
|           Codex                  |
|                                  |
| Email:    [                    ] |
| Password: [                    ] |
|                                  |
|         [Sign In]                |
|                                  |
| Don't have an account? Register  |
+----------------------------------+
```

**Interactions:**
- Email validation on blur (format check)
- Password show/hide toggle
- [Sign In] calls `POST /api/auth/login`
- JWT stored in memory (not localStorage), refresh token in httpOnly cookie
- On success: redirect to `/`
- Error states: invalid credentials, rate limited (5 attempts per 15min per IP), account disabled

### Screen 2: Register

**Route:** `/register`
**Component:** `RegisterPage.vue`

```
+----------------------------------+
|        Create Account            |
|                                  |
| Name:     [                    ] |
| Email:    [                    ] |
| Password: [                    ] |
| Confirm:  [                    ] |
|                                  |
|       [Create Account]           |
|                                  |
| Already have an account? Login   |
+----------------------------------+
```

**Interactions:**
- Email uniqueness check on blur via `POST /api/auth/check-email`
- Password strength indicator (min 8 chars, 1 uppercase, 1 number)
- Confirm password must match
- [Create Account] calls `POST /api/auth/register`
- First user auto-promoted to admin role
- On success: auto-login and redirect to `/`

### Screen 3: User Settings

**Route:** `/settings`
**Component:** `UserSettings.vue`

```
+-----------------------------------------+
| =  Settings                             |
+-----------------------------------------+
| Profile                                  |
| Name:  [Current Name          ] [Save]   |
| Email: user@example.com (read-only)      |
|                                          |
| Change Password                          |
| Current:  [            ]                 |
| New:      [            ]                 |
| Confirm:  [            ] [Update]        |
|                                          |
| Usage This Period                         |
| ==================== 78k / 100k tokens   |
| Resets: 2026-06-24 00:00 UTC             |
|                                          |
| Default Model                             |
| [v Auto (best available)               ] |
|                                          |
| Danger Zone                               |
| [Delete Account]                          |
+-----------------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `UserSettings.vue` | `src/frontend/src/components/auth/UserSettings.vue` | Settings page container |
| `UsageBar.vue` | `src/frontend/src/components/auth/UsageBar.vue` | Token usage progress bar |

**Interactions:**
- Profile save: `PATCH /api/auth/me`
- Password change: `POST /api/auth/change-password`
- Default model: persisted per tenant in tenants table
- Delete account: confirmation modal, then `DELETE /api/auth/me`

### Screen 4: Admin Panel

**Route:** `/admin` (admin role only)
**Component:** `AdminPanel.vue`

```
+-----------------------------------------+
| =  Admin Panel                           |
+-----------------------------------------+
| Tenants (3 active)                       |
| +--------------------------------------+ |
| | alice@ex.com  | admin | 45k tokens  | |
| | bob@ex.com    | user  | 78k tokens  | |
| | carol@ex.com  | user  | 12k tokens  | |
| +--------------------------------------+ |
|                                          |
| System Quotas                             |
| Daily per-tenant: [100000] tokens        |
| Max tenants:      [10    ]               |
|                       [Save Settings]    |
|                                          |
| [+ Invite User]                          |
+-----------------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `AdminPanel.vue` | `src/frontend/src/components/auth/AdminPanel.vue` | Admin page container |
| `TenantTable.vue` | `src/frontend/src/components/auth/TenantTable.vue` | Tenant list with actions |

**Interactions:**
- Tenant actions: disable/enable, promote/demote role
- Quota changes: `PATCH /api/admin/quotas`
- Invite: `POST /api/admin/invite` generates single-use invite URL
- Vue Router guard: non-admin users redirected to `/`

## Acceptance Criteria

- [ ] Register creates tenant with bcrypt-hashed password (cost factor 12), returns JWT
- [ ] Login validates credentials, returns JWT (24h expiry) with role claim
- [ ] First registered user auto-promoted to admin role
- [ ] JWT refresh token rotation works (old token invalidated on use)
- [ ] Auth middleware rejects unauthenticated requests to all `/api/*` except `/api/auth/*` and `/api/health`
- [ ] Admin can view all tenants, disable accounts, adjust quotas, generate invite links
- [ ] User can change password, set display name, set default model
- [ ] API key storage uses AES-256-GCM encryption with per-tenant derived key
- [ ] Quota enforcement blocks requests when daily token limit exceeded (returns 429)
- [ ] Rate limiting: 5 failed login attempts per 15 minutes per IP

## Implementation Notes

- JWT signing: RS256 with key pair generated on first startup, stored in `data/` volume
- Refresh tokens: stored in `sessions` table with device fingerprint
- Encryption key derivation: HKDF from `ENCRYPTION_MASTER_KEY` env var + tenant ID salt
- SQLite schema: tenants, tenant_keys, sessions, usage_log (see knowledge/architecture/multi-tenant.md)
- Password hashing: bcrypt with cost factor 12

## Test Coverage

- Unit: `tests/unit/backend/auth/jwt.test.ts`
- Unit: `tests/unit/backend/auth/password.test.ts`
- Unit: `tests/unit/backend/auth/encryption.test.ts`
- Unit: `tests/unit/frontend/components/auth/LoginForm.test.ts`
- Integration: `tests/integration/auth/login-flow.test.ts`
- Integration: `tests/integration/auth/tenant-isolation.test.ts`
- E2E: `tests/e2e/auth/registration.spec.ts`
