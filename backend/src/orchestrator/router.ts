import type { ICliAdapter, HealthStatus, QuotaStatus } from '../types/adapter.js'
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

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface CircuitState {
  failures: number
  openUntil: number
}

const CACHE_TTL_MS = 30_000
const CIRCUIT_FAILURE_THRESHOLD = 3
const CIRCUIT_COOLDOWN_MS = 60_000

export class Router {
  private readonly healthCache = new Map<string, CacheEntry<HealthStatus>>()
  private readonly quotaCache = new Map<string, CacheEntry<QuotaStatus>>()
  private readonly circuits = new Map<string, CircuitState>()

  constructor(private readonly registry: AdapterRegistry) {}

  async route(): Promise<ICliAdapter[]> {
    const adapters = this.registry.list()
    if (adapters.length === 0) throw new NoAdapterAvailableError()

    const now = Date.now()
    const scored: ScoredAdapter[] = []

    await Promise.all(
      adapters.map(async adapter => {
        const circuit = this.circuits.get(adapter.id)
        if (circuit && circuit.failures >= CIRCUIT_FAILURE_THRESHOLD && now < circuit.openUntil) {
          return
        }

        const [health, quota] = await Promise.all([
          this.getCachedHealth(adapter, now),
          this.getCachedQuota(adapter, now),
        ])

        const quotaOk = quota.unlimited || quota.remaining === null || quota.remaining > 0
        if (health.healthy && quotaOk) {
          scored.push({ adapter, score: health.score })
        }
      })
    )

    if (scored.length === 0) throw new NoAdapterAvailableError()

    scored.sort((a, b) => b.score - a.score)
    return scored.map(s => s.adapter)
  }

  recordFailure(adapterId: string): void {
    const now = Date.now()
    const state = this.circuits.get(adapterId) ?? { failures: 0, openUntil: 0 }
    state.failures++
    if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      state.openUntil = now + CIRCUIT_COOLDOWN_MS
    }
    this.circuits.set(adapterId, state)
  }

  recordSuccess(adapterId: string): void {
    this.circuits.delete(adapterId)
  }

  private async getCachedHealth(adapter: ICliAdapter, now: number): Promise<HealthStatus> {
    const cached = this.healthCache.get(adapter.id)
    if (cached && now < cached.expiresAt) return cached.value

    const value = await adapter.healthCheck().catch((): HealthStatus => ({
      healthy: false, latencyMs: 0, score: 0,
    }))
    this.healthCache.set(adapter.id, { value, expiresAt: now + CACHE_TTL_MS })
    return value
  }

  private async getCachedQuota(adapter: ICliAdapter, now: number): Promise<QuotaStatus> {
    const cached = this.quotaCache.get(adapter.id)
    if (cached && now < cached.expiresAt) return cached.value

    const value = await adapter.getQuota().catch((): QuotaStatus => ({
      unlimited: false, remaining: null, resetAt: null,
    }))
    this.quotaCache.set(adapter.id, { value, expiresAt: now + CACHE_TTL_MS })
    return value
  }
}
