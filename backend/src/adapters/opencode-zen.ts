import { AdapterBase } from './base.js'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk,
} from '../types/adapter.js'

const DEFAULT_BASE_URL = 'https://opencode.ai/zen/v1'

// Static catalog — Zen has no public /v1/models endpoint.
// big-pickle uses thinking mode; reasoning_content must round-trip in assistant messages.
const KNOWN_MODELS: Model[] = [
  {
    id: 'big-pickle',
    name: 'Big Pickle',
    contextWindow: 131_072,
    supportsStreaming: true,
    supportsToolUse: false,
    supportsReasoning: true,
  },
  {
    id: 'deepseek-v4-flash-free',
    name: 'DeepSeek V4 Flash (Free)',
    contextWindow: 65_536,
    supportsStreaming: true,
    supportsToolUse: false,
    supportsReasoning: false,
  },
]

export class OpenCodeZenAdapter extends AdapterBase {
  readonly id = 'opencode-zen'
  readonly name = 'OpenCode Zen'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const models = await this.supportedModels()
      const latencyMs = Date.now() - start
      const healthy = models.length > 0
      return {
        healthy,
        latencyMs,
        score: healthy ? Math.max(0, 100 - (latencyMs / 100)) : 0,
      }
    } catch (e) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        score: 0,
        error: e instanceof Error ? e.message : 'health check failed',
      }
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    const apiKey = this.config['apiKey'] as string | undefined
    if (!apiKey) {
      // Free tier: unlimited, no tracking
      return { unlimited: true, remaining: null, resetAt: null }
    }
    // Paid tier: Zen doesn't expose a quota endpoint yet, report as unknown
    return { unlimited: false, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return [...KNOWN_MODELS]
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl(DEFAULT_BASE_URL)}/chat/completions`
    const raw = await this.fetchJson<ZenChatResponse>(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(req, false)),
    })
    return this.parseCompletion(raw)
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const url = `${this.baseUrl(DEFAULT_BASE_URL)}/chat/completions`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout())

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(req, true)),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      if (!res.body) throw new Error('Empty response body from Zen stream')
      yield* this.readSSE(res.body)
    } finally {
      clearTimeout(timer)
    }
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const apiKey = this.config['apiKey'] as string | undefined
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    return headers
  }

  private buildBody(req: ChatCompletionRequest, stream: boolean): Record<string, unknown> {
    const messages = req.messages.map(m => {
      const out: Record<string, unknown> = { role: m.role, content: m.content }
      // Pass reasoning_content back for thinking-mode continuations
      const ext = m as { reasoning_content?: unknown }
      if (typeof ext.reasoning_content === 'string' && ext.reasoning_content) {
        out['reasoning_content'] = ext.reasoning_content
      }
      return out
    })

    const body: Record<string, unknown> = {
      model: req.model ?? 'big-pickle',
      messages,
      stream,
    }
    if (req.temperature !== undefined) body['temperature'] = req.temperature
    if (req.maxTokens !== undefined) body['max_tokens'] = req.maxTokens
    return body
  }

  private parseCompletion(raw: ZenChatResponse): ChatCompletionResponse {
    return {
      id: raw.id ?? `zen-${Date.now()}`,
      choices: (raw.choices ?? []).map((c, i) => ({
        index: i,
        message: { role: 'assistant', content: c.message?.content ?? '' },
        finishReason: (c.finish_reason as ChatCompletionResponse['choices'][number]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: raw.usage?.prompt_tokens ?? 0,
        completionTokens: raw.usage?.completion_tokens ?? 0,
        totalTokens: raw.usage?.total_tokens ?? 0,
      },
      model: raw.model,
      provider: this.id,
    }
  }

  private async *readSSE(body: ReadableStream<Uint8Array>): AsyncIterable<ChatCompletionChunk> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') return

          try {
            const chunk = JSON.parse(payload) as ZenStreamChunk
            yield {
              id: chunk.id ?? `zen-${Date.now()}`,
              choices: (chunk.choices ?? []).map((c, i) => ({
                index: i,
                delta: { role: 'assistant', content: c.delta?.content ?? '' },
                finishReason: c.finish_reason ?? null,
              })),
            }
          } catch {
            // skip malformed lines — SSE streams occasionally include comments or empty data
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

// ── wire types (not exported — internal to this adapter) ─────────────────────

interface ZenChatResponse {
  id?: string
  model?: string
  choices?: Array<{
    message?: { role: string; content: string; reasoning_content?: string }
    finish_reason?: string
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

interface ZenStreamChunk {
  id?: string
  choices?: Array<{
    delta?: { content?: string; reasoning_content?: string }
    finish_reason?: string | null
  }>
}
