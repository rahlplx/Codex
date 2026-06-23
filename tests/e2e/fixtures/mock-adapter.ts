import type {
  ICliAdapter,
  AdapterConfig,
  HealthStatus,
  QuotaStatus,
  Model,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '../../../backend/src/types/adapter.js'

export class MockAdapter implements ICliAdapter {
  readonly id = 'mock-sim'
  readonly name = 'Simulation Mock'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false

  private _healthy = true
  private _callCount = 0

  setHealthy(v: boolean): void { this._healthy = v }
  get callCount(): number { return this._callCount }
  resetCallCount(): void { this._callCount = 0 }

  async initialize(_: AdapterConfig): Promise<void> {}
  async shutdown(): Promise<void> {}

  async healthCheck(): Promise<HealthStatus> {
    if (!this._healthy) return { healthy: false, latencyMs: 0, score: 0, error: 'Mock unhealthy' }
    return { healthy: true, latencyMs: 1, score: 0.99 }
  }

  async getQuota(): Promise<QuotaStatus> {
    return { unlimited: true, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return [{
      id: 'mock-model',
      name: 'Mock Model',
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    }]
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this._callCount++
    const lastUser = [...req.messages].reverse().find(m => m.role === 'user')
    const content = `Echo: ${lastUser?.content ?? '(empty)'}`
    return {
      id: `mock-${this._callCount}`,
      choices: [{ index: 0, message: { role: 'assistant', content }, finishReason: 'stop' }],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      model: req.model ?? 'mock-model',
      provider: this.id,
    }
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    this._callCount++
    const lastUser = [...req.messages].reverse().find(m => m.role === 'user')
    const words = `Echo: ${lastUser?.content ?? '(empty)'}`.split(' ')
    for (const word of words) {
      yield {
        id: `mock-stream-${this._callCount}`,
        choices: [{ index: 0, delta: { content: word + ' ' }, finishReason: null }],
      }
    }
    yield {
      id: `mock-stream-${this._callCount}`,
      choices: [{ index: 0, delta: { content: '' }, finishReason: 'stop' }],
    }
  }
}
