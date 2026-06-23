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

  protected maxRetries(): number {
    return (this.config['maxRetries'] as number | undefined) ?? 2
  }

  protected async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const retries = this.maxRetries()
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout())
      try {
        const res = await fetch(url, { ...init, signal: controller.signal })
        if (!res.ok) {
          const err = new Error(`HTTP ${res.status}: ${res.statusText}`)
          if (res.status === 429 || res.status >= 500) {
            lastError = err
            clearTimeout(timer)
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 2 ** attempt * 1000))
              continue
            }
          }
          throw err
        }
        return await res.json() as T
      } catch (e) {
        clearTimeout(timer)
        lastError = e instanceof Error ? e : new Error(String(e))
        if (attempt < retries && !controller.signal.aborted) {
          await new Promise(r => setTimeout(r, 2 ** attempt * 1000))
          continue
        }
        throw lastError
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError ?? new Error('fetchJson failed')
  }
}
