# Feature: Provider Dashboard

**Status:** Planned
**Spec:** [SPEC-002](../specs/SPEC-002-tech-stack.md)
**Branch:** `feature/provider-dashboard`

## Summary

A Hermes-style provider management UI that displays all configured providers as visual cards with real-time health indicators, quota usage, and latency metrics. Users can add API keys, connect OAuth providers, and manage community router sidecars from a single dashboard.

## UI/UX Screens

### Screen 1: Provider Overview

**Route:** `/providers`
**Component:** `ProviderDashboard.vue`

```
+---------------------------------------------+
| =  Codex          [Chat] [Providers] [gear] |
+---------------------------------------------+
| System Health                                |
| [*] 5 Active  [!] 1 Degraded  [x] 0 Down   |
| [i] 847 requests today  [$] $0.00 spent     |
+---------------------------------------------+
| -- Free Providers (auto-configured) --       |
| +----------+ +----------+ +----------+      |
| | OpenCode | | NIM      | | OpenRtr  |      |
| | Zen      | | Nemotron | | Free     |      |
| | [*]340ms | | [*]280ms | | [*]420ms |      |
| | 98.2%    | | 99.1%    | | 95.8%    |      |
| | [Disable]| | [Disable]| | [Disable]|      |
| +----------+ +----------+ +----------+      |
+---------------------------------------------+
| -- Your API Keys --                          |
| +--------------------------------------+     |
| | OpenAI  sk-...7x4f  [ok] Valid       |     |
| | 12 models | $4.20 remaining          |     |
| |                          [Remove]    |     |
| +--------------------------------------+     |
| [+ Add API Key]  [+ Connect via OAuth]       |
+---------------------------------------------+
| -- Community Routers (Docker sidecars) --    |
| 9Router [*] :20128 | 40 providers | [info]  |
| CliRelay [ ] :3456 | not running  | [Start]  |
+---------------------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `ProviderDashboard.vue` | `src/frontend/src/components/providers/ProviderDashboard.vue` | Page container with sections |
| `HealthSummaryBar.vue` | `src/frontend/src/components/providers/HealthSummaryBar.vue` | Top health indicators strip |
| `ProviderCard.vue` | `src/frontend/src/components/providers/ProviderCard.vue` | Individual provider card with health badge |
| `ApiKeyCard.vue` | `src/frontend/src/components/providers/ApiKeyCard.vue` | User API key display with masked key |
| `RouterCard.vue` | `src/frontend/src/components/providers/RouterCard.vue` | Sidecar router status card |

**Data flow:** `useProviders()` composable calls `GET /api/providers` on mount, subscribes to WebSocket `provider:health` events for real-time updates. No polling.

### Screen 2: Add API Key Modal

**Route:** Modal overlay on `/providers`
**Component:** `AddApiKeyModal.vue`

```
+----------------------------------+
| Add API Key                   X  |
+----------------------------------+
| Provider: [v Select provider   ] |
|   - OpenAI                       |
|   - Anthropic                    |
|   - Google AI                    |
|   - OpenRouter                   |
|   - Custom endpoint              |
|                                  |
| API Key: [******************]    |
|                                  |
| [ok] Valid -- 12 models available|
|      Credit: $4.20 remaining    |
|                                  |
| Label: [Personal OpenAI key   ] |
|                                  |
|      [Cancel]  [Save Key]       |
+----------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `AddApiKeyModal.vue` | `src/frontend/src/components/providers/AddApiKeyModal.vue` | Modal container |
| `ProviderSelect.vue` | `src/frontend/src/components/providers/ProviderSelect.vue` | Custom dropdown (no native select per AGENTS.md) |
| `KeyValidator.vue` | `src/frontend/src/components/providers/KeyValidator.vue` | Auto-validate key, show available models/credit |

**Interactions:**
- On paste/blur of API key field: auto-validate via `POST /api/providers/validate-key`
- Validation result shows animated transition: spinner -> checkmark/X with model list
- Save calls `POST /api/providers/keys` (encrypts with AES-256-GCM)
- Quick-add buttons (OpenAI, Anthropic, etc.) pre-fill the provider dropdown

### Screen 3: OAuth Connect Modal

**Route:** Modal overlay on `/providers`
**Component:** `OAuthConnectModal.vue`

```
+----------------------------------+
| Connect via OAuth             X  |
+----------------------------------+
| +------------------------------+ |
| | [G] Google (Antigravity)     | |
| | Access Gemini 3.5 Flash      | |
| | for free            [->]    | |
| +------------------------------+ |
| +------------------------------+ |
| | [GH] GitHub                  | |
| | Access Copilot models        | |
| |                      [->]   | |
| +------------------------------+ |
| +------------------------------+ |
| | [W] Custom OAuth             | |
| | Configure OAuth2 provider    | |
| |                      [->]   | |
| +------------------------------+ |
+----------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `OAuthConnectModal.vue` | `src/frontend/src/components/providers/OAuthConnectModal.vue` | Modal with provider cards |
| `OAuthProviderCard.vue` | `src/frontend/src/components/providers/OAuthProviderCard.vue` | Single OAuth provider option |

**Interactions:**
- Click [->] redirects to provider OAuth consent page
- Backend handles callback at `/api/auth/oauth/callback/:provider`
- On success: modal shows connected status with user email/avatar
- Custom OAuth: inline form for client ID, secret, authorize URL, token URL

## Acceptance Criteria

- [ ] Provider cards show real-time health status (green/yellow/red) via WebSocket
- [ ] Add API Key auto-validates key and shows available models before saving
- [ ] OAuth flow opens browser, completes auth, returns to dashboard with provider active
- [ ] Disable/Enable toggles provider without deleting config
- [ ] Community router cards show running/stopped state
- [ ] All data refreshes via WebSocket push (no polling)
- [ ] Mobile responsive at 375px minimum width
- [ ] Dark theme first, light theme toggle

## Implementation Notes

- Backend routes: `GET /api/providers`, `POST /api/providers/validate-key`, `POST /api/providers/keys`, `DELETE /api/providers/keys/:id`, `GET /api/providers/:id/health`
- WebSocket event `provider:health` pushes health changes in real time
- Provider config loaded from `config/providers.yaml`
- Key encryption: AES-256-GCM with per-tenant derived key (HKDF from master secret + tenant ID)

## Test Coverage

- Unit: `tests/unit/frontend/components/providers/ProviderDashboard.test.ts`
- Unit: `tests/unit/frontend/components/providers/AddApiKeyModal.test.ts`
- Unit: `tests/unit/backend/api/provider.routes.test.ts`
- Integration: `tests/integration/providers/key-lifecycle.test.ts`
- E2E: `tests/e2e/providers/dashboard.spec.ts`
