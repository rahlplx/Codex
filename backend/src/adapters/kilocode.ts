import { AdapterBase } from './base.js'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk
} from '../types/adapter.js'

const DEFAULT_BASE_URL = 'https://api.kilocode.ai/v1'

const KNOWN_MODELS: Model[] = [
  {
    id: 'kilo-coder-latest',
    name: 'Kilo Coder (Latest)',
    contextWindow: 128_000,
    supportsStreaming: true,
    supportsToolUse: true,
    supportsReasoning: true,
  },
  {
    id: 'kilo-coder-mini',
    name: 'Kilo Coder Mini',
    contextWindow: 32_768,
    supportsStreaming: true,
    supportsToolUse: false,
    supportsReasoning: false,
  },
]

export class KiloCodeAdapter extends AdapterBase {
  readonly id = 'kilocode'
  readonly name = 'KiloCode'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = true

  private get apiKey(): string | undefined {
    return this.config['apiKey'] as string | undefined
  }

  private get url(): string {
    return this.baseUrl(DEFAULT_BASE_URL)
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const headers: Record<string, string> = {}
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`
      const res = await fetch(`${this.url}/models`, {
        headers,
        signal: AbortSignal.timeout(5000),
      })
      return { healthy: res.ok, latencyMs: Date.now() - start, score: res.ok ? 75 : 0 }
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, score: 0, error: String(err) }
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    return { unlimited: true, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return [...KNOWN_MODELS]
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`

    const result = await this.fetchJson<OpenAICompletionResponse>(
      `${this.url}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: req.model ?? 'kilo-coder-latest',
          messages: req.messages,
          temperature: req.temperature,
          max_tokens: req.maxTokens,
          stream: false,
        }),
      }
    )

    return {
      id: result.id ?? `kilo-${Date.now()}`,
      choices: (result.choices ?? []).map((c, i) => ({
        index: i,
        message: { role: 'assistant', content: c.message?.content ?? '' },
        finishReason: (c.finish_reason as ChatCompletionResponse['choices'][number]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
      },
      model: result.model,
      provider: this.id,
    }
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`

    const res = await fetch(`${this.url}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model ?? 'kilo-coder-latest',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.timeout()),
    })
    if (!res.ok || !res.body) throw new Error(`KiloCode stream error: HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (let line of lines) {
          if (line.endsWith('\r')) line = line.slice(0, -1)
          if (line === 'data: [DONE]') return
          if (!line.startsWith('data: ')) continue
          try { yield JSON.parse(line.slice(6)) as ChatCompletionChunk } catch { /* skip */ }
        }
      }
    } finally {
      try { await reader.cancel() } catch { /* ignore */ }
      reader.releaseLock()
    }
  }
}

interface OpenAICompletionResponse {
  id?: string
  model?: string
  choices?: Array<{
    message?: { role: string; content: string }
    finish_reason?: string
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}
