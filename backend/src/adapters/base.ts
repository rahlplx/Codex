import type {
  ICliAdapter, AdapterConfig, HealthStatus, QuotaStatus,
  Model, ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk, Tier
} from '../types/adapter.js'

export abstract class AdapterBase implements ICliAdapter {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly tier: Tier
  abstract readonly supportsStreaming: boolean
  abstract readonly supportsToolUse: boolean

  protected config: AdapterConfig = {}

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config
  }

  async shutdown(): Promise<void> {}

  abstract healthCheck(): Promise<HealthStatus>
  abstract getQuota(): Promise<QuotaStatus>
  abstract supportedModels(): Promise<Model[]>
  abstract chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>
  abstract chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>

  protected baseUrl(defaultUrl: string): string {
    return (this.config['baseUrl'] as string | undefined) ?? defaultUrl
  }

  protected timeout(): number {
    return (this.config['timeout'] as number | undefined) ?? 30_000
  }

  protected async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout())
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return await res.json() as T
    } finally {
      clearTimeout(timer)
    }
  }
}
