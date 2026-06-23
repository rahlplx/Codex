import { describe, it, expect, beforeEach } from 'vitest'
import { Router, NoAdapterAvailableError } from '../../../backend/src/orchestrator/router'
import { AdapterRegistry } from '../../../backend/src/adapters/registry'
import type { ICliAdapter, HealthStatus, QuotaStatus, Model, AdapterConfig, ChatCompletionRequest, ChatCompletionResponse } from '../../../backend/src/types/adapter'

function makeAdapter(
  id: string,
  opts: { healthy?: boolean; score?: number; quotaExhausted?: boolean; tier?: ICliAdapter['tier'] } = {}
): ICliAdapter {
  const { healthy = true, score = 0.8, quotaExhausted = false, tier = 'free' } = opts
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

  it('returns the single healthy adapter', async () => {
    const adapter = makeAdapter('zen', { score: 0.9 })
    registry.register(adapter)
    const result = await router.route()
    expect(result.id).toBe('zen')
  })

  it('picks the highest-scoring healthy adapter', async () => {
    registry.register(makeAdapter('low', { score: 0.3 }))
    registry.register(makeAdapter('high', { score: 0.95 }))
    registry.register(makeAdapter('mid', { score: 0.6 }))
    const result = await router.route()
    expect(result.id).toBe('high')
  })

  it('skips unhealthy adapters', async () => {
    registry.register(makeAdapter('broken', { healthy: false, score: 1.0 }))
    registry.register(makeAdapter('working', { healthy: true, score: 0.5 }))
    const result = await router.route()
    expect(result.id).toBe('working')
  })

  it('skips quota-exhausted adapters', async () => {
    registry.register(makeAdapter('quota-full', { quotaExhausted: true, score: 0.99 }))
    registry.register(makeAdapter('has-quota', { quotaExhausted: false, score: 0.4 }))
    const result = await router.route()
    expect(result.id).toBe('has-quota')
  })

  it('throws when all adapters are unhealthy or quota-exhausted', async () => {
    registry.register(makeAdapter('broken', { healthy: false }))
    registry.register(makeAdapter('full', { quotaExhausted: true }))
    await expect(router.route()).rejects.toThrow(NoAdapterAvailableError)
  })

  it('treats adapter as unhealthy when healthCheck() throws', async () => {
    const failing: ICliAdapter = {
      ...makeAdapter('hc-fail', { score: 1.0 }),
      async healthCheck() { throw new Error('network down') },
    }
    const working = makeAdapter('hc-ok', { score: 0.5 })
    registry.register(failing)
    registry.register(working)
    const result = await router.route()
    expect(result.id).toBe('hc-ok')
  })

  it('falls back gracefully when getQuota() throws (remaining=null treated as ok)', async () => {
    const failing: ICliAdapter = {
      ...makeAdapter('quota-fail', { score: 1.0 }),
      async getQuota() { throw new Error('quota service unavailable') },
    }
    registry.register(failing)
    // The catch fallback sets remaining: null which passes the quotaOk check,
    // so the adapter is still routable if healthy.
    const result = await router.route()
    expect(result.id).toBe('quota-fail')
  })

  it('throws NoAdapterAvailableError when only adapter has healthCheck that throws', async () => {
    const failing: ICliAdapter = {
      ...makeAdapter('sole-hc-fail'),
      async healthCheck() { throw new Error('boom') },
    }
    registry.register(failing)
    await expect(router.route()).rejects.toThrow(NoAdapterAvailableError)
  })

  it('still routes when getQuota throws on the only adapter (graceful degradation)', async () => {
    const adapter: ICliAdapter = {
      ...makeAdapter('sole-quota-fail'),
      async getQuota() { throw new Error('boom') },
    }
    registry.register(adapter)
    // getQuota catch fallback has remaining: null => quotaOk = true
    const result = await router.route()
    expect(result.id).toBe('sole-quota-fail')
  })
})
