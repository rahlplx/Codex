import type { ICliAdapter } from '../types/adapter.js'
import type { AdapterRegistry } from '../adapters/registry.js'

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
  private cachedAdapter: ICliAdapter | null = null
  private cacheTimestamp = 0
  private readonly cacheTtlMs: number

  constructor(private readonly registry: AdapterRegistry, cacheTtlMs = 5000) {
    this.cacheTtlMs = cacheTtlMs
  }

  async route(): Promise<ICliAdapter> {
    const now = Date.now()
    if (this.cachedAdapter && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cachedAdapter
    }

    const adapters = this.registry.list()
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

    scored.sort((a, b) => b.score - a.score)
    this.cachedAdapter = scored[0]!.adapter
    this.cacheTimestamp = Date.now()
    return this.cachedAdapter
  }
}
