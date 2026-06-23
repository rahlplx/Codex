import type { ICliAdapter } from '../types/adapter'
import type { AdapterRegistry } from '../adapters/registry'

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
  constructor(private readonly registry: AdapterRegistry) {}

  async route(): Promise<ICliAdapter> {
    const adapters = this.registry.list()
    if (adapters.length === 0) throw new NoAdapterAvailableError()

    const scored: ScoredAdapter[] = []

    await Promise.all(
      adapters.map(async adapter => {
        const [health, quota] = await Promise.all([
          adapter.healthCheck().catch(() => ({ healthy: false, latencyMs: 0, score: 0 })),
          adapter.getQuota().catch(() => ({ unlimited: false, remaining: 0, resetAt: null })),
        ])

        const quotaOk = quota.unlimited || (quota.remaining !== null && quota.remaining > 0)
        if (health.healthy && quotaOk) {
          scored.push({ adapter, score: health.score })
        }
      })
    )

    if (scored.length === 0) throw new NoAdapterAvailableError()

    scored.sort((a, b) => b.score - a.score)
    return scored[0]!.adapter
  }
}
