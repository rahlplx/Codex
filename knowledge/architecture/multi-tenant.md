---
type: Specification
title: Multi-Tenant Architecture
description: Multi-user support with tenant isolation, per-user provider keys, usage quotas, and shared free-tier pooling.
tags: [multi-tenant, auth, users, isolation]
timestamp: 2026-06-22T00:00:00Z
---

# Multi-Tenant Architecture

The system supports multiple users on a single VPS instance with proper isolation, individual API key management, and shared free-tier resource pooling.

## Tenant Model

```
┌─────────────────────────────────────────────┐
│              TENANT LAYER                    │
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │ User A │  │ User B │  │ User C │        │
│  │        │  │        │  │        │        │
│  │ Keys:  │  │ Keys:  │  │ Keys:  │        │
│  │ OpenAI │  │ (none) │  │Anthropic│       │
│  │ Custom │  │        │  │ OpenAI │        │
│  └───┬────┘  └───┬────┘  └───┬────┘        │
│      │           │           │              │
│      ▼           ▼           ▼              │
│  ┌──────────────────────────────────────┐   │
│  │        SHARED FREE POOL              │   │
│  │  OpenCode Zen | Antigravity | NIM   │   │
│  │  OpenRouter Free | 9Router          │   │
│  │  (fair-share quota per tenant)      │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Database Schema (SQLite)

```sql
-- Tenants/Users
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user',  -- 'admin' | 'user'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME
);

-- Per-tenant API keys (encrypted at rest)
CREATE TABLE tenant_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL,        -- 'openai', 'anthropic', 'openrouter', etc.
  key_encrypted BLOB NOT NULL,   -- AES-256-GCM encrypted
  key_label TEXT,                 -- User-facing label
  auth_type TEXT DEFAULT 'api_key',  -- 'api_key' | 'oauth'
  oauth_tokens_encrypted BLOB,   -- For OAuth providers
  oauth_expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-tenant usage tracking
CREATE TABLE usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Threads are tenant-scoped
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  title TEXT,
  project_path TEXT,
  model TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Auth Flow

### Registration & Login

```
User → WebUI login page
  │
  ├─ Password auth (default)
  │    └─ Bcrypt hash stored in tenants table
  │
  ├─ OAuth (optional, Phase 2)
  │    └─ Google/GitHub OAuth → auto-create tenant
  │
  └─ Admin invite link
       └─ Admin generates invite → user sets password
```

### Session Management

- JWT tokens with 24h expiry (configurable)
- Refresh tokens with 30-day expiry
- All sessions stored in SQLite
- Admin can revoke any session

## Fair-Share Quota (Free Tier Pooling)

When multiple tenants share free-tier providers:

```typescript
interface FairShareConfig {
  // Per-tenant limits on shared free resources
  free_tier_daily_tokens: number;     // default: 100,000 per tenant
  free_tier_daily_requests: number;   // default: 200 per tenant
  
  // Burst allowance (for active users)
  burst_multiplier: 2;                // 2x burst for 15 min windows
  
  // Admin gets unlimited free tier
  admin_unlimited: true;
}
```

## API Key Management UI (Hermes-style)

Visual, card-based interface for managing provider credentials:

```
┌─────────────────────────────────────────────────┐
│  ⚙ Provider Settings                            │
│                                                  │
│  ┌─ Free Providers (auto-configured) ─────────┐ │
│  │                                              │ │
│  │  ✅ OpenCode Zen          [Active]          │ │
│  │  ✅ OpenRouter Free       [Active]          │ │
│  │  ✅ NVIDIA NIM            [Active]          │ │
│  │  🔑 Antigravity           [Connect OAuth →] │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ Your API Keys ────────────────────────────┐ │
│  │                                              │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │ 🤖 OpenAI                              │  │ │
│  │  │ sk-...7x4f                   [Remove]  │  │ │
│  │  │ Status: ✅ Valid  |  $4.20 remaining   │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │                                              │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │ 🟣 Anthropic                           │  │ │
│  │  │ sk-ant-...9k2                [Remove]  │  │ │
│  │  │ Status: ✅ Valid  |  Usage: 45k tokens │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │                                              │ │
│  │  [+ Add API Key]  [+ Connect via OAuth]     │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ Community Routers (Docker sidecars) ──────┐ │
│  │                                              │ │
│  │  ✅ 9Router     [Running]    📊 Dashboard  │ │
│  │  ⬚ CliRelay    [Not started] [Start →]     │ │
│  │  ⬚ CLIProxyAPI [Not started] [Start →]     │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Add API Key Flow

```
[+ Add API Key] clicked
  │
  ├─ Select provider (dropdown with icons)
  │    OpenAI | Anthropic | Google | OpenRouter | Custom
  │
  ├─ Enter API key (masked input)
  │    [sk-••••••••••••••••••••]
  │
  ├─ Auto-validation
  │    → Hit provider's /models endpoint with key
  │    → Show ✅ Valid / ❌ Invalid immediately
  │    → Display available models and remaining quota
  │
  └─ Save (encrypted at rest with AES-256-GCM)
```

### OAuth Connect Flow (Hermes-style)

```
[Connect via OAuth] clicked
  │
  ├─ Select provider
  │    Google (Antigravity) | GitHub
  │
  ├─ Redirect to provider OAuth consent screen
  │    → User authorizes
  │    → Callback with auth code
  │
  ├─ Exchange for tokens
  │    → Store refresh token (encrypted)
  │    → Auto-refresh access tokens
  │
  └─ Show connected status with avatar/email
       [👤 user@gmail.com  |  Disconnect]
```

## Related

- [Auth & Sessions](/architecture/backend.md)
- [Provider Catalog](/providers/index.md)
- [VPS Constraints](/architecture/deployment.md)
