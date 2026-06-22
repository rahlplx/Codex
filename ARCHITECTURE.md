# Codex Agent WebUI — Architecture Specification

## Vision

A self-hostable coding agent WebUI with a multi-CLI backend that aggregates free AI token sources (OpenCode Zen, Antigravity/Gemini, KiloCode, Nemotron, OpenRouter) and community router repos (9Router, CliRelay, CLIProxyAPI, AIClient2API) into a single unified interface — maximizing free compute while maintaining a polished, production-grade UX.

## Why This Approach

Most individual CLIs offer generous free tiers:
- **OpenCode Zen** — free curated coding models at `opencode.ai/zen/v1`
- **Antigravity CLI** — free Gemini 3.5 Flash via Google OAuth
- **KiloCode CLI** — free tier forever, 500+ models via OpenRouter
- **Nemotron/NIM** — free NVIDIA models at `build.nvidia.com`
- **OpenRouter** — free tier models (Llama, Gemma, etc.)

Community routers multiply this:
- **9Router** (18k stars) — routes to 40+ providers, RTK compression saves 20-40% tokens
- **CliRelay** — wraps all major CLIs as unified OpenAI-compatible API with OAuth
- **CLIProxyAPI** — multi-CLI proxy with WebUI management center
- **AIClient2API** — account pool + failover, 99.9% uptime claim

By layering them: **direct CLI adapters** for maximum free tokens → **community routers** for fallback/pooling → **paid providers** as last resort.

---

## High-Level Architecture

```
                    ┌─────────────────────────────────────┐
                    │         USER (Browser/Mobile)         │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────────┐
                    │   REVERSE PROXY (Caddy/Traefik)      │
                    │   - SSL termination                  │
                    │   - Rate limiting                    │
                    │   - /  → frontend                    │
                    │   - /api/* → backend                 │
                    │   (Phase 2 — Docker Compose first)   │
                    └──────┬───────────┬──────────────────┘
                           │           │
              ┌────────────▼──┐   ┌───▼──────────────────┐
              │   FRONTEND    │   │      BACKEND          │
              │ (Vue 3 SPA)   │   │   (Node.js/Express)   │
              │ Port 5173/80  │   │   Port 3001           │
              └───────────────┘   └───────┬──────────────┘
                                          │
              ┌───────────────────────────▼──────────────────┐
              │            CLI ORCHESTRATOR                    │
              │                                               │
              │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
              │  │ Router   │ │ Fallback │ │ Quota/Health  │ │
              │  │ Engine   │ │ Chain    │ │ Monitor       │ │
              │  └──────────┘ └──────────┘ └──────────────┘ │
              └──┬─────┬──────┬──────┬──────┬──────┬────────┘
                 │     │      │      │      │      │
     ┌───────────┘  ┌──┘   ┌──┘   ┌──┘   ┌──┘   ┌─┘
     ▼              ▼      ▼      ▼      ▼      ▼
  ┌──────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐
  │OpenCd│ │Antigrav│ │Kilo  │ │Nemo- │ │Open- │ │Custom  │
  │ Zen  │ │ity CLI │ │Code  │ │tron  │ │Router│ │Endpoint│
  └──────┘ └────────┘ └──────┘ └──────┘ └──────┘ └────────┘
              TIER 1: Direct CLI Adapters

  ┌──────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
  │  9   │ │  CLI   │ │CLIProxy  │ │AIClient    │
  │Router│ │ Relay  │ │  API     │ │  2API      │
  └──────┘ └────────┘ └──────────┘ └────────────┘
              TIER 2: Community Routers (Sidecars)

  ┌──────────┐ ┌──────────┐ ┌────────────────┐
  │ OpenAI   │ │ Anthropic│ │ Self-hosted     │
  │ (paid)   │ │ (paid)   │ │ (Ollama/vLLM)  │
  └──────────┘ └──────────┘ └────────────────┘
              TIER 3: Paid / Self-hosted Fallback
```

---

## Frontend (Fork of codex-mobile)

### What We Reuse (90%)
- Full chat UI: `ThreadConversation.vue`, `ThreadComposer.vue`
- Streaming support: WebSocket + SSE real-time transport
- Thread management: sidebar, project grouping, search, archiving
- Terminal emulation: xterm.js integration
- File browser: directory listing, text editor
- Git review: diff viewer, review pane
- Dark/light theme, mobile responsive, voice input
- Authentication: password-based sessions
- Cloudflare tunnel + QR code for remote access

### What We Modify
- **`codexAppServerBridge.ts`** → Replace with `backendGateway.ts`
  - Instead of spawning `codex app-server` child process, connect to our backend via HTTP/WS
  - Same JSON-RPC-like interface, different transport
- **`freeMode.ts`** → Extend to show all available providers/CLIs
- **`unifiedResponsesProxy.ts`** → Move to backend (proxy logic belongs server-side)
- **Provider selection UI** → New component showing provider health, quota, cost
- **Settings** → Add CLI management panel (enable/disable CLIs, add API keys, OAuth)

### New Frontend Components
```
src/components/
  content/
    ProviderDashboard.vue      # Provider health, quota, cost overview
    ProviderConfig.vue         # Add/configure CLI adapters
    RouterStatus.vue           # 9Router/CliRelay sidecar status
    ModelCatalog.vue           # Browse all available models across providers
    CostTracker.vue            # Token usage and savings tracking
```

---

## Backend Architecture

### Project Structure

```
backend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Entry point
│   │
│   ├── server/                     # HTTP/WS Server
│   │   ├── httpServer.ts           # Express setup, middleware
│   │   ├── wsServer.ts             # WebSocket for streaming
│   │   ├── sseHandler.ts           # SSE fallback
│   │   ├── auth.ts                 # Auth (reuse codex-mobile pattern)
│   │   └── routes/
│   │       ├── chat.ts             # POST /api/chat/completions
│   │       ├── threads.ts          # CRUD thread management
│   │       ├── providers.ts        # GET/POST provider config
│   │       ├── models.ts           # GET available models
│   │       ├── health.ts           # GET provider health dashboard
│   │       ├── files.ts            # File browser endpoints
│   │       └── terminal.ts         # Terminal/exec endpoints
│   │
│   ├── orchestrator/               # Smart Routing Engine
│   │   ├── router.ts               # Route request → best provider
│   │   ├── fallbackChain.ts        # 3-tier fallback logic
│   │   ├── quotaTracker.ts         # Per-provider quota monitoring
│   │   ├── healthMonitor.ts        # Periodic health checks
│   │   ├── tokenBudget.ts          # Daily/hourly token budgets
│   │   └── costOptimizer.ts        # Minimize cost across providers
│   │
│   ├── adapters/                   # CLI Adapters (Tier 1)
│   │   ├── base.ts                 # ICliAdapter interface
│   │   ├── opencode-zen.ts         # OpenCode Zen (opencode.ai/zen/v1)
│   │   ├── antigravity.ts          # Antigravity CLI (Gemini models)
│   │   ├── kilocode.ts             # KiloCode CLI (@kilocode/cli)
│   │   ├── nemotron.ts             # NVIDIA NIM (build.nvidia.com)
│   │   ├── openrouter.ts           # OpenRouter (free + paid tiers)
│   │   ├── openrouter-free.ts      # OpenRouter free-only (key rotation)
│   │   ├── custom-endpoint.ts      # Any OpenAI-compatible endpoint
│   │   ├── ollama.ts               # Local Ollama models
│   │   └── registry.ts             # Adapter discovery & registration
│   │
│   ├── integrations/               # Router Integrations (Tier 2)
│   │   ├── nine-router.ts          # 9Router sidecar (port 20128)
│   │   ├── cli-relay.ts            # CliRelay sidecar
│   │   ├── cli-proxy-api.ts        # CLIProxyAPI sidecar
│   │   ├── ai-client-2-api.ts      # AIClient2API sidecar
│   │   └── sidecarManager.ts       # Start/stop/health of sidecars
│   │
│   ├── proxy/                      # LLM Protocol Translation
│   │   ├── unified.ts              # Responses API ↔ Chat Completions
│   │   ├── streaming.ts            # SSE stream assembly
│   │   ├── transform.ts            # Message format normalization
│   │   └── tokenCounter.ts         # Estimate token counts
│   │
│   ├── storage/                    # Persistence Layer
│   │   ├── sqlite.ts               # SQLite for threads, messages
│   │   ├── config.ts               # Provider config (YAML/JSON)
│   │   ├── sessions.ts             # Auth sessions
│   │   └── migrations/             # DB schema migrations
│   │
│   └── types/                      # Shared TypeScript Types
│       ├── adapter.ts
│       ├── provider.ts
│       ├── thread.ts
│       ├── message.ts
│       └── config.ts
```

### CLI Adapter Interface

```typescript
interface ICliAdapter {
  // Identity
  id: string;                          // e.g., "opencode-zen"
  name: string;                        // e.g., "OpenCode Zen"
  tier: 'free' | 'freemium' | 'paid';
  
  // Capabilities
  supportedModels(): Promise<Model[]>;
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  supportsReasoning: boolean;
  
  // Health & Quota
  healthCheck(): Promise<HealthStatus>;
  getQuota(): Promise<QuotaStatus>;
  
  // Core API (normalized to OpenAI Chat Completions)
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  
  // Lifecycle
  initialize(config: AdapterConfig): Promise<void>;
  shutdown(): Promise<void>;
}

interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  quotaRemaining?: number;
  quotaResetAt?: Date;
  error?: string;
}
```

### Routing Logic

```
Request arrives → Router evaluates:

1. Model preference?
   → If user selected specific model, find adapter that serves it
   
2. Cost constraint?
   → Prefer free tier adapters first
   
3. Quota check
   → Skip adapters at quota limit
   
4. Health check
   → Skip unhealthy adapters
   
5. Priority order (configurable):
   a. Direct free CLIs (OpenCode Zen, Antigravity, Nemotron)
   b. Community routers (9Router, CliRelay) — pooled free tokens
   c. OpenRouter free tier
   d. Self-hosted (Ollama, vLLM)
   e. Paid APIs (OpenRouter paid, direct OpenAI/Anthropic)

6. Fallback chain:
   → If primary fails, try next in chain
   → Log failure for health monitor
   → Return error only if ALL fail
```

---

## Docker Compose Setup

### Phase 1: Core Services

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    environment:
      - VITE_BACKEND_URL=/api
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data          # SQLite DB, config persistence
      - ./config:/app/config      # Provider configs
    environment:
      - DATABASE_PATH=/app/data/codex.db
      - OPENCODE_ZEN_ENABLED=true
      - OPENROUTER_FREE_ENABLED=true
      - NEMOTRON_ENABLED=true
    # nine-router is optional; start with: docker compose --profile routers up

  # --- Tier 2: Community Router Sidecars (optional) ---
  
  nine-router:
    image: ghcr.io/decolua/9router:latest  # or build from source
    ports:
      - "20128:20128"
    volumes:
      - ./config/9router:/app/config
    profiles:
      - routers                   # Only start with --profile routers

  cli-relay:
    image: ghcr.io/kittors/clirelay:latest
    ports:
      - "3456:3456"
    volumes:
      - ./config/clirelay:/app/config
    profiles:
      - routers

  cli-proxy-api:
    image: ghcr.io/router-for-me/cliproxyapi:latest
    ports:
      - "8080:8080"
    volumes:
      - ./config/cliproxyapi:/app/config
    profiles:
      - routers

volumes:
  data:
```

### Phase 2: Production with Reverse Proxy

```yaml
# docker-compose.prod.yml (extends base)
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - frontend
      - backend

volumes:
  caddy_data:
```

```
# Caddyfile
yourdomain.com {
    handle /api/* {
        reverse_proxy backend:3001
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

---

## Provider Configuration

```yaml
# config/providers.yaml
providers:
  # --- Tier 1: Direct CLI Adapters ---
  opencode-zen:
    enabled: true
    tier: free
    base_url: "https://opencode.ai/zen/v1"
    wire_api: responses        # Native Responses API
    priority: 1
    models:
      - "opencode/zen-default"
    
  antigravity:
    enabled: true
    tier: free
    auth_type: google-oauth    # Requires OAuth flow
    priority: 2
    models:
      - "gemini-3.5-flash"

  kilocode:
    enabled: true
    tier: free
    base_url: "https://api.kilo.ai/v1"
    priority: 3
    models:
      - "via-openrouter"       # 500+ models

  nemotron:
    enabled: true
    tier: free
    base_url: "https://integrate.api.nvidia.com/v1"
    priority: 4
    models:
      - "nvidia/nemotron-3-super-120b"
      - "nvidia/nemotron-3-ultra"

  openrouter-free:
    enabled: true
    tier: free
    base_url: "https://openrouter.ai/api/v1"
    key_rotation: true         # Rotate through free keys
    priority: 5
    models:
      - "meta-llama/llama-3.3-70b:free"
      - "google/gemma-4-26b:free"
      - "openrouter/free"

  # --- Tier 2: Community Routers (sidecars) ---
  nine-router:
    enabled: false             # Enable with --profile routers
    tier: free
    type: sidecar
    base_url: "http://nine-router:20128/v1"
    priority: 10
    features:
      - rtk-compression        # 20-40% token savings
      - auto-fallback
      - format-translation

  cli-relay:
    enabled: false
    tier: free
    type: sidecar
    base_url: "http://cli-relay:3456/v1"
    priority: 11

  # --- Tier 3: Paid Fallback ---
  openrouter-paid:
    enabled: false
    tier: paid
    base_url: "https://openrouter.ai/api/v1"
    api_key: "${OPENROUTER_API_KEY}"
    priority: 50

  custom:
    enabled: false
    tier: paid
    base_url: "${CUSTOM_LLM_URL}"
    api_key: "${CUSTOM_LLM_KEY}"
    priority: 99

routing:
  strategy: "cost-optimized"   # or "performance", "round-robin"
  fallback_enabled: true
  max_retries: 3
  health_check_interval_sec: 60
  token_budget:
    daily_limit: 1000000       # 1M tokens/day across all providers
    alert_threshold: 0.8       # Alert at 80% usage
```

---

## Key Design Decisions

### 1. Why fork codex-mobile instead of building from scratch
- 9,656 LOC bridge + 5,733 LOC state management + 3,661 LOC API layer already written
- Real-time streaming, thread management, terminal, file browser — all production-tested
- The UI is genuinely good (Tailwind 4, dark/light, mobile responsive, voice input)
- Only need to replace the bridge layer (~1 file) and extend provider management

### 2. Why hybrid layered instead of pure router
- Direct CLI adapters give us first-party free tokens with no middleman
- Community routers provide pooling/fallback for when direct adapters hit limits
- We control the orchestration logic (priority, quota, health) at our layer
- If any community router goes down, we still have direct adapters

### 3. Why SQLite for storage
- Zero external dependencies (no Postgres/Redis needed)
- Embedded in the backend process
- Perfect for single-VPS self-hosting
- Easy backup (one file to copy)
- Can migrate to Postgres later if needed

### 4. Why Docker Compose
- Sidecars (9Router, CliRelay) are separate processes with their own dependencies
- Isolation prevents one crashing router from taking down the whole system
- Easy to add/remove routers with profiles
- Volume mounts for persistent config/data
- Natural path to Kubernetes if needed

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Fork codex-mobile into `frontend/`
- [ ] Create backend scaffold (Express + TypeScript)
- [ ] Implement base adapter interface
- [ ] Build OpenCode Zen adapter (already in codex-mobile's `zenProxy.ts`)
- [ ] Build OpenRouter free adapter (reuse `freeMode.ts` key rotation)
- [ ] Replace `codexAppServerBridge.ts` with `backendGateway.ts`
- [ ] Basic thread management in SQLite
- [ ] Docker Compose with frontend + backend
- [ ] Verify streaming chat works end-to-end

### Phase 2: Multi-Provider (Week 3-4)
- [ ] Build Antigravity adapter (OAuth flow)
- [ ] Build Nemotron/NIM adapter
- [ ] Build KiloCode adapter
- [ ] Implement router engine (priority, fallback, health)
- [ ] Provider dashboard UI
- [ ] Quota tracking and budget alerts

### Phase 3: Community Routers (Week 5-6)
- [ ] 9Router sidecar integration
- [ ] CliRelay sidecar integration
- [ ] CLIProxyAPI sidecar integration
- [ ] AIClient2API integration
- [ ] Sidecar manager (start/stop/health)
- [ ] Router status dashboard UI

### Phase 4: Production Hardening (Week 7-8)
- [ ] Caddy/Traefik reverse proxy
- [ ] SSL auto-cert
- [ ] Rate limiting at gateway
- [ ] Account pool management
- [ ] Monitoring / alerting
- [ ] Backup/restore scripts
- [ ] Documentation

---

## Open Design Integration

The [Open Design](https://github.com/nexu-io/open-design) project provides 17 first-party BYOK adapters and 259+ skills. We can:

1. **Reuse adapter patterns** — their adapter architecture for 17 CLIs (Claude Code, Codex, Cursor, Gemini CLI, Copilot, Grok, Hermes, Kimi, OpenCode, Qwen, DeepSeek, Pi, Mistral Vibe, Kiro, Kilo, Qoder) maps directly to our adapter layer
2. **Import skills** — their skills/DESIGN.md system can be integrated into our skills hub
3. **Reference their CLI detection** — how they find and spawn various CLIs on different platforms

---

## Open Knowledge Format (OKF) Integration

We adopt [Google's Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) as the documentation standard across the entire project. OKF is a vendor-neutral, agent-friendly markdown spec that makes our documentation consumable by both humans and AI agents without translation.

### Why OKF

1. **AI agent efficiency** — agents parse YAML frontmatter for structured metadata, read markdown body for context, follow links to traverse the knowledge graph
2. **Human readable** — it's just markdown with YAML headers, renderable on GitHub
3. **No SDK needed** — files are the API; shippable as tarball, hostable in git
4. **Cross-domain** — works for API docs, provider configs, model catalogs, runbooks, architecture decisions
5. **Version controlled** — lives alongside code in git

### OKF Directory Structure

```
knowledge/
├── index.md                           # Root navigation / project overview
│
├── architecture/
│   ├── index.md                       # Architecture overview
│   ├── frontend.md                    # Frontend architecture (Vue 3)
│   ├── backend.md                     # Backend architecture (Express)
│   ├── orchestrator.md                # CLI orchestrator design
│   ├── proxy-layer.md                 # LLM protocol translation
│   └── deployment.md                  # Docker / VPS deployment
│
├── providers/
│   ├── index.md                       # Provider catalog overview
│   ├── opencode-zen.md                # OpenCode Zen adapter docs
│   ├── antigravity.md                 # Antigravity/Gemini adapter docs
│   ├── kilocode.md                    # KiloCode adapter docs
│   ├── nemotron.md                    # NVIDIA Nemotron/NIM docs
│   ├── openrouter.md                  # OpenRouter adapter docs
│   ├── openrouter-free.md             # OpenRouter free tier specifics
│   └── custom-endpoint.md             # Custom OpenAI-compatible endpoints
│
├── routers/
│   ├── index.md                       # Community router overview
│   ├── nine-router.md                 # 9Router integration docs
│   ├── cli-relay.md                   # CliRelay integration docs
│   ├── cli-proxy-api.md               # CLIProxyAPI integration docs
│   └── ai-client-2-api.md             # AIClient2API integration docs
│
├── models/
│   ├── index.md                       # Model catalog navigation
│   ├── free-models.md                 # All available free models
│   └── model-routing.md               # How models are routed
│
├── api/
│   ├── index.md                       # API reference overview
│   ├── chat-completions.md            # POST /api/chat/completions
│   ├── threads.md                     # Thread CRUD endpoints
│   ├── providers-api.md               # Provider management endpoints
│   ├── health.md                      # Health check endpoints
│   └── websocket.md                   # WebSocket protocol
│
├── runbooks/
│   ├── index.md                       # Operational runbooks
│   ├── setup-vps.md                   # First-time VPS setup
│   ├── add-provider.md                # Adding a new provider
│   ├── troubleshoot-quota.md          # Quota exhaustion recovery
│   └── backup-restore.md             # Backup and restore procedures
│
└── log.md                             # Chronological change history
```

### OKF File Format Example

Every knowledge file follows this structure:

```yaml
---
type: Provider Adapter
title: OpenCode Zen
description: Free curated coding models via opencode.ai/zen/v1 API
resource: https://opencode.ai/zen
tags: [provider, free, tier-1, coding-models]
timestamp: 2026-06-22T00:00:00Z
---

# OpenCode Zen Adapter

One-line summary of what this adapter does.

## Connection

| Field | Value |
|-------|-------|
| Base URL | `https://opencode.ai/zen/v1` |
| Auth | None (free tier) / API key (paid) |
| Wire API | Responses API (native) |
| Streaming | SSE supported |

## Supported Models

| Model | Context | Free | Notes |
|-------|---------|------|-------|
| zen-default | 128k | Yes | Curated for coding |

## Rate Limits

| Limit | Value |
|-------|-------|
| RPM | 60 |
| TPM | 100,000 |
| Daily | Unlimited |

## Related

- [Proxy Layer](/architecture/proxy-layer.md)
- [Model Routing](/models/model-routing.md)
- [OpenRouter](/providers/openrouter.md) (fallback)
```

### How Our Agents Use OKF

1. **Backend orchestrator** reads `knowledge/providers/*.md` YAML frontmatter to discover available providers, their capabilities, and configuration
2. **Frontend model catalog** renders `knowledge/models/*.md` to show users what's available
3. **Health monitor** references `knowledge/runbooks/*.md` for automated recovery procedures
4. **New contributor onboarding** — read `knowledge/index.md` and follow links
5. **AI coding assistants** (Claude Code, Cursor, etc.) working on this codebase get full context from the knowledge graph without needing separate documentation

---

## References

### Free AI Sources
- [OpenCode Zen](https://opencode.ai/zen) — Free curated coding models
- [Antigravity CLI](https://ai.google.dev/gemini-api/docs/antigravity-agent) — Free Gemini 3.5 Flash
- [KiloCode CLI](https://kilo.ai/cli) — Free tier with 500+ models
- [Nemotron / NVIDIA NIM](https://developer.nvidia.com/nemotron) — Free NVIDIA models
- [OpenRouter Free](https://openrouter.ai/) — Free tier models

### Community Routers
- [9Router](https://github.com/decolua/9router) — 18k stars, 40+ providers, RTK compression
- [CliRelay](https://github.com/kittors/CliRelay) — Multi-CLI wrapper with OAuth
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) — Multi-CLI proxy with WebUI
- [AIClient2API](https://github.com/justlovemaki/AIClient2API) — Account pool + failover

### Frontend Reference
- [codex-mobile (codexui)](https://github.com/friuns2/codex-mobile) — Vue 3 WebUI for Codex

### Design Reference
- [Open Design](https://github.com/nexu-io/open-design) — 17 CLI adapters, 259+ skills
