import { AdapterBase } from './base.js'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk
} from '../types/adapter.js'

interface OpenAIModelList {
  data?: Array<{ id: string; owned_by?: string }>
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

export abstract class SidecarAdapter extends AdapterBase {
  protected abstract readonly defaultBaseUrl: string
  protected abstract readonly fallbackModels: Model[]

  private get apiKey(): string | undefined {
    return this.config['apiKey'] as string | undefined
  }

  protected get url(): string {
    return this.baseUrl(this.defaultBaseUrl)
  }

  protected authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`
    return headers
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.url}/models`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(5000),
      })
      return { healthy: res.ok, latencyMs: Date.now() - start, score: res.ok ? 80 : 0 }
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, score: 0, error: String(err) }
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    return { unlimited: true, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    try {
      const result = await this.fetchJson<OpenAIModelList>(`${this.url}/models`, {
        headers: this.authHeaders(),
      })
      if (result.data && result.data.length > 0) {
        return result.data.map(m => ({
          id: m.id,
          name: m.id,
          contextWindow: 128_000,
          supportsStreaming: true,
          supportsToolUse: false,
          supportsReasoning: false,
        }))
      }
    } catch { /* fall back to static list */ }
    return [...this.fallbackModels]
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const defaultModel = this.fallbackModels[0]?.id ?? 'default'
    const result = await this.fetchJson<OpenAICompletionResponse>(
      `${this.url}/chat/completions`,
      {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          model: req.model ?? defaultModel,
          messages: req.messages,
          temperature: req.temperature,
          max_tokens: req.maxTokens,
          stream: false,
        }),
      }
    )

    return {
      id: result.id ?? `${this.id}-${Date.now()}`,
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
    const defaultModel = this.fallbackModels[0]?.id ?? 'default'
    const res = await fetch(`${this.url}/chat/completions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        model: req.model ?? defaultModel,
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.timeout()),
    })
    if (!res.ok || !res.body) throw new Error(`${this.name} stream error: HTTP ${res.status}`)

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
