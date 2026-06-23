---
type: Index
title: Models Knowledge Base
description: Navigation index for model catalog, routing algorithms, and free model discovery.
tags: [models, index, navigation]
timestamp: 2026-06-23T00:00:00Z
---

# Models Knowledge Base

Reference documentation for AI model discovery, cataloging, and routing.

## Documents

| File | Topic |
|------|-------|
| [free-models.md](free-models.md) | Comprehensive free model catalog by provider and tier |
| [model-routing.md](model-routing.md) | Dynamic registry, health probing, circuit breakers, telemetry-driven routing |

## Key Concepts

- **Dynamic Discovery**: Models change daily/weekly; hourly scanner detects availability
- **Health Probing**: 60-second interval checks with circuit breakers (3 failures → open → 5min recovery)
- **Composite Scoring**: 35% reliability + 25% speed + 20% quality + 15% cost + 5% recency
- **Multi-Tier Fallback**: Tier 1 (direct CLI) → Tier 2 (community routers) → Tier 3 (paid/self-hosted)

## See Also

- [Providers](../providers/index.md) — CLI adapter documentation
- [Routers](../routers/index.md) — Community router integrations
- [Architecture](../architecture/index.md) — System architecture overview
