import { AdapterBase } from './base.js'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk
} from '../types/adapter.js'

const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
  'google/gemini-2.5-flash-preview:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
]

export class OpenRouterFreeAdapter extends AdapterBase {
  readonly id = 'openrouter-free'
  readonly name = 'OpenRouter Free'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false

  private readonly baseApiUrl = 'https://openrouter.ai/api/v1'

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseApiUrl}/models`, { signal: AbortSignal.timeout(5000) })
      return { healthy: res.ok, latencyMs: Date.now() - start, score: res.ok ? 70 : 0 }
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, score: 0, error: String(err) }
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    return { unlimited: false, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return FREE_MODELS.map(id => ({
      id,
      name: id.split('/').pop()?.replace(':free', '') ?? id,
      contextWindow: 131072,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: id.includes('deepseek') || id.includes('gemini'),
    }))
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const apiKey = this.config['apiKey'] as string | undefined
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const raw = await this.fetchJson<Record<string, unknown>>(`${this.baseApiUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model || FREE_MODELS[0],
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: false,
      }),
    })

    const choices = Array.isArray(raw?.['choices']) ? raw['choices'] as Array<Record<string, unknown>> : []
    const usage = (raw?.['usage'] ?? {}) as Record<string, unknown>

    return {
      id: (raw?.['id'] as string) ?? `${this.id}-${Date.now()}`,
      choices: choices.map((c, i) => ({
        index: i,
        message: { role: 'assistant' as const, content: ((c['message'] as Record<string, unknown>)?.['content'] as string) ?? '' },
        finishReason: (c['finish_reason'] as ChatCompletionResponse['choices'][number]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: (usage['prompt_tokens'] as number) ?? 0,
        completionTokens: (usage['completion_tokens'] as number) ?? 0,
        totalTokens: (usage['total_tokens'] as number) ?? 0,
      },
      model: raw?.['model'] as string | undefined,
      provider: this.id,
    }
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const apiKey = this.config['apiKey'] as string | undefined
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const res = await fetch(`${this.baseApiUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model || FREE_MODELS[0],
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.timeout()),
    })
    if (!res.ok || !res.body) throw new Error(`OpenRouter stream error: HTTP ${res.status}`)

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
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try { yield JSON.parse(line.slice(6)) as ChatCompletionChunk } catch {}
        }
      }
    } finally {
      try { await reader.cancel() } catch {}
      reader.releaseLock()
    }
  }
}
