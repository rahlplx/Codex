# SPEC-004: Frontend Scaffold & Provider Dashboard UI

**Status:** Accepted  
**Date:** 2026-06-23  
**Author:** claude

## Problem

The frontend needs a working Vite + Vue 3 + Tailwind scaffold and a first real screen (Provider Dashboard) before chat UI work begins. The dashboard gives operators immediate visibility into which providers are healthy/quota-limited.

## Decision

### Screens

#### Screen 1: Provider Dashboard (`/providers`)

```
┌─────────────────────────────────────────────────────────────┐
│  Codex Agent    [Providers]  [Models]  [Threads]   ☀ 👤     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Provider Health                           [+ Add Provider] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🟢 OpenCode Zen    free   12ms   ∞ quota   3 models  │  │
│  │ 🟢 Nemotron/NIM    free   84ms   ∞ quota   8 models  │  │
│  │ 🟡 KiloCode CLI    free  210ms   ↓ 80%    500 models │  │
│  │ 🔴 Antigravity     free    —     ✗ error   —          │  │
│  │ 🟢 OpenRouter Free freemium 45ms  ↓ 40%   30 models  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Community Routers (sidecars)                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚫ 9Router         not started    [Start]            │  │
│  │ ⚫ CliRelay        not started    [Start]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Token Savings Today: 124,320 tokens saved (RTK 9Router)    │
└─────────────────────────────────────────────────────────────┘
```

#### Screen 2: Model Catalog (`/models`)

```
┌─────────────────────────────────────────────────────────────┐
│  Codex Agent    [Providers]  [Models]  [Threads]   ☀ 👤     │
├─────────────────────────────────────────────────────────────┤
│  Search models...                [Filter: free ▼] [All ▼]  │
│  ─────────────────────────────────────────────────────────  │
│  claude-3-5-sonnet    Anthropic   freemium   128k ctx  ⭐   │
│  gemini-2.0-flash     Google      free        1M ctx   ⚡   │
│  llama-3.3-70b        Meta        free        128k ctx      │
│  nemotron-70b         NVIDIA      free        128k ctx      │
│  qwen-2.5-coder-32b   Alibaba     free        32k ctx  💻   │
└─────────────────────────────────────────────────────────────┘
```

#### Screen 3: Chat / Thread (`/`)

```
┌────────────────────────────────────────────────────────────┐
│ ◀ Sidebar  │              Thread Title               💾 ⋮  │
├────────────┤                                               │
│ Threads    │   [assistant]                                 │
│ ─────────  │   Here's the refactored function:            │
│ ● Thread 1 │   ```typescript                              │
│   Thread 2 │   export function routeRequest(...) {        │
│   Thread 3 │   ```                                        │
│            │                                              │
│            │   [user]  looks good, add tests please       │
│            │                                              │
│            │   [assistant] ⏳ streaming...                │
│            │                                              │
├────────────┤ ───────────────────────────────────────────  │
│ + New      │ [Provider: OpenCode Zen ▼] [Model: auto ▼]  │
│            │ ┌────────────────────────────────────────┐  │
│            │ │ Type a message...                      │  │
│            │ └────────────────────────────────────────┘  │
└────────────┴────────────────────────────────────────────────┘
```

### Vue component tree

```
App.vue
├── AppHeader.vue          # Nav + theme toggle + user menu
├── views/
│   ├── ProvidersView.vue  # Screen 1: provider health cards
│   ├── ModelsView.vue     # Screen 2: model catalog table
│   └── ChatView.vue       # Screen 3: thread + composer
└── components/
    ├── ProviderCard.vue   # Health badge + metrics row
    ├── ModelRow.vue       # One model in the catalog
    └── StatusBadge.vue    # 🟢🟡🔴⚫ status indicator
```

## Acceptance Criteria

- [x] `npm run dev` starts Vite dev server on port 5173
- [x] `npm run build` produces `dist/` without TypeScript errors
- [x] `/providers` route renders with mock data (no backend required)
- [x] `StatusBadge` component renders correct color for healthy/degraded/error/offline states
- [x] Dark mode toggle works (Tailwind `dark:` variant)
- [x] Mobile-responsive: sidebar collapses on < 768px

## References
- `ARCHITECTURE.md` — full component list and WebUI vision
- `knowledge/design/provider-settings.md` — provider card design patterns
