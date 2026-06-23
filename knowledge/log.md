---
type: Log
title: Change Log
description: Chronological history of project decisions, changes, and milestones.
tags: [log, history]
timestamp: 2026-06-22T00:00:00Z
---

# Change Log

## 2026-06-22 — Scope Expansion: Multi-Tenant, Telemetry, Dynamic Registry

- Added **dynamic model registry** with auto-discovery, health probing, circuit breakers
- Added **telemetry-driven routing** with composite scoring algorithm
- Added **multi-tenant architecture** with user isolation, encrypted API keys, fair-share quotas
- Added **Hermes-style provider settings UI** with ASCII wireframes for:
  - Provider dashboard with health cards
  - Add API Key modal with auto-validation
  - OAuth connect flow
  - Telemetry dashboard with model rankings
- Added **VPS resource constraints** (4 vCPU, 8GB RAM, 75GB NVMe) with Docker resource limits
- Created `AGENTS.md` — agentic engineering guide with adapter development workflow
- Confirmed: Telegram bot bridge retained
- Confirmed: multi-user/multi-tenant support
- Fixed Docker Compose issues from Gemini Code Assist review

## 2026-06-22 — Project Inception

- Analyzed [codex-mobile](https://github.com/friuns2/codex-mobile) (Vue 3 + Express, 9656 LOC bridge, full chat UI)
- Decided: fork codex-mobile as frontend, build hybrid layered backend
- Decided: Docker Compose deployment, Caddy/Traefik for production
- Decided: support all free CLI providers from day 1
- Researched and documented all providers and routers:
  - Tier 1: OpenCode Zen, Antigravity, KiloCode, Nemotron, OpenRouter Free
  - Tier 2: 9Router, CliRelay, CLIProxyAPI, AIClient2API
- Adopted Google's Open Knowledge Format (OKF) v0.1 for all documentation
- Created initial OKF knowledge bundle with provider and router docs
