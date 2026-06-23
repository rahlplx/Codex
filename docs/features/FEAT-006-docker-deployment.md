# Feature: Docker Deployment

**Status:** Planned
**Spec:** [SPEC-002](../specs/SPEC-002-tech-stack.md)
**Branch:** `feature/docker-deployment`

## Summary

Docker Compose configuration for development and production deployment on a 4 vCPU / 8GB RAM VPS. Core services (frontend + backend) run by default. Community router sidecars (9Router, CliRelay) are optional via `--profile routers`. Production adds Caddy for SSL termination and reverse proxy.

## UI/UX Screens

No UI screens. This is infrastructure only.

## Architecture

### Docker Compose Services

| Service | Image | Port | RAM Limit | CPU Limit | Profile |
|---------|-------|------|-----------|-----------|---------|
| frontend | `codex-frontend:latest` | 5173:80 | 128MB | 0.25 vCPU | default |
| backend | `codex-backend:latest` | 3001:3001 | 1536MB | 1.0 vCPU | default |
| nine-router | `ghcr.io/decolua/9router:latest` | 20128:20128 | 512MB | 0.5 vCPU | routers |
| cli-relay | `ghcr.io/kittors/clirelay:latest` | 3456:3456 | 384MB | 0.384 vCPU | routers |
| caddy | `caddy:2-alpine` | 80:80, 443:443 | 64MB | 0.125 vCPU | production |

### Dockerfile Strategy

**Frontend (multi-stage):**
1. Build stage: `node:22-slim`, install deps, `vite build`
2. Serve stage: `nginx:alpine`, copy `dist/`, Brotli compression, long-cache headers

**Backend (multi-stage):**
1. Build stage: `node:22-slim`, install deps, `tsup` compile
2. Run stage: `node:22-slim`, copy `dist/` + production `node_modules`, `--max-old-space-size=1024`

### Volume Mounts

| Mount | Purpose |
|-------|---------|
| `./data:/app/data` | SQLite database (persists across restarts) |
| `./config:/app/config` | Provider configuration YAML |
| `caddy_data:/data` | Caddy SSL certificates |

### Environment Variables (`.env.example`)

```
# Required
ENCRYPTION_MASTER_KEY=<32-byte-hex>
JWT_SECRET=<random-string>

# Optional
DATABASE_PATH=/app/data/codex.db
NODE_ENV=production
OPENCODE_ZEN_ENABLED=true
OPENROUTER_FREE_ENABLED=true
NEMOTRON_ENABLED=true
CADDY_DOMAIN=yourdomain.com

# Telegram (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=
```

### Caddyfile (Production)

```
{$CADDY_DOMAIN} {
    handle /api/* {
        reverse_proxy backend:3001
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

## Acceptance Criteria

- [ ] `docker compose up -d` starts frontend + backend successfully
- [ ] `docker compose --profile routers up -d` adds 9Router + CliRelay sidecars
- [ ] Frontend serves SPA at port 80 (via Nginx)
- [ ] Backend serves API at port 3001
- [ ] `/api` path proxied correctly (relative URLs, no Docker-internal hostnames in browser)
- [ ] SQLite DB persists in Docker volume across container restarts
- [ ] Resource limits enforced (backend: 1.5GB RAM, frontend: 128MB)
- [ ] Health endpoint at `GET /api/health` returns status of all services
- [ ] `.env.example` documents all environment variables
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up` adds Caddy with auto-SSL
- [ ] Backend starts with `--max-old-space-size=1024`

## Implementation Notes

- Browser talks to relative `/api` path, Caddy/Nginx routes to backend container
- No `depends_on` for profile-gated sidecars (backend handles missing sidecars gracefully)
- Database path is plain file path (not ORM-specific URI format)
- Health check in compose: `curl -f http://localhost:3001/api/health`
- Dev override: `docker-compose.override.yml` with hot reload (Vite dev server, ts-node-dev)

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Core services (frontend + backend) |
| `docker-compose.prod.yml` | Production overlay (Caddy, resource limits) |
| `docker-compose.override.yml.example` | Dev overrides template |
| `src/frontend/Dockerfile` | Frontend multi-stage build |
| `src/backend/Dockerfile` | Backend multi-stage build |
| `Caddyfile` | Production reverse proxy config |
| `.env.example` | Environment variable documentation |

## Test Coverage

- Harness: `docker-compose.yml` exists and contains `frontend` + `backend`
- Harness: Dockerfiles exist in `src/backend/` and `src/frontend/`
- Manual: `docker compose up -d`, verify health, `docker compose down`
