import { describe, it, expect, beforeEach } from 'vitest'
import { Router, NoAdapterAvailableError } from '../../../backend/src/orchestrator/router'
import { AdapterRegistry } from '../../../backend/src/adapters/registry'
import type { ICliAdapter, HealthStatus, QuotaStatus, Model, AdapterConfig, ChatCompletionRequest, ChatCompletionResponse } from '../../../backend/src/types/adapter'

function makeAdapter(
  id: string,
  opts: { healthy?: boolean; score?: number; quotaExhausted?: boolean; tier?: ICliAdapter['tier'] } = {}
): ICliAdapter {
  const { healthy = true, score = 80, quotaExhausted = false, tier = 'free' } = opts
  return {
    id,
    name: `Mock ${id}`,
    tier,
    supportsStreaming: true,
    supportsToolUse: false,
    async initialize(_cfg: AdapterConfig) {},
    async shutdown() {},
    async healthCheck(): Promise<HealthStatus> {
      return { healthy, latencyMs: 100, score: healthy ? score : 0 }
    },
    async getQuota(): Promise<QuotaStatus> {
      return quotaExhausted
        ? { unlimited: false, remaining: 0, resetAt: new Date() }
        : { unlimited: true, remaining: null, resetAt: null }
    },
    async supportedModels(): Promise<Model[]> { return [] },
    async chatCompletion(_req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      return { id: 'mock', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
    },
    async *chatCompletionStream(_req: ChatCompletionRequest) {},
  }
}

describe('Router', () => {
  let registry: AdapterRegistry
  let router: Router

  beforeEach(() => {
    registry = new AdapterRegistry()
    router = new Router(registry)
  })

  it('throws NoAdapterAvailableError when registry is empty', async () => {
    await expect(router.route()).rejects.toThrow(NoAdapterAvailableError)
  })

  it('returns the single healthy adapter in array', async () => {
    const adapter = makeAdapter('zen', { score: 90 })
    registry.register(adapter)
    const result = await router.route()
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('zen')
  })

  it('returns adapters ranked by score (highest first)', async () => {
    registry.register(makeAdapter('low', { score: 30 }))
    registry.register(makeAdapter('high', { score: 95 }))
    registry.register(makeAdapter('mid', { score: 60 }))
    const result = await router.route()
    expect(result.map(a => a.id)).toEqual(['high', 'mid', 'low'])
  })

  it('skips unhealthy adapters', async () => {
    registry.register(makeAdapter('broken', { healthy: false, score: 100 }))
    registry.register(makeAdapter('working', { healthy: true, score: 50 }))
    const result = await router.route()
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('working')
  })

  it('skips quota-exhausted adapters', async () => {
    registry.register(makeAdapter('quota-full', { quotaExhausted: true, score: 99 }))
    registry.register(makeAdapter('has-quota', { quotaExhausted: false, score: 40 }))
    const result = await router.route()
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('has-quota')
  })

  it('throws when all adapters are unhealthy or quota-exhausted', async () => {
    registry.register(makeAdapter('broken', { healthy: false }))
    registry.register(makeAdapter('full', { quotaExhausted: true }))
    await expect(router.route()).rejects.toThrow(NoAdapterAvailableError)
  })
})

describe('Router — circuit breaker', () => {
  let registry: AdapterRegistry
  let router: Router

  beforeEach(() => {
    registry = new AdapterRegistry()
    router = new Router(registry)
  })

  it('skips adapter after 3 consecutive failures', async () => {
    registry.register(makeAdapter('flaky', { score: 99 }))
    registry.register(makeAdapter('stable', { score: 50 }))

    router.recordFailure('flaky')
    router.recordFailure('flaky')
    router.recordFailure('flaky')

    const result = await router.route()
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('stable')
  })

  it('resets circuit on success', async () => {
    registry.register(makeAdapter('recovered', { score: 90 }))

    router.recordFailure('recovered')
    router.recordFailure('recovered')
    router.recordFailure('recovered')
    router.recordSuccess('recovered')

    const result = await router.route()
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('recovered')
  })

  it('does not skip adapter with fewer than 3 failures', async () => {
    registry.register(makeAdapter('shaky', { score: 80 }))

    router.recordFailure('shaky')
    router.recordFailure('shaky')

    const result = await router.route()
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('shaky')
  })
})

describe('Router — caching', () => {
  let registry: AdapterRegistry
  let router: Router

  it('caches health/quota results across calls', async () => {
    let healthCallCount = 0
    const adapter = makeAdapter('cached', { score: 70 })
    const origHealth = adapter.healthCheck.bind(adapter)
    adapter.healthCheck = async () => {
      healthCallCount++
      return origHealth()
    }

    registry = new AdapterRegistry()
    registry.register(adapter)
    router = new Router(registry)

    await router.route()
    await router.route()
    await router.route()

    expect(healthCallCount).toBe(1)
  })
})
