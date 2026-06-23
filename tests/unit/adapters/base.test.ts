import { describe, it, expect } from 'vitest'
import { AdapterBase } from '../../../backend/src/adapters/base.js'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk, Tier,
} from '../../../backend/src/types/adapter.js'

class StubAdapter extends AdapterBase {
  readonly id = 'stub'
  readonly name = 'Stub'
  readonly tier: Tier = 'free'
  readonly supportsStreaming = false
  readonly supportsToolUse = false

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, latencyMs: 1, score: 1 }
  }

  async getQuota(): Promise<QuotaStatus> {
    return { unlimited: true, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return []
  }

  async chatCompletion(_req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return { id: 'stub', choices: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
  }

  async *chatCompletionStream(_req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {}

  // expose protected helpers for testing
  getBaseUrl(defaultUrl: string): string {
    return this.baseUrl(defaultUrl)
  }

  getTimeout(): number {
    return this.timeout()
  }
}

describe('AdapterBase', () => {
  it('shutdown() resolves without error', async () => {
    const adapter = new StubAdapter()
    await expect(adapter.shutdown()).resolves.toBeUndefined()
  })

  it('initialize() stores config and resolves', async () => {
    const adapter = new StubAdapter()
    await expect(adapter.initialize({ apiKey: 'test-key' })).resolves.toBeUndefined()
  })

  it('initialize() makes config available to baseUrl()', async () => {
    const adapter = new StubAdapter()
    await adapter.initialize({ baseUrl: 'https://custom.example.com' })
    expect(adapter.getBaseUrl('https://default.example.com')).toBe('https://custom.example.com')
  })

  it('baseUrl() returns default when no config override', () => {
    const adapter = new StubAdapter()
    expect(adapter.getBaseUrl('https://default.example.com')).toBe('https://default.example.com')
  })

  it('timeout() returns default 30000 when no config override', () => {
    const adapter = new StubAdapter()
    expect(adapter.getTimeout()).toBe(30_000)
  })

  it('timeout() returns configured value', async () => {
    const adapter = new StubAdapter()
    await adapter.initialize({ timeout: 5000 })
    expect(adapter.getTimeout()).toBe(5000)
  })
})
