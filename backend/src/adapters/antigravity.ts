import { AdapterBase } from './base.js'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk
} from '../types/adapter.js'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const KNOWN_MODELS: Model[] = [
  {
    id: 'gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    contextWindow: 1_048_576,
    supportsStreaming: true,
    supportsToolUse: true,
    supportsReasoning: true,
  },
  {
    id: 'gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro Preview',
    contextWindow: 1_048_576,
    supportsStreaming: true,
    supportsToolUse: true,
    supportsReasoning: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1_048_576,
    supportsStreaming: true,
    supportsToolUse: true,
    supportsReasoning: false,
  },
]

export class AntigravityAdapter extends AdapterBase {
  readonly id = 'antigravity'
  readonly name = 'Antigravity (Google Gemini)'
  readonly tier = 'freemium' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false

  private get apiKey(): string | undefined {
    return this.config['apiKey'] as string | undefined
  }

  private get url(): string {
    return this.baseUrl(DEFAULT_BASE_URL)
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    if (!this.apiKey) {
      return { healthy: false, latencyMs: 0, score: 0, error: 'No API key configured' }
    }
    try {
      const res = await fetch(`${this.url}/models?key=${this.apiKey}`, {
        signal: AbortSignal.timeout(5000),
      })
      return { healthy: res.ok, latencyMs: Date.now() - start, score: res.ok ? 90 : 0 }
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, score: 0, error: String(err) }
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    if (!this.apiKey) return { unlimited: false, remaining: 0, resetAt: null }
    return { unlimited: false, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return [...KNOWN_MODELS]
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) throw new Error('API key is not configured for AntigravityAdapter')
    const model = req.model ?? 'gemini-2.5-flash-preview'
    const body = this.buildGeminiBody(req)
    const result = await this.fetchJson<GeminiResponse>(
      `${this.url}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    return this.parseResponse(result, model)
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    if (!this.apiKey) throw new Error('API key is not configured for AntigravityAdapter')
    const model = req.model ?? 'gemini-2.5-flash-preview'
    const body = this.buildGeminiBody(req)
    const res = await fetch(
      `${this.url}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout()),
      }
    )
    if (!res.ok || !res.body) throw new Error(`Gemini stream error: HTTP ${res.status}`)

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
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') return
          try {
            const chunk = JSON.parse(payload) as GeminiResponse
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
            yield {
              id: `ag-${Date.now()}`,
              choices: [{
                index: 0,
                delta: { role: 'assistant', content: text },
                finishReason: chunk.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : null,
              }],
            }
          } catch { /* skip malformed */ }
        }
      }
    } finally {
      try { await reader.cancel() } catch { /* ignore */ }
      reader.releaseLock()
    }
  }

  private buildGeminiBody(req: ChatCompletionRequest): Record<string, unknown> {
    const contents = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const systemInstruction = req.messages.find(m => m.role === 'system')

    const body: Record<string, unknown> = { contents }
    if (systemInstruction) {
      body['systemInstruction'] = { parts: [{ text: systemInstruction.content }] }
    }
    if (req.temperature !== undefined) {
      body['generationConfig'] = { temperature: req.temperature }
    }
    if (req.maxTokens !== undefined) {
      const gc = (body['generationConfig'] as Record<string, unknown>) ?? {}
      gc['maxOutputTokens'] = req.maxTokens
      body['generationConfig'] = gc
    }
    return body
  }

  private parseResponse(raw: GeminiResponse, model: string): ChatCompletionResponse {
    const candidate = raw.candidates?.[0]
    const text = candidate?.content?.parts?.[0]?.text ?? ''
    return {
      id: `ag-${Date.now()}`,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finishReason: candidate?.finishReason === 'STOP' ? 'stop' : null,
      }],
      usage: {
        promptTokens: raw.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: raw.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: raw.usageMetadata?.totalTokenCount ?? 0,
      },
      model,
      provider: this.id,
    }
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}
