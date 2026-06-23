---
type: Specification
title: VPS Deployment Constraints
description: Resource optimization for 4 vCPU, 8GB RAM, 75GB NVMe VPS with Docker Compose deployment.
tags: [deployment, vps, docker, resources, optimization]
timestamp: 2026-06-22T00:00:00Z
---

# VPS Deployment Constraints

## Server Specifications

| Resource | Spec |
|----------|------|
| CPU | 4 vCPU (AMD server processors) |
| RAM | 8 GB |
| Storage | 75 GB Gen 4 PCIe NVMe SSD |
| Network | 200 Mbit/s port speed |
| Traffic | Unlimited (fair use policy) |
| Snapshots | 1 free snapshot |

## Resource Budget

Total 8 GB RAM allocation:

| Service | RAM Budget | CPU Shares | Notes |
|---------|-----------|------------|-------|
| **Frontend** (Nginx + Vue SPA) | 128 MB | 256 | Static files, minimal |
| **Backend** (Node.js Express) | 1.5 GB | 1024 | Main process, SQLite |
| **9Router** (sidecar) | 512 MB | 512 | Optional, largest router |
| **CliRelay** (sidecar) | 384 MB | 384 | Optional |
| **CLIProxyAPI** (sidecar) | 384 MB | 384 | Optional |
| **Caddy** (reverse proxy) | 64 MB | 128 | SSL termination |
| **System / OS** | ~2 GB | — | Kernel, systemd, etc. |
| **Buffer** | ~3 GB | — | Headroom for spikes |

## Docker Compose Resource Limits

```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

  backend:
    deploy:
      resources:
        limits:
          memory: 1536M
          cpus: '1.0'
        reservations:
          memory: 512M

  nine-router:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    profiles: [routers]

  caddy:
    deploy:
      resources:
        limits:
          memory: 64M
          cpus: '0.125'
```

## Storage Budget (75 GB NVMe)

| Usage | Allocation | Notes |
|-------|-----------|-------|
| OS + system | ~5 GB | Ubuntu/Debian minimal |
| Docker images | ~8 GB | All services |
| Docker volumes | ~2 GB | Caddy certs, configs |
| SQLite database | ~5 GB | Threads, messages, telemetry |
| Application logs | ~3 GB | Rotated, 7-day retention |
| Snapshot | ~15 GB | 1 free snapshot |
| Available | ~37 GB | User files, future growth |

## Performance Optimizations

### Node.js Backend
- `NODE_OPTIONS="--max-old-space-size=1024"` — limit V8 heap to 1GB
- SQLite WAL mode for concurrent reads
- Connection pooling for outbound HTTP (to providers)
- Response streaming (SSE) to minimize memory buffering
- Gzip compression on all API responses

### Frontend
- Pre-built SPA served by Nginx (not Vite dev server)
- Brotli compression for static assets
- Long-cache headers for hashed assets
- Service worker for offline capability

### Network (200 Mbit/s)
- All LLM traffic is outbound (to providers) — minimal bandwidth use
- SSE streaming means low memory, continuous delivery
- Caddy handles HTTP/2 multiplexing
- WebSocket for real-time updates (lower overhead than polling)

### SQLite Optimization
- WAL mode (concurrent reads, single writer)
- `PRAGMA journal_mode=WAL`
- `PRAGMA synchronous=NORMAL` (safe with WAL)
- `PRAGMA cache_size=-64000` (64MB page cache)
- `PRAGMA mmap_size=268435456` (256MB memory-mapped I/O)
- Auto-vacuum on
- Telemetry table partitioned by month, old data archived

## Monitoring

Lightweight monitoring stack (no Prometheus/Grafana — too heavy for 8GB):

- **Health endpoint** at `/api/health` — JSON with all service statuses
- **SQLite telemetry** — built-in usage tracking, no external DB
- **Caddy access logs** — structured JSON, logrotate
- **Docker stats** — `docker stats --format` for resource usage
- **Alerting** — Telegram bot sends alerts on provider down / quota exhaustion

## Related

- [Docker Compose Setup](/architecture/deployment.md)
- [Multi-Tenant](/architecture/multi-tenant.md)
- [Telemetry](/models/model-routing.md)
