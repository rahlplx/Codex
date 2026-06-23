# SPEC-002: Tech Stack

**Status:** Accepted  
**Date:** 2026-06-23  
**Author:** claude

## Problem

The project needs a concrete, locked-in tech stack before any implementation begins. Without this, agents make inconsistent choices across PRs.

## Decision

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend SPA | Vue 3 + Composition API | ^3.5 |
| Frontend styling | Tailwind CSS | 4.x |
| Frontend build | Vite | ^6.0 |
| Frontend language | TypeScript (strict) | ^5.4 |
| Frontend routing | Vue Router | ^4.3 |
| Backend runtime | Node.js | ≥22 LTS |
| Backend framework | Express | ^5.0 |
| Backend language | TypeScript (strict, compiled via tsup) | ^5.4 |
| Database | SQLite (better-sqlite3) | ^9.0 |
| Unit tests | Vitest | ^2.0 |
| Container | Docker + Docker Compose | 3.8 |
| Reverse proxy (prod) | Caddy | 2.x |

## Rationale

- **Vue 3**: Proven with codex-mobile (the UI we fork from). Composition API + `<script setup>` maximizes readability.
- **Tailwind 4**: Zero-runtime CSS, first-class dark mode, mobile-first — matches target polished UX.
- **Express 5**: Async error handling without boilerplate. Minimal surface area for a proxy/gateway server.
- **SQLite**: Eliminates external DB dependency on a single-VPS deploy. better-sqlite3 is synchronous and fast enough for the request volume.
- **Vitest**: Same config as Vite, faster than Jest for TypeScript projects.
- **tsup**: Zero-config TypeScript bundler for the backend; avoids ts-node in production.

## Alternatives Considered

- **React + Next.js**: Rejected — codex-mobile is Vue; forking React would require full rewrite.
- **PostgreSQL**: Rejected — overkill for a single-VPS self-hosted tool; SQLite covers all use cases until 10k+ concurrent users.
- **Fastify**: Rejected — Express 5 has better ecosystem compatibility with existing codex-mobile patterns.
- **esbuild directly**: Rejected — tsup wraps esbuild with the right defaults; no reason to drop down.

## Acceptance Criteria

- [x] `package.json` in `backend/` lists Express ^5, better-sqlite3 ^9, TypeScript strict
- [x] `package.json` in `frontend/` lists Vue ^3.5, Tailwind 4, Vite ^6
- [x] `tsconfig.json` in both directories has `"strict": true`
- [x] `vitest.config.ts` exists and runs `npm test` green
- [x] Docker Compose `up` starts both services
