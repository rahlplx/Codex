import { describe, it, expect, beforeEach } from 'vitest'
import { AdapterRegistry } from '../../../backend/src/adapters/registry'
import type { ICliAdapter } from '../../../backend/src/types/adapter'
import type { AdapterConfig, ChatCompletionRequest, ChatCompletionResponse, HealthStatus, QuotaStatus, Model } from '../../../backend/src/types/adapter'

function makeAdapter(id: string, tier: ICliAdapter['tier'] = 'free'): ICliAdapter {
  return {
    id,
    name: `Test ${id}`,
    tier,
    supportsStreaming: true,
    supportsToolUse: false,
    async initialize(_cfg: AdapterConfig) {},
    async shutdown() {},
    async healthCheck(): Promise<HealthStatus> {
      return { healthy: true, latencyMs: 50, score: 0.9 }
    },
    async getQuota(): Promise<QuotaStatus> {
      return { unlimited: true, remaining: null, resetAt: null }
    },
    async supportedModels(): Promise<Model[]> { return [] },
    async chatCompletion(_req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      return { id: 'test', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
    },
    async *chatCompletionStream(_req: ChatCompletionRequest) {},
  }
}

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry

  beforeEach(() => {
    registry = new AdapterRegistry()
  })

  it('registers and resolves an adapter by id', () => {
    const adapter = makeAdapter('opencode-zen')
    registry.register(adapter)
    expect(registry.resolve('opencode-zen')).toBe(adapter)
  })

  it('returns undefined for unknown id', () => {
    expect(registry.resolve('nonexistent')).toBeUndefined()
  })

  it('lists all registered adapters', () => {
    registry.register(makeAdapter('a'))
    registry.register(makeAdapter('b'))
    const ids = registry.list().map(a => a.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
    expect(ids).toHaveLength(2)
  })

  it('overwrites an existing adapter when same id registered twice', () => {
    const first = makeAdapter('opencode-zen')
    const second = makeAdapter('opencode-zen')
    registry.register(first)
    registry.register(second)
    expect(registry.resolve('opencode-zen')).toBe(second)
    expect(registry.list()).toHaveLength(1)
  })

  it('unregisters an adapter', () => {
    registry.register(makeAdapter('to-remove'))
    registry.unregister('to-remove')
    expect(registry.resolve('to-remove')).toBeUndefined()
    expect(registry.list()).toHaveLength(0)
  })
})
