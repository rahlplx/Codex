import type { ICliAdapter } from '../types/adapter.js'
import type { AdapterRegistry } from '../adapters/registry.js'
import type { DomainScoreRepository } from '../storage/domainScores.js'
import type { Domain } from './domain.js'
import { getRoutingPrefs } from './routingPrefs.js'

export class NoAdapterAvailableError extends Error {
  constructor() {
    super('No healthy adapter with quota available')
    this.name = 'NoAdapterAvailableError'
  }
}

interface ScoredAdapter {
  adapter: ICliAdapter
  score: number
}

export class Router {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly domainScores?: DomainScoreRepository,
  ) {}

  async route(domain?: Domain): Promise<ICliAdapter> {
    const prefs = getRoutingPrefs()
    const adapters = this.registry.list().filter(a => !prefs.disabledAdapters.has(a.id))
    if (adapters.length === 0) throw new NoAdapterAvailableError()

    const scored: ScoredAdapter[] = []

    await Promise.all(
      adapters.map(async adapter => {
        const [health, quota] = await Promise.all([
          adapter.healthCheck().catch(() => ({ healthy: false, latencyMs: 0, score: 0 })),
          adapter.getQuota().catch(() => ({ unlimited: false, remaining: null, resetAt: null })),
        ])

        const quotaOk = quota.unlimited || quota.remaining === null || quota.remaining > 0
        if (health.healthy && quotaOk) {
          scored.push({ adapter, score: health.score })
        }
      })
    )

    if (scored.length === 0) throw new NoAdapterAvailableError()

    if (prefs.autoRouting && domain && domain !== 'general' && this.domainScores) {
      const domainScored = scored.map(({ adapter, score }) => {
        const ds = this.domainScores!.getForAdapter(adapter.id, domain)
        const domainMultiplier = ds
          ? ds.successRate * (1000 / Math.max(ds.avgLatencyMs, 1))
          : 1
        return { adapter, score: score * domainMultiplier }
      })
      domainScored.sort((a, b) => b.score - a.score)
      return domainScored[0]!.adapter
    }

    scored.sort((a, b) => b.score - a.score)
    return scored[0]!.adapter
  }
}
