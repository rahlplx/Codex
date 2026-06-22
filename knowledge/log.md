---
type: Log
title: Change Log
description: Chronological history of project decisions, changes, and milestones.
tags: [log, history]
timestamp: 2026-06-22T00:00:00Z
---

# Change Log

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
